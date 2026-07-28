# ImmoFuchs Pro — Kommerzialisierungs-Spec
**Stand: 2026-07-26 (v3 — erweitert um echte native App für Google Play + Apple App Store, Sprint-/Meilenstein-Roadmap) · Status: Entscheidungs-Dokument, noch nicht freigegeben zur Umsetzung**

**Ressourcen-Abgleich für v3:** Konsultiert per `agent-skill-orchestrator`-Ansatz — Discovery ergab, dass die vorhandenen Rollen-Skills (nicht MCPs/Plugins) die passenden Ressourcen für dieses Vorhaben sind, da es sich um Konzept-/Planungsarbeit auf Basis des bestehenden Repos handelt, nicht um externe Integrationen. Eingebunden: `software-architect` (native-App-Architekturentscheidung), `devops-engineer` (Build-/Release-Pipeline, Stack-Prinzipien auf die reale Cloudflare/GitHub-Actions-Umgebung statt des Skill-Default-AWS/Docker/Terraform-Stacks gemappt), `qa-engineer` (Teststrategie native Ebene), `product-owner` (MoSCoW-Priorisierung), `scrum-master` (Sprint-/Meilenstein-Plan). Direkt zur finalen Spec übergegangen statt eines separaten Freigabe-Zwischenschritts — Kontext und Entscheidungsbereitschaft waren aus dem bisherigen Gesprächsverlauf bereits eindeutig.

Grundlage: `docs/plans/expose-screenshot-upload-vorschlag-2026-07-26.md` (Free/Pro-Aufteilung). Abgestimmt mit Full-Stack-Dev-Perspektive (angepasst an die reale Stack-Realität, nicht das generische Next.js/Prisma-Schema) und UX-Designer-Perspektive. Keine Bestandsnutzer vorhanden — Greenfield-Design, keine Migration nötig.

**Änderung gegenüber v1:** Die Zahlungsentscheidung wurde revidiert (Stripe Managed Payments → Paddle), Begründung siehe Abschnitt 6.1. Neu hinzugekommen: vollständiger Bestell-/Rechnungs-/Kündigungs-Lebenszyklus, Konto-Verwaltung, Sicherheits-Ergänzungen, E-Mail-Übersicht.

---

## 0. Entscheidungs-Übersicht

| Thema | Entscheidung |
|---|---|
| Wer braucht ein Konto? | **Nur Pro-Nutzer.** Free bleibt komplett loginfrei, wie heute. |
| Login-Optionen | Google, Apple, E-Mail — **alle drei passwortlos** (OAuth bzw. Magic Link) |
| Datenhaltung Konten | **Cloudflare D1** (neu, ergänzt den bestehenden Worker) |
| Zahlungsabwicklung | **Paddle** (Merchant of Record) — *revidiert, war Stripe Managed Payments, siehe 6.1* |
| Zahlungsmethoden | Kreditkarte, **PayPal**, SEPA-Lastschrift, Apple Pay, Google Pay |
| Preismodell | 9,99 €/Monat oder 79 €/Jahr, keine Testphase als Abo |
| Rechnungsstellung | Übernimmt Paddle als Verkäufer (Merchant of Record) automatisch — kein Eigenbau |
| Kündigung | Eigener Button/Endpunkt in der App (nicht nur Portal-Link) — §312k-BGB-konform |
| Rückerstattung | Freiwillige 14-Tage-Geld-zurück-Garantie (Kulanz, kein gesetzlicher Anspruch) |
| Conversion-Hebel | 1 kostenloser Exposé-Scan pro Gerät (anonym), danach Pro-Pflicht |
| Rechteprüfung | Ausschließlich serverseitig im Worker, nie nur im Client |
| Session | HttpOnly-Cookie, opakes Token, 90 Tage gleitend, mit "alle Geräte abmelden" |
| Native-App-Technologie | **Capacitor** (Ionic) — wraps den bestehenden React/Vite-Build, kein Parallel-Codebase |
| Zahlungsweg in der nativen App | Identisch zum Web (Paddle) — keine separate StoreKit-/Play-Billing-Integration |
| Natives Widget | MVP-Scope: nur Zinssatz-Anzeige (löst die offene Apple-Bedingung aus dem App-Store-Konzept) |
| Programmlänge (Schätzung) | 9 Sprints × 2 Wochen ≈ 18 Wochen, siehe Abschnitt 24 |

---

## 1. Prinzip

Free bleibt exakt das, was ImmoFuchs heute ist: 4 Rechner, Basis-Finn, keine Registrierung nötig. Ein Konto existiert ausschließlich als Träger für den Pro-Status. Das ist die einzige Möglichkeit, das Kernversprechen "kein Login" für die große Mehrheit der Nutzer (Free) wörtlich wahr zu lassen, während ein Bezahl-Layer trotzdem technisch durchsetzbar ist.

---

## 2. Datenmodell (Cloudflare D1)

