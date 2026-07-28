# Konzept: ImmoFuchs in Google Play & Apple App Store

Stand: 2026-07-24 · Basis: laufender Code-Stand (React/Vite-PWA, manifest.json, sw.js, package.json v1.5.2, worker/ für KI-Assistent)

## 1. Ausgangslage

ImmoFuchs ist bereits eine funktionsfähige PWA: `public/manifest.json` liefert Name, Icons (192/512, maskable), `display: standalone`, Theme-/Background-Color und Scope. `public/sw.js` (v49) cached den App-Shell, arbeitet Network-First mit Offline-Fallback und enthält bereits Push-Notification-Infrastruktur für den Zinsalarm. HTTPS ist live, ein `apple-touch-icon.png` existiert, Datenschutz- und Impressumsseiten sind vorhanden. Das ist eine ungewöhnlich gute Ausgangsbasis — der größte Teil der "PWA-Pflicht" für Store-Listings ist bereits erledigt, nicht neu zu bauen.

Zwei Randnotizen aus dem Code-Check: `package.json` steht auf `1.5.2`, während das JSON-LD in `index.html` `softwareVersion: 1.6` ausweist — vor dem Store-Listing sollte eine einzige Versionsquelle gelten, weil Stores Versionsnummern 1:1 aus dem Manifest/Bundle übernehmen. Zweitens läuft Google Analytics (GA4) mit Consent Mode v2 — das ist rechtlich sauber gelöst, muss aber in beiden Stores explizit als Datenerhebung deklariert werden (siehe Abschnitt 5).

Neu seit dem letzten Stand: Im Repo läuft parallel der Aufbau eines **KI-Assistenten** (`worker/`, Cloudflare Worker, live unter `immofuchs-assistant.engincelenk.workers.dev`). Er ruft primär Google Gemini und als Fallback Cloudflare Workers AI (Llama 3.3) auf. Das ist für die App-Store-Strategie doppelt relevant: Es ist der stärkste Kandidat, um Apples Guideline 4.2 zu erfüllen (echter interaktiver Mehrwert statt Website-Wrapper) — erzeugt aber gleichzeitig eine neue, seit November 2025 verschärfte Compliance-Pflicht (Guideline 5.1.2(i), siehe Abschnitt 3.0). Laut Sprint-Plan ist das DSGVO/AVV-Go-Live-Gate für echte Nutzerdaten ohnehin noch offen — dieser Punkt und die Apple-Konformität sollten zusammen gelöst werden, nicht getrennt.

Google Play und Apple sind technisch und rechtlich zwei komplett unterschiedliche Baustellen. Google akzeptiert eine PWA nahezu 1:1 über eine **Trusted Web Activity (TWA)** — die App bleibt die Live-Website, nur eine dünne Android-Hülle kommt hinzu. Apple akzeptiert das nicht: eine reine "Website im WebView" verstößt gegen **Guideline 4.2 (Minimum Functionality)** und wird im Review regelmäßig abgelehnt. Für iOS braucht es echten nativen Mehrwert, keinen reinen Wrapper.

Empfehlung: **Google Play zuerst** (schnell, günstig, geringes Risiko), **Apple als eigene Phase danach**, mit klarer Ja/Nein-Entscheidung vor Investition in native Zusatzfeatures.

---

## 2. Phase 1 — Google Play (Trusted Web Activity)

**Ziel:** ImmoFuchs als Android-App im Play Store, technisch nur ein Verifizierungs- und Verpackungsschritt um die bestehende PWA herum.

### Meilenstein 1.1 — PWA-Härtung (Code-technisch, klein)
- Lighthouse-PWA-Score prüfen, Ziel ≥ 80 (Bubblewrap-Voraussetzung).
- Versionsquelle vereinheitlichen (`package.json` vs. JSON-LD, siehe oben).
- Maskable-Icon-Safe-Zone am `icon-512.png` visuell verifizieren (Android beschneidet bis zu 20 % am Rand).

