# Manuelle Testfälle (nicht automatisiert)

Diese Testfälle sind **bewusst nicht** Teil der `e2e/*.e2e.test.ts`-Suite
(siehe `e2e/api-e2e-README.md`, Abschnitt "Was hier bewusst NICHT automatisiert
ist"). Jeder Fall hier erfordert entweder eine echte Ceremonie mit einem
Drittanbieter (Google/Apple-Login), die sich nicht per HTTP-Fetch nachbilden
lässt, oder würde bei automatisierter Ausführung die geteilten Test-Fixtures
(test.free / test.monatlich / test.jaehrlich) zerstören, auf denen die gesamte
übrige Suite aufbaut.

Ziel dieses Dokuments: jeder Testfall so genau beschrieben, dass er ohne
Rückfrage Schritt für Schritt nachvollzogen werden kann — inkl. erwartetem
Ergebnis, damit ein Abweichen sofort auffällt.

---

## 1. Google-OAuth-Login (Neuanmeldung = Registrierung)

**Ziel:** Erstmaliger Login über Google legt automatisch ein neues Konto an
(kein separater Registrierungs-Screen für OAuth-Wege, siehe `routes/auth.ts`).

**Voraussetzung:** Ein Google-Konto, das noch **nicht** mit ImmoFuchs
verknüpft ist (neue/unbenutzte Test-Mail oder ein Google-Konto, das zuvor
noch nie bei ImmoFuchs eingeloggt war).

**Schritte:**
1. Auf `https://dev.immofuchs.info` (bzw. der aktuellen Dev-Frontend-URL) den
   Login-Dialog öffnen.
2. "Mit Google anmelden" klicken.
3. Im sich öffnenden Google-Consent-Screen das Test-Google-Konto auswählen
   und bestätigen.

**Erwartetes Ergebnis:**
- Redirect zurück auf die App mit `?login_success=1` in der URL.
- Nutzer ist eingeloggt (Konto-Menü zeigt die Google-E-Mail-Adresse).
- `GET /api/v1/me` liefert `isPro: false`, `subscription: null`,
  `linkedProviders: ["google"]`.
- In der Admin-Oberfläche (falls Zugriff vorhanden) taucht der neue Nutzer
  mit `role: "customer"` auf.

**Danach aufräumen:** Testkonto über `POST /account/delete` (im Frontend:
Konto löschen, siehe Testfall 3b unten) oder über das Admin-Panel wieder
entfernen, damit sich keine Test-Google-Konten dauerhaft ansammeln.

---

## 2. Google-OAuth-Login (wiederkehrender Nutzer)

**Voraussetzung:** Dasselbe Google-Konto wie in Testfall 1, diesmal bereits
verknüpft.

**Schritte:** Wie Testfall 1, Schritte 1–3, mit demselben Google-Konto.

**Erwartetes Ergebnis:**
- Redirect mit `?login_success=1`.
- **Kein** neuer Nutzer wird angelegt (dieselbe `id` wie beim ersten Login —
  am einfachsten über `GET /api/v1/me` vor/nach Vergleich der `id` prüfen).
- Bereits vorhandene Kontodaten (Name, evtl. Abo) sind unverändert vorhanden.

---

## 3. Google-OAuth-Login — E-Mail bereits über einen anderen Weg vergeben

**Ziel:** Verifiziert den Fehlerfall aus `routes/auth.ts`
(`findOrCreateUserForOAuth` liefert `ok:false`), der eine automatische
Konto-Verknüpfung bewusst verhindert (Spec: Login-Methoden sind strikt
getrennt, nicht nachträglich verknüpfbar).

**Voraussetzung:** Ein Konto existiert bereits mit Passwort-Login unter einer
E-Mail-Adresse, die **identisch** zur Google-Adresse des Test-Kontos ist
(z. B. vorher über `POST /auth/register` mit genau dieser Adresse anlegen,
oder ein Google-Testkonto mit einer bereits per Passwort registrierten
Adresse verwenden).

**Schritte:**
1. Login-Dialog öffnen, "Mit Google anmelden" klicken.
2. Das Google-Konto mit der bereits per Passwort vergebenen Adresse
   bestätigen.

**Erwartetes Ergebnis:**
- Redirect mit `?login_error=oauth_email_taken&providers=password` (bzw.
  weiteren bereits verknüpften Providern, kommagetrennt) in der URL.
- **Kein** neues Konto wird angelegt, **keine** automatische Verknüpfung mit
  dem bestehenden Passwort-Konto.
- Das Frontend sollte dem Nutzer sinngemäß mitteilen: "Diese E-Mail ist
  bereits mit einem Passwort-Konto verknüpft, bitte darüber anmelden."

---

## 4. Konto löschen über Google-Reauth (`/auth/delete-reauth/google`)

**Ziel:** Verifiziert den D2-Sicherheitsmechanismus — eine Kontolöschung für
reine OAuth-Konten (ohne Passwort) erfordert eine frische, erneute
Google-Anmeldung als Nachweis, und die gelöschte Identität muss exakt zu der
Session gehören, die die Löschung angestoßen hat.

**Voraussetzung:** Ein reines Google-Konto **ohne** Passwort (z. B. das aus
Testfall 1 angelegte), eingeloggt im Browser.

**Schritte:**
1. Im Konto-Bereich "Konto löschen" wählen.
2. Da das Konto kein Passwort hat, sollte die App auf den Reauth-Flow
   umleiten (`GET /api/v1/auth/delete-reauth/google`).
3. Im Google-Consent-Screen **dasselbe** Google-Konto erneut bestätigen.

**Erwartetes Ergebnis:**
- Redirect mit `?account_deleted=1`.
- Der Nutzer ist ausgeloggt (Session-Cookie geleert).
- `GET /api/v1/me` mit der alten Session liefert `401 not_authenticated`.
- Ein erneuter Google-Login mit demselben Konto legt (wie in Testfall 1) ein
  **komplett neues** Konto an, keine alten Daten mehr vorhanden.

**Zusatztest (negativ, optional):** Den Reauth-Flow starten, aber im
Google-Consent-Screen ein **anderes** Google-Konto bestätigen (falls
verfügbar) → erwartet: Redirect mit `?login_error=delete_reauth_failed`,
**kein** Konto wird gelöscht (weder das ursprüngliche noch das neue).

---

## 5. Apple-OAuth-Login

**Hinweis:** Gleiches Grundprinzip wie Google-Testfälle 1–4, aber mit
`POST /auth/apple/callback` (Apple nutzt `response_mode=form_post`, kein
GET-Redirect mit Query-Parametern). Apple verlangt zusätzlich eine in Apple
Developer verifizierte Rückgabe-Domain — je nach Dev-Setup ist das evtl. nur
gegen die Produktions-Domain möglich, nicht gegen `api-dev.immofuchs.info`.
Falls das der Fall ist, diesen Testfall stattdessen einmalig gegen die
Produktionsumgebung durchführen (mit einem echten, dafür vorgesehenen
Test-Apple-Konto) und hier vermerken, wann das zuletzt geschah.

**Schritte/Erwartetes Ergebnis:** Analog zu Testfall 1 (Neuanmeldung), 2
(wiederkehrend), 3 (E-Mail-Kollision) und 4 (Löschung über
`/auth/delete-reauth/apple`) — jeweils "Google" durch "Apple" ersetzt,
`linkedProviders: ["apple"]` statt `["google"]`.

---

## 6. `POST /auth/logout-all` — alle Sitzungen eines Kontos beenden

**Ziel:** Verifiziert, dass wirklich **alle** Sessions eines Kontos beendet
werden, nicht nur die aktuelle — der entscheidende Unterschied zu
`POST /auth/logout` (nur die eigene Session).

**Warum nicht automatisiert:** Würde man diesen Endpunkt mit einer der drei
Fixture-Sessions (`E2E_SESSION_FREE/MONATLICH/JAEHRLICH`) aufrufen, würde
genau diese Session gelöscht — die gesamte übrige E2E-Suite baut aber auf
dieser festen Session-ID auf. Ein einmal automatisiert ausgelöstes
`logout-all` auf einem der drei Basis-Konten würde die komplette Suite
dauerhaft rot laufen lassen, bis manuell eine neue Session-Zeile in D1
angelegt wird (siehe `e2e/api-e2e-README.md`).

**Voraussetzung:** Ein Testkonto, dessen Session(s) verzichtbar sind — **NICHT**
`test.free`/`test.monatlich`/`test.jaehrlich` verwenden, wenn ihr die
E2E-Suite weiterlaufen lassen wollt. Am einfachsten: euer eigener
Google-Account aus Testfall 1/2, oder ein separat per
`POST /auth/register` angelegtes Wegwerf-Konto.

**Schritte:**
1. Mit dem Testkonto auf **zwei verschiedenen Geräten/Browsern** (oder einem
   normalen Fenster + einem privaten/Inkognito-Fenster) einloggen — es
   existieren jetzt zwei aktive Sessions.
2. Im Konto-Bereich (Gerät 1) prüfen: `GET /api/v1/account/devices` zeigt
   zwei Einträge.
3. Auf Gerät 1 "Von allen Geräten abmelden" auslösen
   (`POST /api/v1/auth/logout-all`).

**Erwartetes Ergebnis:**
- Antwort `200 { ok: true }`, Set-Cookie leert die Session auf Gerät 1.
- Gerät 1: sofort ausgeloggt (Session-Cookie war eh gerade gelöscht worden).
- Gerät 2: beim nächsten Request (z. B. Seite neu laden) ebenfalls
  ausgeloggt — `GET /api/v1/me` liefert dort `401 not_authenticated`,
  obwohl auf Gerät 2 nichts aktiv unternommen wurde.
- `GET /api/v1/account/devices` (nach erneutem Login) zeigt keine der beiden
  alten Sessions mehr.

---

## 7. `POST /account/delete` — tatsächliche Kontolöschung (Passwort-Konto)

**Ziel:** Verifiziert den vollständigen, unwiderruflichen Löschvorgang für
ein Konto MIT Passwort (`currentPassword`-Bestätigung, siehe
`routes/account.ts`).

**Warum nicht automatisiert:** Jetzt mit den echten Passwörtern technisch
möglich, aber ausschließlich an `test.free`/`test.monatlich`/`test.jaehrlich`
ausführbar — und genau das darf niemals automatisiert passieren, da diese
drei Konten die Grundlage der gesamten übrigen E2E-Suite sind (u. a.
`me.e2e.test.ts`, das ein aktives Abo bei test.monatlich/jaehrlich
voraussetzt). Eine versehentliche Löschung wäre nur durch manuellen
D1-Wiederaufbau reparierbar.

**Voraussetzung:** Ein **eigens dafür angelegtes** Passwort-Konto, dessen
Löschung folgenlos ist — z. B. frisch über `POST /auth/register` anlegen
und über den Bestätigungslink verifizieren, oder ein bereits vorhandenes
Wegwerf-Konto aus einem anderen manuellen Test hier.

**Schritte:**
1. Mit dem Wegwerf-Konto einloggen.
2. Im Konto-Bereich "Konto löschen" wählen.
3. Aktuelles Passwort eingeben, Löschung bestätigen
   (`POST /api/v1/account/delete` mit `currentPassword`).

**Erwartetes Ergebnis:**
- Antwort `200 { ok: true }`, Session-Cookie wird geleert.
- `GET /api/v1/me` mit der alten Session → `401 not_authenticated`.
- Ein erneuter Login-Versuch mit derselben E-Mail (egal über welchen Weg)
  verhält sich wie bei einer komplett neuen, unbekannten Adresse (kein
  Hinweis auf das ehemalige Konto, keine Restdaten).
- Falls das Wegwerf-Konto ein (synthetisches) Abo hatte: bei Stripe wird die
  zugehörige Subscription storniert (`deleteAccountCompletely`, siehe
  `accountDeletion.ts`) — im Stripe-Dashboard prüfbar.

**Negativfall (sicher, auch automatisiert bereits abgedeckt):** Löschung
ohne Passwort bzw. mit falschem Passwort → `400 current_password_required`
oder `401 invalid_credentials`, Konto bleibt bestehen (siehe
`account.e2e.test.ts`).

---

## 8. Login-Sperre nach 5 Fehlversuchen (`423 locked`)

**Ziel:** Verifiziert den Brute-Force-Schutz aus `loginWithPassword`
(`auth/passwordAuth.ts`): nach 5 fehlgeschlagenen Versuchen innerhalb von 15
Minuten wird sowohl das betroffene Konto als auch — wichtig — **die
anfragende IP-Adresse insgesamt** für 15 Minuten gesperrt.

**Warum nicht automatisiert:** Der Fehlversuchs-Zähler läuft nicht nur pro
Konto, sondern zusätzlich pro Client-IP. Ein automatisiert ausgelöster Lock
in der CI/Testumgebung würde für 15 Minuten **alle** Logins von dieser IP
aus blockieren — auch die eigenen, korrekten Login-Erfolgstests der Suite
bei einem erneuten Lauf im selben Zeitfenster (siehe Kommentar in
`auth-password.e2e.test.ts`). Deshalb bewusst manuell, zu einem
Zeitpunkt, an dem kein anderer Login-Test von derselben IP aus läuft.

**Voraussetzung:** Ein Wegwerf-Konto oder eine garantiert nicht existierende
E-Mail-Adresse (der Zähler greift bereits, bevor geprüft wird, ob das Konto
überhaupt existiert) — **nicht** eines der drei Basis-Konten verwenden,
sonst ist deren Login für die nächsten 15 Minuten ebenfalls gesperrt.

**Schritte:**
1. `POST /api/v1/auth/login` fünfmal hintereinander mit derselben (beliebig
   gewählten, aber immer gleichen) E-Mail und einem garantiert falschen
   Passwort aufrufen.
2. Erwartetes Ergebnis je Versuch 1–4: `401 { error: "invalid_credentials",
   warn: false }` (Versuch 1–2) bzw. `warn: true` (ab Versuch 3, siehe
   `WARN_AFTER_ATTEMPTS = 3` in `passwordAuth.ts`).
3. Versuch 5: ebenfalls noch `401 invalid_credentials` (die Sperre prüft
   *vor* dem eigentlichen Versuch, ob der Zähler bereits ≥ 5 ist — beim 5.
   Versuch steht er erst bei 4).
4. Einen 6. Versuch (egal ob mit korrektem oder falschem Passwort, auch mit
   einer **anderen** E-Mail-Adresse aber dergleichen IP) auslösen.

**Erwartetes Ergebnis (6. Versuch):**
- Antwort `423 { error: "locked", retryAfterSeconds: 900 }`.
- Der 6. Versuch mit einer **anderen** E-Mail-Adresse (aber derselben IP)
  liefert ebenfalls `423 locked` — belegt, dass die IP-weite Sperre
  greift, nicht nur die Konto-Sperre.
- Ein Login mit **korrekten** Zugangsdaten (z. B. test.free) von derselben
  IP schlägt in diesem Zeitfenster ebenfalls mit `423 locked` fehl — **das
  ist der Grund, warum dieser Test nicht automatisiert in derselben Suite
  laufen darf, die auch echte Logins testet.**

**Danach:** 15 Minuten warten (`LOCKOUT_WINDOW_MS`), bis die Sperre
automatisch aufgehoben ist, bevor weitere Login-Tests (auch die
automatisierte Suite) von derselben IP aus laufen.

---

## 9. Stripe-Webhook — echte Zustellung auf ein reales Konto

**Ziel:** Verifiziert `customer.subscription.created`/`customer.subscription.updated`
mit einem ECHTEN, von Stripe zugestellten Event (nicht dem selbst signierten
Testpayload aus `billing-webhook.e2e.test.ts`), inkl. der
Trial-Verbrauchs-Markierung, der Dunning-Mail bei `past_due` und der
"payment_succeeded"-Mail beim ersten echten Kauf.

**Warum nicht (vollständig) automatisiert:** `billing-webhook.e2e.test.ts`
deckt bereits Signaturprüfung, Fehlerbehandlung und die No-Op-Fälle
automatisiert ab (siehe dort). Was bewusst offenbleibt: das tatsächliche
Schreiben einer neuen/aktualisierten Subscription-Zeile für ein reales
Konto — das würde entweder eines der drei Fixture-Konten verändern (nicht
erlaubt) oder eine verwaiste Zeile für ein Fantasie-Konto anlegen (es gibt
keine HTTP-Route, um eine `subscriptions`-Zeile wieder zu löschen).

**Schritte:**
1. Mit einem eigenen Wegwerf-Konto (test.free wurde am 18.08. gelöscht,
   siehe release-notes.txt) einen echten Testmodus-Checkout über die UI
   durchlaufen (Testkarte 4242..., siehe `e2e/api-e2e-README.md`).
2. Im Stripe-Dashboard unter Entwickler → Webhooks → (Endpoint) → Ereignisse
   prüfen, dass das `customer.subscription.created`-Event mit Status 200
   zugestellt wurde.

**Erwartetes Ergebnis:**
- `GET /api/v1/me` zeigt danach `isPro: true`, `subscription.status:
  "trialing"` (3-Tage-Trial) bzw. `"active"`.
- `hasUsedTrial: true` bleibt danach dauerhaft gesetzt, auch nach einer
  späteren Kündigung.
- Bei einem absichtlich fehlschlagenden Testkarten-Zahlungsversuch (Stripe
  bietet dafür spezielle Testkartennummern für "declined") sollte die
  Dunning-Mail ("Zahlung schlägt fehl") beim Nutzer ankommen.

**Danach aufräumen:** `POST /billing/test-reset` (siehe `e2e/api-e2e-README.md`)
funktioniert weiterhin für jedes `is_test_user=1`-Konto über `-SessionId`.
Das frühere `reset-test-free.ps1` war test.free-spezifisch vorbelegt und
ist beim Ordner-Umzug 2026-08-19 nicht mitgezogen worden (bereits vorher
als obsolet markiert, siehe dessen Datei-Kommentar).