D1 ist die naheliegende Wahl, weil der Worker bereits im Cloudflare-Ökosystem lebt (Durable Objects für Rate-Limits) — kein neuer Infrastruktur-Anbieter, ein Dashboard, ein Deployment-Weg.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,        -- uuid
  email         TEXT UNIQUE NOT NULL,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE oauth_identities (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  provider          TEXT NOT NULL,        -- 'google' | 'apple'
  provider_user_id  TEXT NOT NULL,
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE magic_links (
  token       TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,           -- 15 Minuten
  used_at     INTEGER
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,           -- opakes Token, im Cookie
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,           -- 90 Tage, gleitend
  user_agent  TEXT,                       -- fuer "Geraete verwalten"-Anzeige
  last_seen_at INTEGER
);

CREATE TABLE subscriptions (
  user_id                TEXT PRIMARY KEY REFERENCES users(id),
  status                 TEXT NOT NULL,   -- 'active' | 'past_due' | 'cancel_scheduled' | 'canceled'
  plan                   TEXT NOT NULL,   -- 'monthly' | 'yearly'
  paddle_customer_id     TEXT NOT NULL,
  paddle_subscription_id TEXT NOT NULL,
  current_period_end     INTEGER NOT NULL,
  cancel_at_period_end   INTEGER NOT NULL DEFAULT 0,
  first_purchase_at      INTEGER NOT NULL, -- fuer die 14-Tage-Geld-zurueck-Frist (Abschnitt 9)
  updated_at             INTEGER NOT NULL
);

-- Webhook-Idempotenz (Abschnitt 10.2) - Paddle liefert Events "at least once"
CREATE TABLE processed_webhook_events (
  event_id     TEXT PRIMARY KEY,
  processed_at INTEGER NOT NULL
);

-- Anonymer Zaehler fuer den "1 kostenloser Exposé-Scan"-Hook, device-lokal,
-- kein Bezug zu einem Konto.
CREATE TABLE expose_trial_used (
  session_id  TEXT PRIMARY KEY,
  used_at     INTEGER NOT NULL
);
```

Bewusst **kein** Passwort-Feld — alle drei Login-Wege sind passwortlos, das eliminiert Passwort-Hashing, Reset-Flows und Leak-Risiko komplett.

---

## 3. UX: Einstiegspunkt & Login-Maske

### 3.1 Einstiegspunkt

Neuer Button in `Statusleiste.jsx` (Kopfbereich, neben `LangSel.jsx`) — Label "Pro" mit dezentem Krönchen-Icon, Fuchs-Orange. Zusätzlich kontextuell: Free-Nutzer, die den kostenlosen Exposé-Scan aufgebraucht oder das Merkliste-Limit (3 Objekte) erreicht haben, landen in derselben Maske.

### 3.2 Login-Maske

Vollflächiges Modal (nicht Bottom-Sheet wie Finn — Login ist selten und wichtig genug für volle Aufmerksamkeit), Card-Layout mit bestehenden Tokens (Radius 12px, `--bg`/`--cc`, DM Sans):

```
┌─────────────────────────────┐
│  🦊  ImmoFuchs Pro       ✕   │
├─────────────────────────────┤
│  Mit Konto anmelden, um      │
│  Pro-Funktionen freizuschalten│
│                               │
│  ┌─────────────────────────┐ │
│  │ G  Mit Google anmelden  │ │  Google-Branding-Vorgabe
│  └─────────────────────────┘ │
│  ┌─────────────────────────┐ │
│  │   Mit Apple anmelden    │ │  Apple-Branding-Vorgabe
│  └─────────────────────────┘ │
│  ──────── oder ────────      │
│  ┌─────────────────────┬───┐ │
│  │ E-Mail-Adresse       │ → │ │  ImmoFuchs-Style, 42px, 16px Font
│  └─────────────────────┴───┘ │
│                               │
│  Kein Passwort nötig — wir    │
│  senden dir einen Login-Link. │
└─────────────────────────────┘
```

Google-/Apple-Button folgen den jeweiligen offiziellen Branding-Vorgaben (Farbe, Logo, Wortlaut) — Bedingung der OAuth-Nutzungsrichtlinien, keine Stil-Frage. Nur E-Mail-Weg und Rahmenwerk folgen ImmoFuchs-Design.

### 3.3 Zustände

- **Default:** wie oben
- **E-Mail gesendet:** "🦊 Check dein Postfach — Link an du@beispiel.de gesendet" + "Andere Adresse verwenden"
- **Loading:** Spinner je Button, andere deaktiviert
- **Fehler (OAuth abgebrochen):** Inline-Fehlertext unter dem Button, kein Full-Screen-Error
- **Fehler (Magic Link abgelaufen/benutzt):** eigene Landing-Seite: "Link abgelaufen — neuen anfordern"
- **Bereits eingeloggt:** Maske überspringt direkt zu 3.4
- **Sicherheits-Detail:** Bei der E-Mail-Eingabe erscheint **immer** dieselbe Erfolgsmeldung, unabhängig davon, ob zu dieser Adresse schon ein Konto existiert oder nicht (Schutz gegen Account-Enumeration — sonst könnte man durch Ausprobieren herausfinden, welche E-Mails ein Pro-Konto haben).

Accessibility: `role="dialog"` + `aria-modal="true"`, Fokus-Trap, Escape schließt, alle Buttons per Tastatur erreichbar.

### 3.4 Nach Login → Plan-Auswahl

```
┌─────────────────────────────┐
│  Wähle deinen Plan            │
│  ○ Monatlich      9,99 €/Mon │
│  ● Jährlich       79 €/Jahr   │  "spare 34%"-Badge
│  [Weiter zur Zahlung →]       │
└─────────────────────────────┘
```
→ Weiterleitung zum gehosteten Paddle-Checkout (Abschnitt 6).

---

## 4. Registrierungsprozess

**Google/Apple:**
1. Tap → OAuth-Redirect zum Provider → Bestätigung dort
2. Rückkehr zum Worker-Callback mit Autorisierungscode
3. Worker tauscht Code gegen E-Mail + Provider-User-ID
4. Existiert `oauth_identities`-Eintrag? → Login. Sonst neuer `users`- + `oauth_identities`-Eintrag — das **ist** die Registrierung, kein separater Schritt.
5. Session-Cookie gesetzt → Plan-Auswahl (3.4)

**E-Mail:**
1. Eingabe → Worker erzeugt Zufalls-Token in `magic_links` (15 Min. gültig), Versand über Resend oder Cloudflare Email Workers
2. Klick auf Link → Worker prüft Token, markiert `used_at`
3. Existiert `users`-Eintrag? → Login. Sonst neuer Eintrag → Session → Plan-Auswahl
4. Rate-Limit auf Versand-Endpunkt (z. B. 5/Std./E-Mail), analog `SessionRateLimiter`-Muster

**Kein** separates "Konto ohne Bezahlung erstellen" — ein Konto entsteht ausschließlich auf dem Weg zur Bezahlung.

### 4.1 Konten-Verknüpfung (Edge Case)

Meldet sich dieselbe Person zuerst per Google, später per Apple mit derselben **verifizierten** E-Mail an, werden die Konten automatisch über die E-Mail-Adresse verknüpft (ein `users`-Eintrag, zwei `oauth_identities`-Zeilen). **Bekannte Einschränkung:** Apples "E-Mail verbergen"-Relay liefert eine andere Adresse als die echte Google-Mail — dann entstehen zwei getrennte Konten. Für den Start akzeptiert (seltener Fall, kein Zahlungsverlust, da jedes Konto separat zahlt), keine manuelle Merge-Funktion in v1.

---

## 5. Auth-Technik im Detail

- **Google:** Google Identity Services (OAuth 2.0/OIDC), `redirect_uri` zeigt auf `/api/auth/google/callback`. Kostenlos.
- **Apple:** "Sign in with Apple" JS-Flow, erfordert Apple-Developer-Programm (99 $/Jahr — fällt ohnehin für die App-Store-Präsenz an, siehe `docs/app-store-konzept-2026-07-23.md`). Apple verlangt zwingend "Mit Apple anmelden", sobald ein Drittanbieter-Login (Google) angeboten wird und die App im App Store landet.
- **E-Mail:** reiner Magic-Link, kein OTP-Code (reibungsärmer auf Mobile).
- **Session:** Opakes Token in `sessions`, Cookie `HttpOnly; Secure; SameSite=Lax`, 90 Tage, gleitend verlängert bei `/api/me`-Aufruf.
- **CSRF:** State-changing Endpunkte prüfen `Origin`-Header, analog zum bestehenden CORS-Muster in `index.ts`.

---

## 6. Zahlungsabwicklung

### 6.1 Entscheidung: Paddle statt Stripe Managed Payments (revidiert)

v1 dieser Spec hatte Stripe Managed Payments vorgeschlagen. Bei der Prüfung der harten Anforderung "PayPal muss drin sein" zeigt sich: Paddle listet PayPal als Merchant-of-Record-Zahlungsmethode explizit und gut dokumentiert; für Stripes noch junges Managed-Payments-Produkt (Beta seit April 2025) ist der PayPal-Support innerhalb des MoR-Produkts nicht zuverlässig dokumentiert. Da PayPal in Deutschland die meistgenutzte Online-Zahlungsmethode ist, ist das kein Nebenaspekt, sondern entscheidungsrelevant. **Entscheidung: Paddle.**

Zusätzliche Paddle-Vorteile für diesen Fall: Merchant of Record wie ursprünglich geplant (übernimmt VAT/USt.-Pflicht komplett), eigenes Checkout, eigener Customer-Portal-Ersatz, Rechnungsstellung inklusive.

Sollte sich bei der technischen Umsetzung zeigen, dass Paddles Freigabeprüfung (jeder Verkäufer wird vor Live-Schaltung geprüft) zu lange dauert oder scheitert: Stripe Managed Payments bleibt die Ausweich-Option, dann aber PayPal ggf. separat über einen zweiten, klassischen Stripe-PayPal-Payment-Method-Baustein nachrüsten.

### 6.2 Zahlungsmethoden

| Methode | Warum |
|---|---|
| Kreditkarte | Standard, von Paddle immer angeboten |
| **PayPal** | In Deutschland die meistgenutzte Online-Zahlungsmethode — Pflicht laut Vorgabe |
| SEPA-Lastschrift | In DACH für Abos sehr verbreitet, geringere Abbruchrate als Kreditkarte bei wiederkehrender Zahlung |
| Apple Pay / Google Pay | Praktisch kostenlos "mit dabei" über Paddle Checkout, senkt Kauf-Reibung auf Mobile spürbar |

Bewusst **nicht** aufgenommen: Klarna/Rechnungskauf — passt eher zu einmaligen, höherpreisigen Käufen als zu einem 9,99-€-Abo, zusätzliche Komplexität ohne erkennbaren Nutzen für dieses Preissegment.

### 6.3 Preis-Struktur

| Plan | Preis | Abrechnung |
|---|---|---|
| Monatlich | 9,99 € | monatlich, jederzeit kündbar |
| Jährlich | 79 € | jährlich (≈ 6,58 €/Mon., 34 % Ersparnis) |

Keine klassische Testphase mit hinterlegter Zahlungsmethode — passt nicht zur "keine Abo-Falle"-Positionierung. Die Vertrauensarbeit übernimmt der kostenlose Exposé-Einzel-Scan (6.6), ganz ohne Zahlungsdaten.

### 6.4 Bestell-/Checkout-Flow

1. Nach Login + Plan-Auswahl (3.4) erzeugt der Worker eine Paddle-Checkout-Transaktion (Server-zu-Server, API-Key nie im Client), verknüpft mit `user_id`/E-Mail
2. Paddle-Checkout öffnet sich als Overlay (bleibt auf `immofuchs.info`, kein externer Tab-Wechsel — bessere Conversion als Redirect) — Nutzer wählt dort Kreditkarte/PayPal/SEPA/Apple Pay/Google Pay
3. Nach Zahlung: Paddle-Webhook (`transaction.completed`, danach `subscription.updated`/`subscription.canceled`) trifft am Worker ein, signaturgeprüft
4. Worker prüft `event_id` gegen `processed_webhook_events` (Idempotenz, Abschnitt 10.2), schreibt/aktualisiert `subscriptions`-Zeile inkl. `first_purchase_at`
5. Nutzer landet zurück in der App — Pro ist serverseitig aktiv (Abschnitt 7)
6. **Zahlungsmethode ändern:** Link zum Paddle-Customer-Portal (in Checkout inkludiert) — kein Eigenbau nötig
7. **Kündigen:** *nicht* nur der Portal-Link — eigener Button/Endpunkt, siehe Abschnitt 9

### 6.5 Rechnungsstellung & -versand

Da Paddle als Merchant of Record der **rechtliche Verkäufer** gegenüber dem Kunden ist, stellt Paddle automatisch gesetzeskonforme Rechnungen aus (inkl. korrektem USt.-Satz je nach Land des Käufers) und versendet sie per E-Mail bei Kauf und bei jeder Verlängerung. **ImmoFuchs baut keine eigene Rechnungsnummer-Logik, keine eigene PDF-Rechnungserstellung.**

Zwei Ebenen, die nicht verwechselt werden dürfen:
- **Rechnungen an Endkunden** (Paddle → Nutzer): automatisch, Paddle-Pflicht, kein ImmoFuchs-Baustein
- **Auszahlungsberichte an ImmoFuchs** (Paddle → Betreiber): Paddles Payout-Reports sind die Buchhaltungsgrundlage für die eigene Steuererklärung/den Steuerberater — das ist etwas anderes als die Kundenrechnung und eine reine Betreiber-Aufgabe

**In der App:** Im Konto-Bereich (Abschnitt 8) ein Link "Rechnungen ansehen", der auf die Paddle-Rechnungsübersicht im Customer Portal verweist — kein eigenes Rechnungsarchiv nötig, das wäre doppelte, fehleranfällige Arbeit gegenüber dem, was Paddle ohnehin rechtssicher vorhält.

### 6.6 Kostenloser Exposé-Scan (Conversion-Hook)

Ein Exposé-Scan pro Gerät, anonym, gezählt über dieselbe `sessionId` wie Finns Rate-Limits (`expose_trial_used`). Nach dem einen Versuch: Hinweis-Chip "🦊 Gefällt dir das? Mit Pro unbegrenzt." → Login-Maske. Wichtigste Conversion-Fläche der ganzen Spec: der Nutzer sieht den Wert, bevor er zahlt.

---

## 7. Rechteprüfung — serverseitig, nicht verhandelbar

Der Client darf Pro-Status **anzeigen**, aber nie **durchsetzen**. Jede Pro-Funktion prüft serverseitig:

```
1. Session-Cookie → sessions-Tabelle → user_id
2. subscriptions-Tabelle: status IN ('active','past_due mit Kulanzfrist')
   UND current_period_end (+ Kulanz, siehe 9.3) > jetzt?
3. Nein → 402/403, Frontend zeigt Upgrade-Hinweis statt Fehlermeldung
4. Ja → Anfrage normal verarbeiten
```

Ein rein clientseitiges `if (isPro)` ist per DevTools in Sekunden umgehbar — bei einem Feature mit echten Grenzkosten (Vision-Tokens) wäre das direkter finanzieller Schaden, kein Theorie-Risiko.

---

## 8. Konto-Verwaltung ("Mein Konto")

Neuer Bereich in der App, erreichbar über den Pro-Button, sobald eingeloggt:

```
Mein Konto
─────────────────────────────
E-Mail: name@beispiel.de        [ändern]
Angemeldet über: Google, E-Mail  (verknüpfte Provider)
─────────────────────────────
Plan: ImmoFuchs Pro – Jährlich
Nächste Abbuchung: 15.08.2027 – 79 €
[Rechnungen ansehen]             → Paddle-Portal
[Zahlungsmethode ändern]         → Paddle-Portal
[Kündigen]                       → eigener Flow, Abschnitt 9
─────────────────────────────
[Alle Geräte abmelden]           → invalidiert alle sessions-Zeilen
[Meine Daten exportieren]        → DSGVO Art. 20
[Konto löschen]                  → DSGVO Art. 17, Abschnitt 8.3
```

### 8.1 E-Mail ändern

Neue Adresse eingeben → Bestätigungs-Magic-Link an die **neue** Adresse → erst nach Klick wird `users.email` aktualisiert. Verhindert, dass sich jemand mit einer falschen/fremden Adresse aus einer bereits offenen Session aussperrt oder ein fremdes Postfach kapert.

### 8.2 Daten-Export (DSGVO Art. 20)

Ein-Klick-Export als JSON (E-Mail, Konto-Erstelldatum, verknüpfte Provider, Abo-Status/-Historie-Referenz) — direkt generiert und heruntergeladen, kein Ticket-Prozess nötig. Datenfußabdruck ist bewusst klein (keine Rechnungs-/Zahlungsdetails bei uns, die liegen bei Paddle als Verkäufer), das hält den Export trivial.

### 8.3 Konto löschen (DSGVO Art. 17)

1. Aktives Abo? → wird zuerst serverseitig bei Paddle gekündigt (sofort oder zum Periodenende — Entscheidung: **sofort**, da "löschen" ein expliziter Endgültigkeits-Wunsch ist, anders als die reguläre Kündigung in Abschnitt 9)
2. Löschung von `users`, `oauth_identities`, `sessions`, `subscriptions` in D1
3. Bestätigungs-E-Mail an die (dann noch kurz gültige) Adresse
4. **Wichtig:** Paddle behält als Verkäufer eigene Transaktions-/Rechnungsdaten gemäß eigener gesetzlicher Aufbewahrungspflicht (GoBD/HGB, i. d. R. 10 Jahre) — das ist Paddles Pflicht als Merchant of Record, nicht ImmoFuchs'. Ein weiterer konkreter Vorteil des MoR-Modells: ImmoFuchs muss diese Aufbewahrung nicht selbst verwalten.

---

## 9. Kündigung im Detail

**Bewusste Entscheidung gegen "nur Portal-Link":** Das deutsche Kündigungsbutton-Gesetz (§ 312k BGB) verlangt eine leicht auffindbare, unmittelbare Kündigungsmöglichkeit auf der eigenen Website/App mit sofortiger Bestätigungsseite (Art der Kündigung, Zeitpunkt der Vertragsbeendigung). Ein reiner Redirect auf ein externes Portal ist dafür rechtlich nicht sicher ausreichend — deshalb eigener Endpunkt statt nur Paddle-Portal-Link.

### 9.1 Ablauf

1. "Mein Konto" → "Kündigen" → eigene Bestätigungsseite in der App: "Dein Abo endet am 15.08.2027, bis dahin bleibt Pro aktiv."
2. Bestätigung → Worker ruft Paddle-API auf (`cancel_at_period_end = true`, **nicht** sofort — Nutzer hat bereits bezahlt, behält Zugriff bis Periodenende)
3. `subscriptions.status = 'cancel_scheduled'`, Bestätigungs-E-Mail (eigener Versand, nicht Paddle)
4. **Reaktivierung:** Solange `cancel_scheduled` und Periode noch läuft, ein-Klick "Kündigung zurücknehmen" im Konto-Bereich

### 9.2 Automatische Verlängerungs-Erinnerung

Nur beim Jahresplan (beim Monatsplan zu häufig/nervig): 7 Tage vor `current_period_end` eine Erinnerungs-Mail, ausgelöst über einen Cloudflare Cron Trigger, der `subscriptions` auf bald fällige Perioden prüft. Kein gesetzliches Muss in Deutschland (anders als z. B. Kalifornien), aber guter Ton und reduziert überraschte Kündigungswünsche/Chargebacks.

### 9.3 Zahlungsprobleme (Dunning) & Kulanzfrist

Paddle übernimmt automatische Zahlungs-Wiederholungsversuche samt Erinnerungs-Mails bei fehlgeschlagener Karten-/Lastschriftzahlung (Standard-Funktion von Paddle Subscriptions). Entscheidung ImmoFuchs-seitig: **3 Tage Kulanzfrist** — Status `past_due` entzieht den Pro-Zugriff nicht sofort, sondern erst nach 3 Tagen ohne erfolgreiche Zahlung. Verhindert, dass eine einzelne abgelaufene Karte einen zahlungswilligen Kunden sofort aussperrt.

---

## 10. Sicherheit — Ergänzungen

### 10.1 Account-Enumeration

Siehe 3.3 — identische Antwort bei E-Mail-Login unabhängig von Konto-Existenz.

### 10.2 Webhook-Idempotenz

Paddle liefert Events "at least once" — derselbe Webhook kann mehrfach eintreffen. Der Worker prüft `event_id` gegen `processed_webhook_events`, bevor eine Aktion ausgeführt wird (siehe Datenmodell, Abschnitt 2). Ohne diese Prüfung: Risiko doppelter Verarbeitung/Race Conditions bei `subscriptions`-Updates.

### 10.3 Session-Sicherheit

Kein hartes IP-Binding (mobile Nutzer wechseln ständig Netz/IP, das würde zu Fehl-Logouts führen). Stattdessen: "Alle Geräte abmelden"-Button im Konto-Bereich (8) als Nutzer-Kontrolle, `last_seen_at`/`user_agent` pro Session sichtbar für Transparenz.

### 10.4 Rate-Limiting Auth-Endpunkte

Magic-Link-Versand: 5/Std./E-Mail (siehe 4). OAuth-Callbacks: kein zusätzliches Limit nötig, der jeweilige Provider fängt Brute-Force bereits selbst ab.

---

## 11. E-Mail-/Benachrichtigungs-Übersicht

| Auslöser | Versand durch | Inhalt |
|---|---|---|
| Kauf abgeschlossen | Paddle (automatisch) | Zahlungsbeleg/Rechnung |
| Jede Verlängerung | Paddle (automatisch) | Rechnung |
| Erinnerung 7 Tage vor Jahres-Verlängerung | ImmoFuchs (Cron) | Hinweis, Betrag, Kündigungslink |
| Zahlung fehlgeschlagen | Paddle (automatisch, Dunning) | Zahlungsproblem-Hinweis |
| Kündigung bestätigt | ImmoFuchs (eigener Endpunkt) | Enddatum, Reaktivierungs-Hinweis |
| Konto gelöscht | ImmoFuchs (eigener Endpunkt) | Bestätigung |
| Magic-Link angefordert | ImmoFuchs (Resend/Email Worker) | Login-Link, 15 Min. gültig |
| E-Mail-Änderung bestätigen | ImmoFuchs (eigener Endpunkt) | Bestätigungslink an neue Adresse |

---

## 12. Rückerstattung — freiwillige Geld-zurück-Garantie

Beim Checkout muss der Nutzer aktiv bestätigen, dass die Leistung sofort beginnen soll (nötig, damit Pro sofort nutzbar ist) — das lässt das gesetzliche 14-tägige Widerrufsrecht bei digitalen Leistungen vorzeitig erlöschen (Checkbox, siehe Abschnitt 13). Um trotzdem kein Vertrauen zu verlieren: **freiwillige 14-Tage-Geld-zurück-Garantie** als Kulanz, nicht als gesetzlicher Anspruch formuliert. Umsetzung: Self-Service-Button "Geld zurück" im Konto-Bereich, nur sichtbar innerhalb 14 Tage ab `first_purchase_at`, löst eine Paddle-Rückerstattung aus + sofortigen Entzug des Pro-Status. Nach Ablauf der 14 Tage: nur noch manueller Support-Weg (Einzelfall), kein automatisierter Button mehr.

---

## 13. Rechtliches — Hinweis, keine Rechtsberatung

Ich bin kein Anwalt; folgende Punkte gehören vor Go-Live von einer Fachperson geprüft:

- **Widerrufsrecht bei digitalen Leistungen:** Checkbox im Checkout ("sofortiger Beginn, Verlust des Widerrufsrechts") nötig — sonst gilt automatisch das reguläre 14-Tage-Recht. Die freiwillige Geld-zurück-Garantie (Abschnitt 12) ersetzt das nicht rechtlich, wirkt aber wirtschaftlich ähnlich kulant.
- **Preisangaben:** Gesamtpreis inkl. USt., Intervall, Kündigungsbedingungen vor Zahlung sichtbar (3.4).
- **Kündigungsbutton-Pflicht (§ 312k BGB):** eigener In-App-Flow (Abschnitt 9) statt reinem Portal-Link — so umgesetzt, weil ein externer Redirect rechtlich unsicherer wäre. Endgültige Formulierung/Prüfung vor Go-Live nötig.
- **AGB/Datenschutzerklärung:** Ergänzung um Konten, OAuth-Provider (Google/Apple), Paddle als Merchant of Record/Zahlungsdienstleister, sowie die neue Cloudflare-D1-Datenverarbeitung.
- **Rechnungsstellung:** Da Paddle Verkäufer ist, entfällt die eigene §14-UStG-Rechnungspflicht gegenüber Endkunden — dennoch prüfen lassen, ob für ImmoFuchs als Paddle-"Verkäufer-Partner" zusätzliche Angaben in AGB/Impressum nötig sind.

---

## 14. Infrastruktur-Diff gegenüber heute

- **D1-Binding** (`DB`) in `wrangler.toml`, Migrations-Ordner für Schema aus Abschnitt 2
- **Neue Routen:** `/api/auth/google/callback`, `/api/auth/apple/callback`, `/api/auth/email/start`, `/api/auth/email/callback`, `/api/auth/email-change/confirm`, `/api/checkout/start`, `/api/paddle/webhook`, `/api/subscription/cancel`, `/api/subscription/reactivate`, `/api/subscription/refund`, `/api/account/export`, `/api/account/delete`, `/api/account/logout-all`, `/api/me`
- **Neue Secrets:** `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `APPLE_*` (Team-ID, Key-ID, private Key), `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, ggf. `RESEND_API_KEY`
- **Neu:** Cloudflare Cron Trigger für Verlängerungs-Erinnerungen (9.2)
- **Bestehendes bleibt unverändert:** `/api/assistant` und `/api/expose-extract` bekommen nur einen zusätzlichen Entitlement-Check vorgeschaltet (Abschnitt 7) — Kernlogik unangetastet, Stabilitätsregel aus `CLAUDE.md` eingehalten

---

## 15. Bewusst nicht Teil dieser Spec

- Team-/Mehrplatz-Accounts (keine Nachfrage-Grundlage bisher)
- Lifetime-Kauf als drittes Preismodell
- Passwort-basierter Login
- Klarna/BNPL (siehe 6.2)
- Cross-Device-Sync der Merkliste über den reinen Pro-Status hinaus (weiterhin `localStorage`, nur Entitlement ist kontogebunden)
- Automatisiertes Refund-Handling nach Tag 14 (bleibt manueller Support-Fall)

---

## 16. Technische Umstellung der bestehenden App

Konkret geprüft gegen den heutigen Code-/Deploy-Stand (`worker/`, `.env`, `worker/README.md`, `public/sw.js`), nicht nur theoretisch hergeleitet.

### 16.1 Kritischer Vorlauf-Schritt: Worker-Domain umziehen

Der Assistant-Worker läuft aktuell unter `immofuchs-assistant.engincelenk.workers.dev` (siehe `.env`, `worker/README.md`) — eine **andere** Domain als `immofuchs.info`. Session-Cookies funktionieren zwischen völlig getrennten Domains nur mit `SameSite=None; Secure`, was von Safari/iOS-ITP (dem Browser eines großen Teils der Zielgruppe) zunehmend eingeschränkt bzw. kurzlebig behandelt wird — für ein Bezahl-Feature ein zu großes Risiko für stille Session-Abbrüche.

**Entscheidung:** Vor jeder Auth-Arbeit zieht der Worker auf eine eigene Subdomain unter der echten Domain um, z. B. `api.immofuchs.info` (Cloudflare Custom Domain/Route). Erst dann funktioniert `SameSite=Lax` zuverlässig, weil Frontend und API dieselbe registrierbare Domain teilen. Der Worker README weist selbst schon auf die Folgeschritte bei einem Domain-Wechsel hin:
- `VITE_ASSISTANT_URL` in `.env`/CI-Secrets auf die neue Domain ändern
- `connect-src` in der Content-Security-Policy in `index.html` um die neue Domain ergänzen (sonst blockt der Browser die Verbindung selbst bei korrekter CORS-Konfiguration — genau dieser Fehler ist beim ersten Live-Test 2026 schon einmal aufgetreten, siehe `release-notes.txt`)

Gute Nachricht: Die bestehende CORS-Logik in `index.ts` (`buildCorsHeaders`) spiegelt schon jetzt korrekt die konkrete Origin zurück statt `*` zu verwenden — das ist exakt die Voraussetzung, damit `Access-Control-Allow-Credentials: true` (neu nötig für Cookies) überhaupt zulässig ist. Hier muss nur ergänzt, nichts umgebaut werden.

### 16.2 Worker (`worker/src/`)

- **Neues D1-Binding** in `wrangler.toml` (`DB`), für **drei getrennte Datenbanken** (dev/qa/prod) — folgt demselben Muster wie der schon existierende separate Dev-Worker (`[env.dev]`-Block)
- **Migrations-Ordner** mit dem Schema aus Abschnitt 2 (`wrangler d1 migrations apply`)
- **Neue Module**, parallel zum bestehenden Stil (kleine, fokussierte Dateien wie `validator.ts`/`modelRouter.ts`):
  `auth/google.ts`, `auth/apple.ts` (inkl. JWT-Client-Secret-Erzeugung, von Apple verlangt), `auth/magicLink.ts`, `auth/session.ts`, `db.ts`, `paddle/checkout.ts`, `paddle/webhook.ts`, `entitlement.ts` (zentrale, wiederverwendete `isPro(userId)`-Prüfung), `email.ts`
- **Router-Umbau:** `index.ts` behandelt heute genau einen festen Pfad (`/api/assistant`). Mit ~15 neuen Endpunkten (Abschnitt 14) braucht es echtes Routing (einfacher `switch`/Pfad-Matching reicht, kein Framework nötig) statt der jetzigen Einzel-Pfad-Prüfung
- **Bestehende Handler unangetastet:** `/api/assistant` bekommt nur einen vorgeschalteten `entitlement.ts`-Check für die künftige Free/Pro-Unterscheidung bei Finn-Limits — die eigentliche Prompt-/Modell-Logik bleibt exakt wie sie ist (Stabilitätsregel)
- **Neuer `scheduled()`-Handler** für den Cron Trigger (Verlängerungs-Erinnerungen, 9.2) — bisher hat der Worker nur einen `fetch()`-Handler, das ist ein neuer Handler-Typ, kein Umbau des bestehenden
- **Secrets** je Umgebung einzeln setzen (`wrangler secret put`, wie bei `GEMINI_API_KEY` schon etabliert): `GOOGLE_CLIENT_ID/SECRET`, `APPLE_*`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `RESEND_API_KEY`

### 16.3 Frontend (`src/`)

- **Neue Komponenten** unter `src/components/account/` (analog zum bestehenden `assistant/`-Ordner-Muster): `LoginModal.jsx`, `PlanSelect.jsx`, `AccountPanel.jsx`, `CancelFlow.jsx`
- **Neuer Hook** `src/hooks/useAccount.js` — hält Login-/Pro-Status, ruft `/api/me`, strukturell wie `useAssistant`/`useFinnBubble`
- **Neuer globaler Zustand:** Der heutige App-Root kennt nur den Rechner-`data`-Context. Pro-Status muss app-weit verfügbar sein (Merkliste-Limit, Exposé-Gate, Finn-Limit-Unterschied) — sauberste Lösung: zweiter, kleiner React-Context (`AccountContext`) statt den bestehenden `data`-Context zu vermischen
- **`Statusleiste.jsx`:** neuer "Pro"-Button neben `LangSel.jsx`
- **`Merkliste.jsx`:** Limit-Logik (3 Objekte Free) + Upgrade-Hinweis ab dem 4.
- **Alle `fetch()`-Aufrufe an den Worker:** müssen `credentials: "include"` ergänzen, damit das Session-Cookie mitgeschickt wird — bestehende `useAssistant`-Fetches eingeschlossen, nicht nur die neuen
- **i18n:** neue Keys für Login/Konto/Kündigung/Fehlertexte in allen 5 Sprachen — neue Datei `src/i18n/account.js` analog zu `src/i18n/assistant.js`, kein Umbau des bestehenden Systems
- **Service Worker (`public/sw.js`):** geprüft — **keine Änderung nötig**. Er filtert bereits `if (url.origin !== self.location.origin) return`, cross-origin-API-Calls an den Worker fasst er also gar nicht erst an. Eine client-seitige OAuth-Callback-Route (z. B. `/auth/callback`) landet als normale Same-Origin-Navigation und läuft durch den bestehenden Network-First-Pfad — unproblematisch, da reines SPA-Routing wie jede andere Seite auch.

### 16.4 Infrastruktur & externe Konten (kein Code, aber blockierend)

- 3× D1-Datenbank anlegen (dev/qa/prod)
- Google Cloud Console: OAuth-Client + Redirect-URIs für alle 3 Umgebungen
- Apple Developer Program (99 $/Jahr) + Sign-in-with-Apple Service-ID/Key
- Paddle-Konto: Verkäufer-Verifizierung **vor** Go-Live einplanen (kann Tage bis Wochen dauern), Produkte/Preise im Dashboard anlegen, Sandbox für dev/qa
- Resend- oder Cloudflare-Email-Workers-Konto für Magic-Link-/Kündigungs-Mails
- `.github/workflows/deploy-dev.yml`/`deploy-qa.yml`/`deploy-prod.yml`: neue Secrets ergänzen, D1-Migration als Deploy-Schritt einbauen

### 16.5 Testing — offener Punkt

Es existiert laut `docs/testbericht-refactoring-2026-07-19.md` kein automatisiertes Test-Framework, bisher bewusst so belassen (rein manuelle Testszenarien reichten für Rechenlogik + Chat). Bei echtem Geld/Webhooks würde ich das an dieser Stelle neu bewerten: mindestens für Webhook-Idempotenz, Entitlement-Check und Kündigungs-/Refund-Logik automatisierte Tests einführen (z. B. Vitest, minimal-invasiv) — das ist eine Empfehlung, keine in dieser Spec bereits getroffene Entscheidung, da sie über reine Kommerzialisierung hinausgeht.

### 16.6 Empfohlene Umsetzungs-Reihenfolge

1. **Fundament:** Worker-Domain-Umzug (16.1) + D1 + Google/Apple/E-Mail-Login + Session — Konto erstellbar, noch keine Bezahlung
2. **Payment:** Paddle-Checkout + Webhook + Entitlement-Check
3. **Konto-Verwaltung:** Mein Konto, Kündigung, Datenexport, Löschung
4. **Feature-Gating:** Merkliste-Limit, Exposé-Gate, Finn-Limit-Unterscheidung Free/Pro
5. **Lifecycle-Extras:** Cron-Erinnerungen, Dunning-Kulanzfrist, Self-Service-Refund

Jede Phase einzeln testbar und freigebbar — passt zum bereits etablierten Rollout-Muster des KI-Assistenten selbst (`docs/archive/2026-07-19-ki-assistent-konzept.md`, Abschnitt 5).

---

## 17. PWA-spezifische Aspekte

Geprüft gegen `public/manifest.json` und `public/sw.js`. Das hier ist der Teil, der bei einer normalen Web-App keine Rolle spielen würde, bei ImmoFuchs als installierbarer PWA aber schon.

### 17.1 `manifest.json` — eine Zeile ist jetzt sachlich falsch

Die aktuelle `description` lautet *"Rendite, Kredit, Mieterhöhung und Sanierung berechnen. Kostenlos, offline, ohne Anmeldung."* — das "ohne Anmeldung" stimmt für Free weiterhin, aber nicht mehr uneingeschränkt für die App insgesamt. Anpassen auf z. B. *"…Kostenlos, offline. KI-Extras optional mit ImmoFuchs Pro."* `scope`/`start_url` (beide `"/"`) decken Login-/Checkout-Rückkehr-Routen bereits ab — hier ist keine Änderung nötig, das ist schon breit genug konfiguriert.

### 17.2 Standalone-Modus + OAuth-Redirect — bekanntes Rough Edge, kein Blocker

`display: "standalone"` bedeutet: kein Browser-Chrome, die App läuft wie eine native App. Ein klassischer OAuth-Redirect (Google/Apple) verlässt in diesem Modus kurz die App-Hülle und kann auf iOS je nach Version in Safari statt zurück in die installierte App landen, bevor der Rückweg zu `immofuchs.info` wieder im installierten Kontext ankommt. Das ist ein bekanntes, PWA-weites Verhalten, kein ImmoFuchs-spezifischer Bug. **Entscheidung:** als bekannte, kleine Reibung akzeptieren (Login bleibt seltene Aktion, kein Dauerzustand) statt dafür einen nativen Wrapper/Popup-Sonderweg zu bauen — das stünde in keinem Verhältnis zum Aufwand. Vor Go-Live einmal gezielt auf einem installierten iOS-Gerät testen, nicht nur im Browser-Tab.

### 17.3 Store-Vertrieb und Bezahl-Interaktion — direkt relevant für die Marge

Das hier verbindet sich mit `docs/app-store-konzept-2026-07-23.md` (Google Play zuerst per TWA, Apple erst nach offener Entscheidung) und ist bei der Preiskalkulation (9,99 €/79 €) mitzudenken, nicht nur eine rechtliche Fußnote:

- **Google Play:** Seit 30.6.2026 sind externe Zahlungsanbieter (wie Paddle) in EU/EEA erlaubt — aber Google erhebt trotzdem **10 % Gebühr auf den externen Umsatz** der ersten 1 Mio. $/Jahr (5 %, falls stattdessen direkt Google Play Billing genutzt wird). Das heißt: Ein Play-Store-vertriebener TWA-Nutzer, der über Paddle zahlt, kostet zusätzlich zu Paddles eigener Gebühr noch einmal 10 % an Google — das ist ein echter Marge-Faktor, der bei der 9,99-€/79-€-Kalkulation nicht mehr "0 €" ist, sobald der Play-Store-Vertriebsweg (bereits beschlossen) live geht.
- **Apple:** Falls die noch offene Apple-Entscheidung positiv ausfällt — seit DMA sind externe Kauf-Links in der EU erlaubt, aber mit einem effektiven Gebühren-Stack von ca. 20 % (Core-Technology-Commission + Folgegebühren), nicht kostenlos.
- **Entscheidung:** Der Kaufprozess bleibt technisch identisch, egal ob über die installierte App/TWA oder direkt im Browser aufgerufen — kein separates Play-Billing- oder StoreKit-Modul einbauen. Das ist nicht nur der einfachste technische Weg (ein Zahlungs-Stack statt drei), sondern hält auch die Store-Gebühren auf den günstigeren "externe Zahlung"-Sätzen statt der vollen 15–30 % In-App-Kauf-Kommission. Die Google-10-%-Gebühr auf externe Zahlungen bleibt trotzdem ein Kostenfaktor, der real eingepreist werden sollte, kein Nullsummenspiel.

### 17.4 Push-Benachrichtigungen — bewusst nicht ausgebaut

Der bestehende Service Worker kann heute nur lokale Benachrichtigungen zeigen, ausgelöst von einem aktiven Tab (Zinsalarm-Muster: `postMessage` → `showNotification`), kein echtes Web-Push mit serverseitigem VAPID-Versand bei geschlossener App. **Entscheidung:** Für Abo-/Kündigungs-Erinnerungen reicht E-Mail (Abschnitt 11) — kein echtes Web-Push-System zusätzlich aufbauen. Das wäre ein eigenständiges, größeres Infrastruktur-Stück (VAPID-Keys, Push-Subscriptions in D1, Berechtigungs-UX) ohne zwingenden Mehrwert gegenüber E-Mail für diesen Zweck.

### 17.5 Offline-Verhalten der neuen Features

Login, Checkout und Exposé-Scan brauchen zwingend eine Verbindung — das ist unvermeidbar und bricht nicht das Kernversprechen, weil die 4 Rechner selbst vollständig offline-fähig bleiben (unverändert). Für den Fall "Pro-Nutzer ist offline, tippt trotzdem auf ein Pro-Feature": denselben Offline-Zustand wiederverwenden, den Finn schon hat (*"Dafür brauche ich kurz Internet. Deine Rechner funktionieren trotzdem weiter offline."*, `docs/archive/2026-07-19-ki-assistent-konzept.md`, 3.3) — kein neuer Zustand nötig, nur derselbe Text an neuer Stelle.

---

## 19. ADR — Echte native App statt reiner TWA/PWA

```
Status: Accepted
Datum: 2026-07-26
Entscheidungsträger: Software-Architektur-Perspektive dieser Spec

Kontext:
`docs/app-store-konzept-2026-07-23.md` hatte Google Play per TWA bereits
beschlossen, die Apple-Entscheidung aber explizit an "Ja/Nein zu nativem
Push/Widget" geknüpft. Eine reine TWA/WebView-Lösung existiert auf iOS
nicht offiziell und riskiert eine Ablehnung nach Apple Guideline 4.2
("Minimum Functionality") — Apple lehnt Apps ab, die sich wie eine bloße
Website-Hülle ohne native Mehrwert anfühlen.

Entscheidung:
Capacitor (Ionic) als native Hülle um den bestehenden React/Vite-Build,
für BEIDE Stores. Kein React Native, kein Flutter, kein zweiter
UI-Codebase. Das bestehende `src/`-Frontend bleibt zu 100 % unangetastet —
Capacitor kompiliert denselben Vite-`dist`-Output in native
Xcode-/Android-Studio-Projekte und ergänzt native Plugins (Push, Splash,
Statusbar, Haptics) außenherum.

Begründung:
- Ein Solo-/Kleinteam kann keine zwei getrennte native Codebasen pflegen
- Volle Wiederverwendung des bestehenden, bereits funktionierenden Codes
- Löst nebenbei die in Abschnitt 17.4 bewusst aufgeschobene
  Web-Push-Einschränkung: Capacitors Push-Plugin bringt echtes APNs/FCM,
  ohne dass ImmoFuchs eine eigene VAPID-Server-Infrastruktur bauen muss
- Erfüllt Apple Guideline 4.2 durch echte native Elemente statt reinem
  WebView

Konsequenzen:
+ Ein Codebase, zwei Stores, kein UI-Rewrite
+ Web-Push "kostenlos" mitgelöst
+ Löst die offene Apple-Bedingung aus dem App-Store-Konzept konkret auf
− Neue Build-Toolchain (Xcode, Android Studio, Fastlane) — zusätzlicher
  Wartungsaufwand gegenüber reinem Web-Deploy
− App-Store-Review-Zyklen (Tage bis Wochen, Apple strenger als Google)
  werden Teil jeder künftigen Release-Zeitachse

Alternativen erwogen:
- React Native → verworfen: kompletter UI-Rewrite, verletzt die harte
  Stack-Regel aus CLAUDE.md fundamental
- Flutter → verworfen: komplett andere Sprache/Ökosystem (Dart), keine
  Code-Wiederverwendung
- Reine TWA/WebView-Wrapper für iOS → verworfen: kein offizieller
  TWA-Support auf iOS, hohes Rejection-Risiko ohne native Mindestfunktion
```

### 19.1 Natives Zinssatz-Widget — MVP-Scope

Löst konkret die offene Apple-Bedingung. **Nicht** durch Capacitor abgedeckt — braucht ein kleines eigenständiges natives Modul pro Plattform (WidgetKit für iOS, App Widget für Android), das den aktuellen Durchschnittszins aus `zinsen.json` anzeigt. **Bewusster MVP-Schnitt:** nur Anzeige, keine Interaktion, keine eigene Konfigurierbarkeit — verhindert, dass ein an sich kleiner Baustein zu einem eigenen Mini-Projekt wird.

---

## 20. App-Store-Compliance

Verbindet sich direkt mit Abschnitt 17.3 (Store-Gebühren) — hier die Konsequenzen für die jetzt echte native App:

- **In-App-Kauf-Policy:** Die dortige Entscheidung gilt unverändert — Kaufprozess bleibt identisch zu Web/Paddle, keine separate StoreKit-/Play-Billing-Integration. Die Store-Gebühren-Policy knüpft am Vertriebsweg an (App wird über den Store verteilt), nicht an der verwendeten Technologie — TWA vs. Capacitor-nativ ändert daran nichts.
- **Apple Guideline 4.2 (Minimum Functionality):** jetzt durch native Push, natives Widget und native UI-Elemente (Splashscreen, Statusbar, Haptics) erfüllbar.
- **Apple Sign-in-Pflicht (Guideline 4.8):** bereits durch Abschnitt 5 gelöst — Apple-Login ist ohnehin Teil des Plans, keine Zusatzarbeit.
- **Formular-Pflichten:** Apple "Privacy Nutrition Labels" und Google Play "Data Safety"-Formular müssen ausgefüllt werden — spiegeln inhaltlich exakt das, was in den Datenschutz-Abschnitten (9, 13) bereits festgelegt ist, hier nur als eigener Formular-Schritt vor Store-Einreichung vermerkt.

---

## 21. Build- & Release-Pipeline für die native App (DevOps-Perspektive, angepasst an den realen Stack)

Der `devops-engineer`-Skill setzt standardmäßig auf AWS/Docker/Terraform — das passt nicht zu ImmoFuchs (Cloudflare Pages/Workers, GitHub Actions, kein Container-Betrieb). Übernommen werden die **Prinzipien** (Secrets nie im Repo, kein manueller Prod-Eingriff, automatisierte Pipeline pro Umgebung), umgesetzt mit den tatsächlich passenden Werkzeugen:

- **Neuer Ordner `mobile/`** (Capacitor-Projekt), referenziert denselben `dist/`-Output wie der bestehende Web-Build — kein zweiter Build-Prozess für die UI
- **Fastlane** für beide Plattformen: iOS (`match` für Zertifikate/Provisioning-Profile, TestFlight-Upload), Android (Signing, Play-Console-Upload via `supply`) — Standardwerkzeug für genau dieses Szenario, vermeidet manuelle Klicks in Xcode/Play Console
- **Neue GitHub-Actions-Workflows:** `.github/workflows/mobile-ios.yml` (macOS-Runner, für Xcode-Build zwingend), `.github/workflows/mobile-android.yml` (Ubuntu-Runner reicht)
- **Signing-Secrets** (Apple-Zertifikate/Provisioning-Profile, Android-Keystore) ausschließlich über GitHub Secrets — dieselbe Disziplin wie beim bestehenden `GEMINI_API_KEY`/Cloudflare-Secrets-Muster, keine Ausnahme für "nur mobile Secrets"
- **Release-Kanäle als Pflicht-Zwischenstufe:** TestFlight (intern, dann extern) für iOS, Play-Console-interner/geschlossener Test für Android — nie direkt auf "Production" einreichen

---

## 22. QA-Strategie für die native Ebene

Die bestehende Testlücke (kein automatisiertes Test-Framework, siehe 16.5) wird auf der nativen Ebene riskanter, weil eine Store-Rejection Tage kostet, nicht Minuten wie ein fehlgeschlagener Web-Deploy:

- **Minimum vor jeder Store-Einreichung:** Playwright-Smoke-Tests gegen die Capacitor-WebView (dieselbe Web-App läuft darin — bestehende Rechner-Logik lässt sich also mit denselben Testprinzipien absichern, die in Abschnitt 16.5 ohnehin empfohlen wurden)
- **Geräte-Matrix (Minimum):** 1 aktuelles iPhone + 1 ältestes noch unterstütztes iOS, 1 aktuelles Android-Flaggschiff + 1 günstigeres Android-Gerät (Android-Fragmentierung ist real — ein Test nur auf einem Gerät ist keine Abdeckung)
- **Beta-Track vor jedem Store-Release Pflicht:** TestFlight extern (mindestens 3–5 Tage Laufzeit) + Play-Console geschlossener Test, bevor überhaupt eine Production-Einreichung erfolgt

---

## 23. Priorisierung für den Erst-Release (Product-Owner-Perspektive, MoSCoW)

**Business Case:** App-Store-Präsenz erhöht Auffindbarkeit und Vertrauen gerade bei der zahlungsbereiten Zielgruppe — Kapitalanleger suchen eher gezielt im Store als sich eine PWA manuell zu installieren. Direkter Hebel auf Pro-Conversion, nicht nur Reichweite.

```
MUST HAVE (ohne das kein Store-Release):
- Capacitor-Wrapper für beide Plattformen (Abschnitt 19)
- Store-Listings (Screenshots, Beschreibung, Datenschutz-Formulare, Abschnitt 20)
- IAP-Policy-konformer Zahlungsweg — bereits gelöst (Abschnitt 17.3/20)
- Push-Benachrichtigungen für Abo-/Verlängerungs-Erinnerungen (verbindet
  Abschnitt 9.2 mit der neuen nativen Push-Fähigkeit)

SHOULD HAVE (wichtig, kein Blocker für Erst-Release):
- Natives Zinssatz-Widget (19.1) — löst die offene Apple-Bedingung,
  könnte aber notfalls eine Woche nach Erst-Release nachgereicht werden

COULD HAVE (nice-to-have, wenn Kapazität da ist):
- Biometrische Login-Bestätigung (Face ID/Fingerabdruck) als
  Komfort-Layer oberhalb des bestehenden Session-Cookies

WON'T HAVE (bewusst ausgeschlossen für diesen Release):
- Eigenständige native UI-Neugestaltung — Begründung: widerspricht dem
  "ein Codebase"-Prinzip aus Abschnitt 19
- App-Clips/Instant-Apps — Begründung: kein erkennbarer Nutzen für den
  Anwendungsfall, zusätzlicher Aufwand ohne Business Case
```

---

## 24. Umsetzungs-Roadmap — Phasen, Sprints, Meilensteine

Scrum-Rahmen: 2-Wochen-Sprints, Sprint Goal pro Sprint, Meilenstein am Ende jeder Phase. Deckt **beide** Scopes ab (Kommerzialisierung + native App) als **ein** zusammenhängendes Programm, nicht zwei getrennte Projekte — die native App braucht die Kommerzialisierung als Fundament (derselbe Login/Payment-Stack wird in der App wiederverwendet, nicht neu gebaut).

### Phase A — Konten-Fundament

**Sprint 1**
Sprint Goal: *"Ein Nutzer kann sich per Google oder E-Mail-Magic-Link einloggen und bleibt eingeloggt."*
Enthalten: Worker-Domain-Umzug auf `api.immofuchs.info` (16.1, echter Blocker für alles Folgende), D1-Setup (Abschnitt 2), Google-OAuth + E-Mail-Magic-Link (Abschnitt 5), Session-Handling.

**Sprint 2**
Sprint Goal: *"Alle drei Login-Wege funktionieren, der Nutzer sieht seinen Kontostatus."*
Enthalten: Apple-Login, Konten-Verknüpfung-Edge-Case (4.1), "Mein Konto"-Grundgerüst (Abschnitt 8, nur Anzeige, noch keine Aktionen).

**Meilenstein A:** Konten-Fundament auf dev/qa end-to-end testbar — noch kein Payment.

### Phase B — Zahlung & Berechtigung

**Sprint 3**
Sprint Goal: *"Ein Nutzer kann Pro kaufen, und die Rechteprüfung greift serverseitig."*
Enthalten: Paddle-Checkout-Integration (6.4), Webhook + Idempotenz (10.2), Entitlement-Check in `/api/assistant` (Abschnitt 7).

**Sprint 4**
Sprint Goal: *"Der komplette Abo-Lebenszyklus funktioniert ohne Support-Ticket."*
Enthalten: Kündigung-Flow + Reaktivierung (Abschnitt 9), Dunning-Kulanzfrist (9.3), Renewal-Reminder-Cron (9.2), Self-Service-Rückerstattung (Abschnitt 12).

**Meilenstein B:** ImmoFuchs Pro käuflich (zunächst dev/qa-Sandbox — Freigabe für echten Produktions-Traffic ist ein eigener, expliziter Schritt, kein Automatismus am Sprint-Ende).

### Phase C — Feature-Gating

**Sprint 5**
Sprint Goal: *"Free- und Pro-Nutzer erleben spürbar unterschiedliche, korrekt durchgesetzte Grenzen."*
Enthalten: Merkliste-Limit (3 Objekte Free), Exposé-Scan-Trial + Pro-Gate (6.6), Finn-Limit-Unterscheidung Free/Pro.

**Meilenstein C:** Kommerzialisierung feature-complete — der Web-/PWA-Teil des gesamten Programms ist fertig, unabhängig von der nativen App nutzbar.

### Phase D — Native App: Grundgerüst

**Sprint 6**
Sprint Goal: *"Dieselbe App läuft installierbar nativ auf einem Test-iPhone und einem Test-Android-Gerät."*
Enthalten: Capacitor-Setup beide Plattformen (Abschnitt 19), native Splashscreen/Icons/Statusbar, erster interner Testbuild.

**Sprint 7**
Sprint Goal: *"Push-Benachrichtigungen kommen zuverlässig an, der Store-Build läuft automatisiert durch CI."*
Enthalten: Capacitor-Push-Plugin verdrahtet mit der Renewal-Reminder-Logik aus Sprint 4, Fastlane-Pipelines (Abschnitt 21), Signing-Secrets eingerichtet.

**Meilenstein D:** Beta-fähige native Apps — extern testbar über TestFlight/Play geschlossenen Test.

### Phase E — Widget & Store-Launch

**Sprint 8**
Sprint Goal: *"Die Apple-Bedingung aus dem App-Store-Konzept (natives Push + Widget) ist erfüllt."*
Enthalten: Zinssatz-Widget beide Plattformen (19.1), finale Store-Listings/Screenshots, Datenschutz-Formulare (Abschnitt 20).

**Sprint 9**
Sprint Goal: *"ImmoFuchs ist in beiden Stores live und auffindbar."*
Enthalten: Store-Review-Einreichung, Nacharbeiten aus Review-Feedback, finaler Geräte-Matrix-QA-Durchlauf (Abschnitt 22), Go-Live.

**Meilenstein E:** App-Store-Launch — Programmende.

### Gesamtschätzung

9 Sprints × 2 Wochen ≈ **18 Wochen**. Grobe Schätzung, keine feste Zusage — abhängig von Teamgröße (diese Spec trifft dazu keine Annahme) und vor allem von der **Apple-Review-Dauer**, die außerhalb der eigenen Kontrolle liegt (siehe Risiko-Log, Abschnitt 26). Phasen A–C (Kommerzialisierung) sind unabhängig von Phase D–E lauffähig und könnten bei Kapazitätsengpässen als eigenständiges Zwischenziel live gehen, während die native App noch läuft.

---

## 25. Definition of Done (programmweit)

```
Eine Story/ein Sprint-Ziel gilt als DONE wenn:

Code:
  □ Umsetzung gemäß Akzeptanzkriterien dieser Spec
  □ Keine bestehende Rechner-/Finn-Kernlogik verändert (Stabilitätsregel
    aus CLAUDE.md) — nur additive Änderungen an bestehenden Dateien
  □ Secrets ausschließlich über Wrangler-Secrets/GitHub-Secrets, nie im Repo

Tests:
  □ Mindestens die in Abschnitt 16.5/22 empfohlenen Tests für den
    jeweiligen Baustein vorhanden (Web: Webhook/Entitlement/Kündigung;
    Mobile: Playwright-Smoke gegen Capacitor-WebView)
  □ Manuelles Testszenario dokumentiert, analog zum bestehenden Muster
    in `docs/testbericht-refactoring-2026-07-19.md`

Deployment:
  □ Auf dev deployed und verifiziert, bevor qa/prod folgt (bestehendes
    Drei-Umgebungen-Muster unverändert übernommen)
  □ Bei Store-Bausteinen: mindestens ein Beta-Test-Durchlauf
    (TestFlight/Play geschlossener Test) vor Production-Einreichung

Freigabe:
  □ Explizites "Go" nach Projekt-Regel vor jedem Code-Baustein
  □ Release-Notes aktualisiert (bestehende Pflicht aus CLAUDE.md)
```

---

## 26. Bekannte Risiken (Impediment-Log, Startzustand)

```
ID: IMP-01
Beschreibung: Paddle-Verkäufer-Verifizierung kann Tage bis Wochen dauern
Auswirkung: blockiert Sprint 3 (Meilenstein B), falls nicht vorgezogen
Kategorie: Extern
Empfehlung: Paddle-Onboarding parallel zu Phase A anstoßen, nicht erst
  zu Sprint-3-Beginn

ID: IMP-02
Beschreibung: Apple-App-Review-Dauer/-Ausgang ist nicht steuerbar,
  Ablehnungen wegen Guideline 4.2 trotz Vorkehrungen möglich
Auswirkung: Meilenstein E terminlich unsicher
Kategorie: Extern
Empfehlung: Puffer von mindestens 1 Sprint-Länge nach Sprint 9 einplanen,
  bevor ein festes Launch-Datum kommuniziert wird

ID: IMP-03
Beschreibung: Worker-Domain-Umzug (16.1) ist Voraussetzung für jede
  Auth-Arbeit — bei Verzögerung verschiebt sich das gesamte Programm
Auswirkung: blockiert Sprint 1 vollständig
Kategorie: Technisch
Empfehlung: als allerersten Schritt vor Sprint 1 behandeln, nicht als
  Teil der Sprint-1-Kapazität mitzählen

ID: IMP-04
Beschreibung: Kein bestehendes Test-Framework (16.5/22) — Zahlungs- und
  Store-Bausteine sind fehleranfälliger ohne automatisierte Tests
Auswirkung: höheres Rework-Risiko in Phase B, D, E
Kategorie: Prozess
Empfehlung: Vitest-Grundgerüst spätestens zu Sprint-3-Beginn einführen,
  nicht erst wenn ein Fehler bereits passiert ist
```

---

## 27. Nächster Schritt

Konzept vollständig — Login/Registrierung, Zahlung (inkl. Revision Stripe → Paddle wegen PayPal), Rechnungsstellung, Kündigung, Konto-Verwaltung, PWA-spezifische Anpassungen, echte native App für Google Play + Apple App Store, sowie die komplette 9-Sprint-Roadmap (Abschnitt 24). Alle Entscheidungen sind getroffen, keine offenen Optionen mehr.

Vor Umsetzung fehlen noch, unabhängig vom Code:
- Rechtsprüfung (Abschnitt 13)
- Anlage der Accounts bei Google, Apple und Paddle — Paddle prüft Verkäufer vor Freischaltung, Apple Developer Program braucht eigenen Vorlauf (IMP-01/IMP-02, Abschnitt 26)
- Entscheidung, ob Sprint 1 (Worker-Domain-Umzug, IMP-03) sofort beginnen kann oder noch etwas vorgelagert werden muss

Und wie immer nach Projekt-Regel: keine Code-Zeile ohne explizites "Go" pro Baustein — dieses Dokument ist der vollständige Plan, kein Startsignal.