### Meilenstein 1.2 — Digital Asset Links (Architektur-technisch, klein)
Google verifiziert die Domain-Inhaberschaft über eine statische Datei unter `https://immofuchs.info/.well-known/assetlinks.json`. Das ist eine neue Route/Datei im `public/`-Ordner (analog zu `robots.txt`), kein Refactor bestehender Logik. Die CSP muss dafür nicht angepasst werden, da es eine reine GET-Auslieferung ist.

### Meilenstein 1.3 — Bubblewrap-Projekt & Signing
- Bubblewrap (Node/JDK/Android-SDK) initialisieren, Android-Icons (adaptive icon) generieren, Signing-Key erzeugen und sicher hinterlegen.
- `.aab` (Android App Bundle) bauen — Google verlangt seit 2021 zwingend AAB statt APK.
- Push-Notification-Test: Der bestehende Zinsalarm läuft über Web Push im Chrome-Unterbau der TWA und sollte ohne Codeänderung funktionieren, muss aber einmal auf einem echten Android-Gerät verifiziert werden.

### Meilenstein 1.4 — Play Console & Listing
- Google Play Developer Account (einmalig 25 $).
- Store-Eintrag: Screenshots, Kurz-/Langbeschreibung, Content-Rating-Fragebogen, **Data-Safety-Formular** (GA4 als Datenerhebung deklarieren, siehe Abschnitt 5).
- Rollout-Reihenfolge: interner Test → geschlossener Test → Produktion.

**UI-technisch nötig:** nichts Neues — Safe-Area-Handling und Theme-Color sind bereits im Code (`index.html`, `.has-safe-bottom`).
**Aufwand/Risiko:** niedrig. Größtes Risiko ist ein zu niedriger Lighthouse-Score, der sich mit Bordmitteln beheben lässt.

---

## 3. Phase 2 — Apple App Store (Machbarkeits-Check vor Umsetzung)

**Ziel:** Klären, ob und mit welchem Zusatzaufwand ImmoFuchs Guideline 4.2 übersteht, bevor Zeit in die Umsetzung fließt.

### 3.0 Guideline-Check — Vorgabe, Ist-Zustand, notwendiger Schritt

Quelle: offizielle App Review Guidelines (developer.apple.com/app-store/review/guidelines), Stand 2026-07-24. Relevant sind vor allem 4.2, 2.1, 5.1.1 und die im November 2025 neu eingeführte 5.1.2(i) — letztere trifft ImmoFuchs direkt wegen des laufenden KI-Assistent-Vorhabens.

| Vorgabe | Wortlaut (verdichtet) | Ist-Zustand ImmoFuchs | Notwendig für Erfüllung |
|---|---|---|---|
| **4.2 Minimum Functionality** | "Your app should include features, content and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique or 'app-like', it doesn't belong on the App Store." Apple nennt Push, Location und Sharing explizit als **nicht ausreichend**, um diese Hürde zu nehmen. | **Nicht erfüllt.** Aktuell ist ImmoFuchs technisch exakt das, was die Guideline meint: eine Website mit Manifest/Service-Worker. Der Zinsalarm (Web-Push) fällt laut Apple ausdrücklich unter "nicht ausreichend". | 1) Capacitor mit **lokal gebündelten** Assets statt Remote-URL (Grundvoraussetzung, kein Ersatz für Punkt 2). 2) Echten App-eigenen Mehrwert schaffen: der KI-Assistent ist der stärkste Kandidat — ein interaktiver, kontextbezogener Immobilien-Chat ist qualitativ etwas anderes als Safari. 3) Native Navigation (z. B. native Tab-Bar statt Web-Menü) statt 1:1-Website-Layout. 4) Optional: iOS-Widget als zusätzliches "app-like"-Signal. |
| **2.1 App Completeness** | App muss vollständig funktionieren, Backend-Services müssen beim Review live erreichbar sein, nicht-offensichtliche Features müssen in den Review Notes erklärt werden. | **Größtenteils erfüllbar.** Rechner sind vollständig, keine Platzhalter. Der Assistant-Worker ist bereits live. Risiko: Die serverseitigen Limits (`DAILY_REQUEST_LIMIT=20`, `IP_DAILY_LIMIT=60`) könnten einen Apple-Reviewer während des Tests aussperren. | Vor Einreichung: Review Notes mit Erklärung des Assistenten schreiben, `ASSISTANT_ENABLED` während der Reviewphase sicher auf "true" belassen, ggf. Rate-Limit-Ausnahme für Testzwecke einplanen. |
| **5.1.1 Data Collection & Consent** | Einwilligung nötig, auch für anonymisierte Daten. Keine versteckte oder erzwungene Zustimmung. | **Grundlage vorhanden.** GA4 läuft bereits mit Consent Mode v2 (Opt-in-Banner, `index.html`), localStorage ist technisch notwendig und korrekt deklariert. | Denselben Consent-Flow im nativen Wrapper 1:1 nachbilden (nicht nur auf der Website vorhanden), App Privacy Nutrition Label in App Store Connect ausfüllen. |
| **5.1.2(i) Data Sharing mit Drittanbietern/KI** *(neu seit 13./14.11.2025)* | "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." | **Nicht erfüllt — aktiv zu klären.** Der KI-Assistent schickt Nutzereingaben an Google Gemini (primär) bzw. Cloudflare Workers AI/Llama (Fallback). Das ist laut Sprint-Plan aktuell noch vor dem "Go-Live-Gate" für echte Nutzerdaten (DSGVO/AVV offen). | Vor App-Store-Launch: (a) explizite Einwilligung **vor der ersten Assistenten-Nutzung** einholen, nicht nur in der Datenschutzerklärung vergraben, (b) Google Gemini und Cloudflare Workers AI namentlich als Empfänger nennen, (c) im App Privacy Label als Datenweitergabe an Drittanbieter/KI deklarieren, (d) mit dem ohnehin offenen DSGVO/AVV-Punkt aus dem Sprint-Plan zusammen lösen. |
| **3.1 Payments** | Nur relevant bei Freischaltung von Inhalten gegen Bezahlung. | **Nicht anwendbar.** ImmoFuchs ist komplett kostenlos, keine In-App-Käufe. | Keine Maßnahme nötig. |
| **4.8 Login Services** | Nur relevant bei Drittanbieter-Login (z. B. Google/Facebook-Sign-in). | **Nicht anwendbar.** Kein Login-System vorhanden. | Keine Maßnahme nötig. |

**Kernaussage:** Der reine Wrapper-Ansatz scheitert an 4.2 — das war schon im ursprünglichen Konzept klar. Neu ist die Erkenntnis aus dem Guideline-Check, dass ImmoFuchs mit dem KI-Assistenten bereits an einem Feature baut, das 4.2 tatsächlich lösen könnte — aber genau dieses Feature erzeugt gleichzeitig das schärfste Compliance-Risiko (5.1.2(i)). Beide Punkte hängen technisch und rechtlich zusammen und sollten nicht getrennt betrachtet werden.

### 3.1 Klarstellung: User-Management und Kommerzialisierung sind NICHT die Lösung

Keine der sieben Guidelines aus 3.0 verlangt Accounts oder Bezahlfunktionen. 4.2 (der eigentliche Blocker) ist eine Frage von UI/Funktionstiefe/nativer Erfahrung — nicht von Geschäftsmodell oder Login. Guideline 3.1 (In-App Purchase) greift ausschließlich, *wenn* Inhalte gegen Bezahlung freigeschaltet werden; sie zwingt niemanden dazu, überhaupt etwas zu verkaufen. Kostenlose Utility-Apps ohne jeden Login sind im App Store Alltag (Taschenrechner, Konverter, Umrechner) — solange sie "app-like" genug sind.

Beides würde hier zusätzlich der bestehenden Produktpositionierung widersprechen: Titel und Cookie-Banner versprechen aktuell explizit "kostenlos, ohne Anmeldung" bzw. "Kein Server empfängt Ihre Daten" (`index.html`). Ein Login-System bräuchte zwingend ein Backend mit Nutzerdaten — das kollidiert mit der harten Architekturregel "Persistenz: localStorage — kein Backend" und würde selbst neue Pflichten auslösen (Guideline 2.1 verlangt einen Demo-Account für den Reviewer, Guideline 5.1.1/5.1.2 verlangen dann deutlich mehr Einwilligungs- und Löschmechanik als heute). Kurz: User-Management und Kommerzialisierung würden neue Probleme schaffen, ohne das eigentliche 4.2-Problem zu lösen.

Falls perspektivisch echte Mehrgeräte-Funktionen (z. B. mehrere gespeicherte Objekte, geräteübergreifend) gewünscht sind, ist das eine eigenständige Produktentscheidung mit eigenem Abwägungsprozess (Nutzen vs. Bruch mit der Privacy-First-Positionierung) — kein Hebel gegen Apples Review-Anforderungen und daher hier nicht Teil des Umsetzungsplans.

### Meilenstein 2.1 — Grundsatzentscheidung Wrapper-Technologie
Zwei Optionen, unterschiedliches Risiko:
- **PWABuilder iOS-Package**: schnell erzeugt, lädt aber typischerweise die Remote-URL nach — genau das Muster, das Apple am häufigsten als "Web Clip" ablehnt.
- **Capacitor** (empfohlen): bundelt die App-Assets lokal ins native Xcode-Projekt statt sie live nachzuladen. Das ist der in aktuellen Erfahrungsberichten deutlich erfolgreichere Weg durch den Review, weil die App dann technisch nicht mehr "nur eine geladene Website" ist.

Konsequenz von Capacitor: Live-Updates der Web-App (wie jetzt per `push.ps1`) landen nicht mehr automatisch auf iOS — jede inhaltliche Änderung, die im gebundelten Teil steckt, braucht ein neues Xcode-Build + Store-Review-Zyklus. Das ist ein architektonischer Kompromiss, der vorab bewusst entschieden werden muss.

### Meilenstein 2.2 — Native Mehrwert-Features gegen Guideline 4.2
Reines Verpacken reicht laut aktueller Praxiserfahrung nicht. Realistische, zum bestehenden Produkt passende Optionen:
- **Echte APNs-Push-Notifications** für den Zinsalarm statt (bzw. zusätzlich zu) Web-Push — größter Hebel, da das Feature schon fachlich existiert und nur die native Zustellschiene fehlt (Capacitor-Push-Plugin, natives Modul).
- **KI-Assistent als natives Kernfeature ausbauen** — bereits in Arbeit (`worker/`), ist der stärkste inhaltliche Beleg für "mehr als eine Website". Voraussetzung: Consent-Flow aus 3.0 (Guideline 5.1.2(i)) muss vor App-Store-Einreichung stehen.
- **iOS-Homescreen-Widget** (WidgetKit, iOS 17+), z. B. aktueller Zinssatz/Zinsalarm-Status — deutliches "das ist mehr als eine Website"-Signal, aber eigenes natives Swift-Modul, spürbarer Zusatzaufwand.
- Offline-Fähigkeit (bereits vorhanden) als unterstützendes Argument, reicht laut Erfahrungsberichten aber allein nicht aus.

Diese Features sind der eigentliche Umsetzungsaufwand der Phase — nicht das Wrapping selbst.

### Meilenstein 2.3 — Xcode-Projekt & App Store Connect
- Apple Developer Program (99 $/Jahr). Zu klären: Account als Einzelperson oder Organisation — die Kategorie "Finance/Utilities" (siehe `manifest.json`) führt bei Apple gelegentlich zu genaueren Nachfragen zur Rechtsform; das Impressum weist ImmoFuchs aktuell als Privatperson aus.
- Capacitor-iOS-Projekt aufsetzen, native Module (Push, ggf. Widget) einbinden, Icons/Splash-Screens für alle Gerätegrößen.
- App Privacy "Nutrition Label" in App Store Connect ausfüllen (GA4- und KI-Assistent-Datenerhebung deklarieren, siehe 3.0).

### Meilenstein 2.4 — TestFlight & Review
- Beta über TestFlight, danach Einreichung.
- Puffer für Rejection-Zyklen einplanen (1–3 Runden à ca. 1–2 Wochen sind laut aktuellen Erfahrungsberichten üblich, gerade beim ersten Anlauf mit Guideline 4.2).

**Aufwand/Risiko:** deutlich höher als Google Play — sowohl wegen der nativen Zusatzfeatures als auch wegen der Review-Unsicherheit. Diese Phase sollte erst nach einer bewussten Ja/Nein-Entscheidung starten, nicht automatisch im Anschluss an Phase 1.

---

## 4. Architektur-Empfehlung

Die React/Vite-PWA bleibt Single Source of Truth. Beide Store-Wege kommen als **dünne, separate Wrapper-Projekte** hinzu (z. B. eigene Ordner/Repos für das Bubblewrap-Android-Projekt und das Capacitor-iOS-Projekt), nicht als Umbau des bestehenden `src/`. Für Android bedeutet das praktisch keine Kopplung — die TWA zeigt weiterhin auf `immofuchs.info`. Für iOS entsteht durch das Asset-Bundling eine losere Kopplung: der native Build enthält einen Snapshot des Web-Codes, der bei Content-Änderungen manuell nachgezogen werden muss.

`push.ps1` (dev/qa/prod) bleibt unverändert für den Web-Deploy zuständig; für die Stores kommen neue, eigenständige Build-Skripte hinzu (Bubblewrap-Build, Xcode-Archive) — das ist kein Ersatz, sondern eine Ergänzung des bestehenden Deploy-Workflows.

### 4.1 Laufzeitverhalten: Browser, Android (Play), iOS (App Store)

Nach der Umsetzung existieren vier parallele Zugangswege zu ImmoFuchs — keiner ersetzt den anderen:

1. **Browser** (Desktop & Mobile, jedes Betriebssystem) — unverändert die heutige Website. Jede Änderung ist nach `push.ps1 prod` sofort live.
2. **PWA-Installation per "Zum Home-Bildschirm hinzufügen"** (Safari/Chrome) — funktioniert bereits heute und bleibt komplett unabhängig von den beiden Stores bestehen; kein Nutzer verliert diese Option.
3. **Android-App im Play Store (TWA)** — ist im Kern nichts anderes als Punkt 1: eine dünne native Hülle, die weiterhin live gegen `immofuchs.info` lädt. Jede normale Web-Deployment-Änderung ist sofort auch dort sichtbar, ganz ohne neues Store-Release. Ein neues `.aab`-Upload ist nur nötig, wenn sich die Hülle selbst ändert (Icon, App-Name, Signing).
4. **iOS-App im App Store (Capacitor)** — hier ändert sich tatsächlich etwas: Das UI-/Logik-Bundle (der React-Code) wird beim Build einmal eingefroren und lokal mitgeliefert. Änderungen an Rechenformeln, UI oder Feature-Code erscheinen dort **nicht sofort**, sondern erst nach neuem Xcode-Build + App-Store-Review (Tage bis Wochen Verzögerung). Alles, was zur Laufzeit per Netzwerk nachgeladen wird — aktuelle Zinssätze (`zinsen.json`), PLZ-Lookup, KI-Assistent-Antworten vom Worker, GA4 — bleibt davon unberührt und ist auch auf iOS weiterhin so aktuell wie im Browser, weil das ganz normale Fetch-Aufrufe zur Laufzeit sind, kein Teil des eingefrorenen Bundles.

Zwei Detailpunkte, die aus dieser Aufteilung folgen:
- **Zinsalarm/Push:** Browser und Android-TWA nutzen weiterhin den bestehenden Web-Push-Code aus `sw.js` (VAPID) unverändert. iOS braucht dafür einen zusätzlichen, separaten nativen Pfad über APNs (Capacitor-Push-Plugin) — fachlich dieselbe Funktion, aber ein zweiter Code-Pfad, der parallel gepflegt werden muss.
- **Service Worker:** `sw.js` bleibt für Browser und Android unverändert aktiv. Im iOS-Capacitor-Kontext (kein echter HTTPS-Origin, sondern ein `capacitor://`-Schema) ist ein klassischer Service Worker in der Regel irrelevant — Offline-Fähigkeit ergibt sich dort ohnehin daraus, dass die Assets bereits lokal gebündelt sind.

Kurz: Eine Codebasis bleibt Single Source of Truth, aber die **Update-Geschwindigkeit unterscheidet sich pro Kanal** — Browser und Android sind weiterhin "instant", iOS bekommt einen eigenen, langsameren Release-Rhythmus für Code-/UI-Änderungen bei gleichzeitig weiterhin taggenauen Live-Daten.

---

## 5. Rechtliches & Compliance

- Datenschutzerklärung (`public/datenschutz.html`) und Impressum (`public/impressum.html`) sind vorhanden und werden in beiden Stores als Pflichtlink hinterlegt.
- GA4 läuft mit Consent Mode v2 (Opt-in) — das ist die richtige Basis, muss aber in Googles **Data Safety**-Formular und Apples **Privacy Nutrition Label** aktiv als "Analytics-Daten, mit Einwilligung" deklariert werden.
- KI-Assistent (Google Gemini, Cloudflare Workers AI): neue, eigenständige Deklarationspflicht bei Apple seit Guideline 5.1.2(i) (November 2025) — siehe Abschnitt 3.0. Sollte mit dem offenen DSGVO/AVV-Punkt aus dem Sprint-Plan gemeinsam geschlossen werden, nicht separat.
- Rechtsform-Frage für den Apple Developer Account (Einzelperson vs. Organisation) sollte vor Meilenstein 2.3 geklärt werden, insbesondere wegen der Finance-Kategorie.

---

## 6. Zusammenfassung & offene Entscheidungen

| Phase | Aufwand | Risiko | UI-Änderung | Code-Änderung | Architektur-Änderung |
|---|---|---|---|---|---|
| 1 — Google Play | gering | gering | keine | minimal (assetlinks.json) | keine |
| 2 — Apple App Store | hoch | mittel–hoch | ggf. Widget-UI, native Navigation | nativer Push, ggf. Widget-Modul, Consent-Flow für KI-Datenweitergabe | Wrapper mit Asset-Bundling, entkoppelter Update-Zyklus |

Offene Punkte, die vor dem Start geklärt werden sollten:
1. Reihenfolge bestätigen: Google Play zuerst, Apple als separate Freigabe-Entscheidung danach?
2. Für Apple: Investition in native Push/Widget tragen — ja, mit welchem Umfang?
3. KI-Assistent-Consent-Flow (Guideline 5.1.2(i)) und offenes DSGVO/AVV-Gate gemeinsam angehen — wer treibt das, bis wann?
4. Rechtsform für Apple Developer Account (Einzelperson reicht i. d. R., aber Finance-Kategorie kann Nachweise verlangen).

Alle hier skizzierten Code- bzw. Architektur-Schritte (Meilenstein 1.1–1.3, 2.1–2.3) fallen unter die Freigabepflicht aus `CLAUDE.md` — dieses Dokument ist die Grundlage für die Einzel-Freigaben, keine bereits erteilte Freigabe.
