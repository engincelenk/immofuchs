# ImmoFuchs KI-Assistent — Sprint- & Meilensteinplan

> Rolle: Scrum Master · Status: **Planungsphase — kein Code geschrieben, keine Freigabe erteilt**
> Stand: 2026-07-19
> Grundlage: [2026-07-19-ki-assistent-konzept.md](2026-07-19-ki-assistent-konzept.md) — Abschnitt 5 (Rollout-Plan) wird hier in ausführbare Sprints heruntergebrochen.
> Abgestimmt mit: Solution Architect (Abschnitt 2 des Konzepts) · Frontend/Fullstack-Dev (Abschnitt 4) · UX Designer (Abschnitt 3)

---

## Leitprinzip

**Jede Phase liefert einen funktionsfähigen Zustand aus — kein Zwischenstand, der die App instabil oder halb-fertig hinterlässt.** Die Rechner selbst (§558-Logik, Annuitätenrechnung) werden in keiner Phase angefasst — der Assistent ist additiv (siehe Konzept 4.5). Jede Phase ist einzeln über den Kill-Switch abschaltbar, falls sie nicht wie erwartet läuft.

„Funktionsfähig" heißt konkret pro Phase:

- **Phase 0:** kein Nutzer-Feature, aber ein funktionsfähiger End-to-End-Testpfad (Worker antwortet nachweislich auf eine Testanfrage, Kill-Switch nachweislich schaltbar).
- **Phase 1–3:** ein vollständiger Nutzerfluss (Chip → Chat → Antwort → Fehler-/Limit-/Offline-Zustände) für den jeweiligen Scope, produktionsreif demonstrierbar.

---

## Kapazitäts-Annahme

Kleines Team / überwiegend Einzelentwicklung mit Rollenwechsel (Architect/Dev/UX in Personalunion oder eng getaktete Abstimmung). Sprintlänge **1 Woche**, Fokus-Faktor 0.7. Diese Annahme ist ein Startwert — nach Sprint 1 mit echter Velocity kalibrieren (siehe Metriken-Abschnitt unten).

---

## Phasen-Übersicht (Meilensteine)

| Phase                                | Sprints    | Sprint Goal                                                                                            | Demo-fähig?                                |
| ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Phase 0 — Foundation                 | Sprint 1   | Infrastruktur steht, Worker antwortet, Kill-Switch funktioniert                                        | ⚙️ Technische Demo, kein Endnutzer-Feature |
| Phase 1 — Pilot                      | Sprint 2–3 | Ein Nutzer kann im Renditerechner eine echte Frage stellen und eine korrekte, sichere Antwort bekommen | ✅ Voll demo-/ausrollbar                   |
| Phase 2 — Hauptrechner-Rollout       | Sprint 4   | Alle vier Hauptrechner haben den Assistenten, gleiche Qualität wie Pilot                               | ✅ Voll demo-/ausrollbar                   |
| Phase 3 — Spezialrechner + Vergleich | Sprint 5–6 | §6-Trick, Vorfälligkeit und Merkliste-Vergleich funktionieren gleichwertig                             | ✅ Voll demo-/ausrollbar                   |

Status-Legende: ⬜ Ausstehend · 🔄 In Arbeit · ✅ Abgeschlossen · ❌ Blockiert

| Phase   | Sprint   | Status                                                                                                                                                                                                                                          | Abgeschlossen am |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Phase 0 | Sprint 1 | 🔄 In Arbeit — Code für S1.1/S1.2/S1.3 fertig (`/worker`), Typecheck + Dry-Run-Bundle grün. Live-Verifikation (Deploy, Jailbreak-Test gegen echtes Modell, Kill-Switch im Dashboard) steht noch aus — braucht Cloudflare-Login durch den Nutzer | —                |
| Phase 1 | Sprint 2 | 🔄 In Arbeit — Frontend-Komponenten fertig, Happy Path im Browser getestet                                                                                                                                                                      | —                |
| Phase 1 | Sprint 3 | 🔄 In Arbeit — i18n (5 Sprachen) + A11y-Grundausstattung + Fehlerzustand fertig; Limit/Offline/Disabled/Live-Antworten warten auf deployten Worker (Phase 0)                                                                                    | —                |
| Phase 2 | Sprint 4 | 🔄 In Arbeit — Finanzierung/Miete/Sanierung fertig integriert, im Browser getestet. Pro-Rechner-Kill-Switch nicht gebaut (siehe DoD-Hinweis)                                                                                                    | —                |
| Phase 3 | Sprint 5 | 🔄 In Arbeit — §6-Trick + Vorfälligkeit fertig integriert, im Browser getestet                                                                                                                                                                  | —                |
| Phase 3 | Sprint 6 | 🔄 In Arbeit — Merkliste-Vergleich fertig gebaut, im Browser mit 2 Objekten getestet                                                                                                                                                            | —                |

---

## Impediment Log (zu Sprint-Start bereits bekannt)

| ID     | Beschreibung                                                                                      | Kategorie        | Blockiert                                                                                            | Verantwortlich                               | Status                                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IMP-01 | BANDS-Bewertungssystem (`rate()`-Quelle)                                                          | Technisch        | —                                                                                                    | Fullstack-Dev                                | ✅ **Resolved (bereits vor Sprint-Plan-Erstellung erledigt)** — `src/utils/bands.js` enthält `rate()`/`scoreKpi()` vollständig gemäß Spec, bei Prüfung am 2026-07-19 festgestellt |
| IMP-02 | DSGVO/AVV-Klärung mit Cloudflare Inc. (und ggf. Google) nicht abgeschlossen                       | Extern/Rechtlich | **Nur** Live-Schaltung mit echten Nutzerdaten in Produktion — **kein** Blocker für Entwicklung/Tests | Product Owner / CEO-Immobilien-Rolle         | Open — **bewusste Entscheidung (2026-07-19): wird separat nach der Implementierung behandelt, nicht vor Sprint 1**                                                                |
| IMP-03 | Maskottchen-Asset liegt nur als Chat-Anhang vor, nicht im Projektordner (`public/assets/mascot/`) | Ressource        | Phase 1 UI-Politur (nicht Blocker für Funktionalität, Emoji-Platzhalter reicht für Piloten)          | UX Designer                                  | Open — niedrige Priorität                                                                                                                                                         |
| IMP-04 | System-Prompt (Konzept 2.7) ist Entwurf, noch nicht gegengetestet                                 | Prozess          | Phase 0 Abschluss                                                                                    | Solution Architect + Fullstack-Dev gemeinsam | Open                                                                                                                                                                              |

IMP-01, IMP-03, IMP-04 werden nicht "gelöst", indem man sie ignoriert — sie sind explizit als Sprint-1-Vorbedingungen unten eingeplant. **IMP-02 ist davon ausgenommen** (siehe Entscheidung oben): Entwicklung und Tests laufen mit synthetischen/eigenen Testdaten, ohne dass AVV/SCC vorher stehen müssen. Blockierend wird IMP-02 erst am **Go-Live-Gate** (siehe eigener Abschnitt unten), bevor echte Nutzerdaten an Cloudflare/Google gehen.

---

## Phase 0 — Foundation (Sprint 1)

**Sprint Goal:** _„Die technische Basis steht: Worker ist deploybar, antwortet mit einer Testanfrage korrekt, Kill-Switch schaltet nachweislich ab — bevor ein einziges UI-Element für Endnutzer sichtbar wird."_

### Vorbedingung

- ~~IMP-01 (BANDS)~~ — bereits erledigt, kein eigener Sprint 0a nötig (siehe Impediment Log oben).
- IMP-02 (DSGVO/AVV) ist **keine** Vorbedingung für Sprint 1 — wird laut Entscheidung 2026-07-19 separat nach der Implementierung behandelt. Sprint 1 arbeitet mit Test-/Dummy-Daten gegen Staging, das ist ohne AVV zulässig. Siehe Go-Live-Gate am Ende dieses Dokuments.

### Stories

**S1.1 — Cloudflare Worker Grundgerüst** (Solution Architect + Fullstack-Dev) — ✅ Code fertig

- `/worker`-Ordner, eigenes `package.json`, `wrangler.toml` (Konzept 2.10)
- HTTP Handler `POST /api/assistant` (`worker/src/index.ts`), Input-Validator (`validator.ts`, Schema-Check), Rate Limiter via KV (`rateLimiter.ts`, Konzept 2.4)
- Akzeptanzkriterium: Worker lokal via `wrangler dev` erreichbar, liefert strukturierte Response auf Test-Payload — **Typecheck + `wrangler deploy --dry-run` grün, echter `wrangler dev`-Test steht noch aus (braucht `wrangler login` + KV-Namespace-ID durch den Nutzer)**

**S1.2 — Model Router + System-Prompt** (Solution Architect) — ✅ Code fertig, ⬜ Live-Test offen

- Sprach-Routing DE/EN → Workers AI, TR/ZH/HI → Gemini (`modelRouter.ts`, Konzept 2.8)
- System-Prompt 1:1 aus Konzept 2.7 in `systemPrompt.ts`, Output-Filter mit Verbotsmuster-Liste in `outputFilter.ts` (Konzept 2.9)
- Akzeptanzkriterium: Output-Filter blockt mind. 2 bewusst provozierte Regelverstöße im Test — **noch nicht gegen ein echtes Modell verifiziert, nur Regex-Logik selbst ist fertig.** Manuelles Testszenario dafür in `worker/README.md` Punkt 5 vorbereitet.

**S1.3 — Kill-Switch + Rate-Limit** (Fullstack-Dev) — ✅ Code fertig, ⬜ Live-Test offen

- `ASSISTANT_ENABLED` Env-Var → 503 bei `false` (in `index.ts` geprüft, Umschaltweg ohne Redeploy in `worker/README.md` dokumentiert: Cloudflare-Dashboard-Variable, nicht `wrangler.toml`)
- 20 Anfragen/Tag/Session, KV-Zähler, UTC-Tagesgrenze (`rateLimiter.ts`)
- Akzeptanzkriterium: Umschalten der Env-Var ohne Redeploy nachweisbar, 21. Anfrage liefert 429 — **Logik steht, Live-Verifikation braucht Deploy**

> **S1.4 entfällt für Sprint 1.** DSGVO/AVV-Klärung ist laut Entscheidung 2026-07-19 kein Sprint-1-Task mehr, sondern ein separater Track, der parallel zur Entwicklung angestoßen werden kann, aber nicht muss — siehe Go-Live-Gate.

### Definition of Done — Phase 0

- [x] Worker deployed, reagiert auf Testanfrage mit korrektem JSON-Contract (Konzept 2.6) — **live bestätigt** unter `https://immofuchs-assistant.engincelenk.workers.dev`, echte Modell-Antwort inkl. `tier` erhalten
- [ ] Kill-Switch getestet (an/aus, kein Redeploy nötig) — Code fertig, **Dashboard-Klicktest durch den Nutzer noch ausstehend** (kann nicht automatisiert werden)
- [x] Rate-Limit getestet (429 bei Überschreitung) — **live bestätigt, aber mit Bugfix unterwegs:** ursprüngliche KV-Lösung hat beim ersten Live-Test das Limit NICHT durchgesetzt (21/21 Anfragen kamen durch, Ursache: KV Eventual-Consistency/Negative-Cache). Behoben durch Umstieg auf Durable Object (`worker/src/sessionRateLimiter.ts`) — zweiter Live-Test danach korrekt: 1-20× `200`, 21. Anfrage `429`
- [x] System-Prompt gegen Missbrauchsversuche manuell getestet, Output-Filter greift nachweislich — **live bestätigt**, Jailbreak-Versuch wich korrekt aus, keine Kaufempfehlung
- [x] IMP-01 (BANDS) auf „Resolved" — **IMP-02 (DSGVO/AVV) ist kein Bestandteil dieser DoD**, siehe Go-Live-Gate
- [x] Kein UI-Code im Frontend — Phase 0 ist rein Backend/Infra (bestätigt: nur `/worker` neu, `git status` zeigt keine Änderung an `src/`)

**Zusammenfassung:** Worker ist deployed und live durchgetestet (Happy Path, Validierung, Output-Filter, CORS, Rate-Limit — alle bestätigt). Ein echter Bug wurde dabei gefunden und behoben: Cloudflare KV ist für einen exakten Tages-Zähler ungeeignet (Eventual Consistency), die Architektur wurde auf ein Durable Object pro Session umgestellt (siehe `worker/README.md` für Details). Sprach-Routing DE/EN läuft vollständig; TR/ZH/HI ist technisch verifiziert (schaltet korrekt zu Gemini), scheitert aber noch am fehlenden `GEMINI_API_KEY` — kein Bug, nur ausstehende Konfiguration. Einziger noch offener Punkt: der Kill-Switch-Dashboard-Klicktest, den nur der Nutzer selbst durchführen kann.

### Sprint Review — Demo-Skript

Technische Demo (kein Endnutzer-UI): Terminal/Postman-Request an den Worker mit Beispiel-Kontext (Renditerechner-Werte) → Antwort erscheint, Ampel-Tier korrekt, Kill-Switch live umgeschaltet → 503, zurückgeschaltet → wieder normal.

---

## Phase 1 — Pilot: Renditerechner (Sprint 2–3)

**Sprint Goal (Sprint 2):** _„Ein Nutzer sieht im Renditerechner den Assistant-Chip, kann den Erstkontakt-Hinweis bestätigen und eine Vorschlag-Frage stellen — die Antwort kommt vom echten Worker an."_

**Sprint Goal (Sprint 3):** _„Alle Fehler-, Limit-, Offline- und Deaktiviert-Zustände sind abgedeckt, Screenreader/Tastatur-Bedienung funktioniert, Übersetzungen in allen 5 Sprachen sind vollständig — der Pilot ist ausrollbar."_

### Stories Sprint 2 (Happy Path)

**S2.1 — `AssistantChip.jsx`** (Frontend-Dev, Vorlage: Konzept 4.3a)

- First-Seen-Pulse-Logik, `localStorage`-Flag `if_assistant_discovered`, `prefers-reduced-motion` respektiert
- Nur additiv am Ende der Renditerechner-Ergebnis-Sektion eingehängt (Konzept 4.5)

**S2.2 — `useAssistant.js` Hook** (Frontend-Dev, Vorlage: Konzept 4.3)

- Fetch-Logik, Session-ID via `crypto.randomUUID()`, Status-Maschine (`idle|loading|error|limit|offline|disabled`)
- `verlauf` rein clientseitig, max. 3 Turns (Kostenbegrenzung)

**S2.3 — `assistantContext.js`** (Frontend-Dev + Solution Architect)

- `ASSISTANT_FIELDS.renditerechner` Mapping (Konzept 4.4), nur relevante Felder + BANDS-Ergebnis, keine PII

**S2.4 — `AssistantSheet.jsx` + `ChatBubble.jsx` + `PrivacyIntro.jsx`** (Frontend-Dev, Vorlage: UX 3.3/3.6)

- Bottom-Sheet (Mobile) / Side-Panel (Desktop ≥1024px), Fokus-Trap, `role="dialog"`, `aria-modal`
- Erstkontakt-Screen nur einmalig, Vorschlag-Chips aus Konzept 3.9 für Renditerechner

**S2.5 — `SuggestedQuestionChip.jsx`** (Frontend-Dev + UX Designer)

- Ampel-abhängige Chip-Auswahl (rot → „Was kann ich verbessern?", grün → „Was bedeutet das konkret?")

### Stories Sprint 3 (Härtung, Zustände, A11y, i18n)

**S3.1 — Fehler-/Limit-/Offline-/Disabled-Zustände** (Frontend-Dev, Vorlage: UX 3.3 Zustandsliste)

- Jeder der 5 Sonderzustände als eigene Bubble/Variante, kein Tech-Jargon, kein Stacktrace sichtbar

**S3.2 — Accessibility-Durchgang** (UX Designer + Frontend-Dev)

- Checkliste aus Konzept 3.8 komplett abarbeiten (Kontrast, Tastatur, `aria-live`, Fokusring, kein Hover-only)

**S3.3 — i18n-Vervollständigung** (Frontend-Dev)

- Alle neuen UI-Strings in `src/i18n/translations.js`, alle 5 Sprachblöcke (de/en/tr/zh/hi)

**S3.4 — Manuelle Testszenarien** (gesamtes Trio, Vorlage: Konzept 4.8)

- Alle 5 Szenarien durchspielen (Chip-Timing, Erstkontakt-Einmaligkeit, Offline/Timeout, Limit, Sprachwechsel im offenen Chat)

### Definition of Done — Phase 1

- [ ] Nutzer kann im Renditerechner eine Frage stellen und eine korrekte, sichere Antwort erhalten (End-to-End gegen echten Worker aus Phase 0) — **UI-seitig fertig und im Browser getestet, aber ohne deployten Worker nur bis zum Error-Zustand verifizierbar** (siehe unten)
- [x] Alle 7 Zustände aus UX 3.3 (Loading/Leer/Fehler/Limit/Offline/Deaktiviert/Befüllt) sind in `AssistantSheet.jsx`/`ChatBubble.jsx` gebaut — Loading/Leer/Fehler/Befüllt manuell im Browser bestätigt, Limit/Offline/Deaktiviert nur code-seitig (kein Worker zum Live-Auslösen)
- [x] Accessibility-Checkliste (Konzept 3.8) — `role="dialog"`, `aria-modal`, Fokus-Trap, `Escape` schließt (im Browser getestet), `aria-live="polite"`, Fokusring `var(--ca)` 2px, `inert` auf geschlossenem Sheet, `prefers-reduced-motion` respektiert. Farbkontrast nicht mit Tool geprüft (wiederverwendet bestehende, bereits geprüfte BANDS-/App-Farben)
- [x] Alle Texte in 5 Sprachen vorhanden (`src/i18n/assistant.js`, de/en/tr/zh/hi) — tr/zh/hi sind Best-Effort-Übersetzungen, vor Live-Schaltung von Muttersprachlern gegenlesen lassen
- [x] Bestehende Renditerechner-Logik unverändert — nur Imports + ein neuer IIFE-Block am Ende der Ergebnis-Sektion in `Renditerechner.jsx` ergänzt, kein bestehender Berechnungscode angefasst (`npm run build` erfolgreich, 71 statt 62 Module)
- [ ] Kill-Switch für den Renditerechner-Assistenten einzeln testbar — Code vorhanden (Worker `ASSISTANT_ENABLED` → `disabled`-Status im Chat), Live-Test braucht deployten Worker
- [ ] Manuelle Testszenarien (4.8) alle grün — Chip-Timing, Erstkontakt-Einmaligkeit, Fehlerzustand+Retry, Escape/Close manuell im Browser bestätigt (Mobile 375px + Desktop 1280px, Side-Panel-Breakpoint korrekt). Offline/Limit/Sprachwechsel-im-offenen-Chat noch nicht live testbar ohne Worker

**Zusammenfassung:** Sprint 2 (Happy Path) und Sprint 3 (Härtung/A11y/i18n) sind in diesem Schritt gemeinsam umgesetzt worden, da sie architektonisch zusammenhängen. Frontend-Code ist vollständig und im Dev-Server manuell verifiziert (`npm run dev`, Mobile- und Desktop-Viewport). Was für den vollen Phase-1-Abschluss noch fehlt, hängt ausschließlich an Phase 0: ohne deployten Worker (`worker/README.md`, Cloudflare-Login durch den Nutzer) lassen sich Limit/Offline/Disabled-Zustände und echte Modell-Antworten nicht live auslösen — nur der Error-Zustand ist schon jetzt sichtbar (Fetch gegen nicht konfigurierte `VITE_ASSISTANT_URL` schlägt sauber fehl, Retry-Button erscheint).

### Sprint Review — Demo-Skript

Live im Browser (Mobile-Viewport): Renditerechner ausfüllen → Chip erscheint mit Pulse → antippen → Datenschutz-Hinweis bestätigen → Vorschlag-Chip antippen → echte Antwort mit Ampel-Bezug erscheint → Folgefrage stellen → Sheet schließen → Chip bleibt bestehen. Zusätzlich: Flugmodus aktivieren → Offline-Zustand zeigen.

### Vor Rollout-Freigabe (Gate zwischen Phase 1 und Phase 2)

Reale Kosten, Antwortqualität (bes. TR/ZH/HI-Pfad) und Missbrauchsverhalten am Freitextfeld werden am Piloten beobachtet, **bevor** Phase 2 startet (Konzept Abschnitt 5). Dieses Gate ist bewusst kein Sprint, sondern ein Beobachtungszeitraum — Dauer je nach echtem Traffic, Vorschlag: mind. 1–2 Wochen produktiver Nutzung.

---

## Phase 2 — Rollout Hauptrechner (Sprint 4)

**Sprint Goal:** _„Finanzierungs-, Mieterhöhungs- und Sanierungsrechner haben denselben Assistenten wie der Pilot — ohne strukturellen Umbau, reines Config-Mapping."_

### Stories

**S4.1 — Config-Mapping für 3 Rechner** (Frontend-Dev)

- `ASSISTANT_FIELDS.finanzierung`, `.miete`, `.sanierung` ergänzen (Konzept 4.4) — kein neuer Komponentencode nötig, da `AssistantChip`/`AssistantSheet` generisch gebaut wurden (Phase 1)

**S4.2 — Vorschlag-Chips pro Rechner** (UX Designer)

- Rechnerspezifische Fragen aus Konzept 3.9 einbauen, i18n für alle 5 Sprachen

**S4.3 — Integration in die drei Rechner-Views** (Frontend-Dev)

- `AssistantChip` additiv am Ende der Ergebnis-Sektion von `Finanzierung.jsx`, `Miete.jsx`, `Sanier.jsx` (Konzept 4.5) — keine Änderung an §558-Logik oder Annuitätenberechnung

**S4.4 — Regressionscheck Phase 1** (gesamtes Trio)

- Sicherstellen, dass der Renditerechner-Assistent durch die Erweiterung nicht beeinträchtigt wurde (geteilte Komponenten)

### Definition of Done — Phase 2

- [x] Alle vier Hauptrechner haben den Assistant-Chip, gleiches Verhalten wie Pilot — im Browser bestätigt (Finanzierung/Miete/Sanierung, je Mobile-Viewport)
- [x] Keine Duplikation von `AssistantSheet`/`ChatBubble`-Logik — `AssistantWidget` unverändert wiederverwendet, nur `kontext`/`suggested`/`contextLabel`-Props unterscheiden sich pro Rechner
- [x] Manuelle Testszenarien (4.8) für alle drei neuen Rechner durchgespielt — Chip erscheint, Sheet öffnet mit korrektem Kontext-Tag und rechnerspezifischen Vorschlag-Chips
- [ ] Kill-Switch weiterhin pro Rechner-Key einzeln schaltbar — Kill-Switch ist aktuell global (ein `ASSISTANT_ENABLED` für den ganzen Worker), **kein Pro-Rechner-Kill-Switch implementiert** — Abweichung vom ursprünglichen Sprint-Plan-Wortlaut, siehe Hinweis unten
- [ ] Kosten-/Fehlerraten-Monitoring — kann erst nach echtem Deploy beobachtet werden (Phase 0 Live-Verifikation offen)

> **Hinweis:** „Kill-Switch pro Rechner-Key" war im Sprint-Plan vorgesehen, aber nicht Teil der Worker-Spezifikation aus Konzept 2.8 (dort nur ein globaler `ASSISTANT_ENABLED`). Nicht nachgerüstet, um keine Scope-Erweiterung ohne Rücksprache vorzunehmen — bei Bedarf separat nachtragen (z. B. `ASSISTANT_ENABLED_<RECHNER>`-Vars).

### Sprint Review — Demo-Skript

Kurzer Rundgang durch alle vier Rechner: gleicher Flow, unterschiedliche Vorschlag-Chips, unterschiedlicher Kontext in der Antwort sichtbar.

---

## Phase 3 — Spezialrechner + Merkliste-Vergleich (Sprint 5–6)

**Sprint Goal (Sprint 5):** _„§6-Trick- und Vorfälligkeitsrechner haben den Assistenten trotz abweichender State-Struktur — inklusive des dafür nötigen kleinen Umbaus."_

**Sprint Goal (Sprint 6):** _„Nutzer können 2–5 Merkliste-Objekte gemeinsam einordnen lassen — neuer Einstiegspunkt, eigener Vergleichs-Flow."_

### Stories Sprint 5

**S5.1 — Lokale States zugänglich machen** (Solution Architect + Frontend-Dev) — ✅ mit Korrektur gegenüber Plan

- **Befund beim Umsetzen:** `Vorfaelligkeit.jsx` nutzt entgegen der ursprünglichen Konzept-Annahme **keinen echten separaten React-State** — die `vfe*`-Felder werden über `set("vfeXyz", …)` in denselben globalen `d`-Context geschrieben wie alle anderen Rechner. Damit reicht dort das normale `ASSISTANT_FIELDS`-Mapping wie in Phase 2, kein Umbau nötig.
- **Nur `SteuerTrick.jsx`** führt echten lokalen `useState` (`ls`, `gst`, `grd`) unabhängig von `d`. Dafür wurde **kein** zweiter Pfad in `buildAssistantContext()` gebaut, sondern der Kontext direkt inline in der Komponente als einfaches Objekt zusammengesetzt (`{lohnsteuer, grenzsteuersatzProzent, ...}`) — einfacher als geplant, weil `buildAssistantContext()` ohnehin nur ein dünner Objekt-Filter ist, den man für einen einzelnen Rechner nicht zwingend braucht.
- Keine Änderung an der Berechnungslogik in beiden Dateien (nur Imports + additiver Block am Ende der Ergebnis-Sektion).

**S5.2 — Integration + Vorschlag-Chips** (Frontend-Dev + UX Designer) — ✅

- `AssistantWidget` in `Vorfaelligkeit.jsx` (nur im berechneten Fall, nicht im „kostenlos kündbar"-Sonderfall — bewusst nicht mitgebaut, um Scope zu begrenzen) und `SteuerTrick.jsx` (nur im validen Zustand) eingehängt.

### Stories Sprint 6

**S6.1 — Merkliste-Vergleichs-UI** (UX Designer + Frontend-Dev, Vorlage: Konzept 3.3a) — ✅

- Checkbox „Zum Vergleich hinzufügen" pro Objekt-Karte in `Merkliste.jsx` (max. 5, `MAX_COMPARE`-Konstante)
- Button „🦊 Objekte vergleichen (n)" ab ≥2 ausgewählten Objekten, fixiert am unteren Bildschirmrand
- Datenschutz-Erstkontakt wird geräteweit geteilt (`PRIVACY_SEEN_KEY` aus `AssistantWidget.jsx` exportiert und in `Merkliste.jsx` wiederverwendet) — einmal bestätigt gilt für Rechner-Chips **und** Vergleichsmodus

**S6.2 — `vergleichsObjekte`-Payload + Worker-Anpassung** (Solution Architect + Frontend-Dev) — ✅

- War in Konzept 2.6/Worker-Validator (`worker/src/validator.ts`) bereits seit Sprint 1 vorbereitet, keine Worker-Änderung nötig
- `useAssistant.js`/`AssistantSheet.jsx`/`AssistantWidget.jsx` um `vergleichsObjekte`-Parameter erweitert (nur mitgeschickt, wenn nicht leer)
- Kontext-Filterung pro Objekt nutzt dieselbe `ASSISTANT_FIELDS`-Tabelle wie die Einzel-Rechner (Datensparsamkeit — nur relevante Felder je `tab`, keine PII, da `d` ohnehin keine Namens-/Adressfelder kennt)

**S6.3 — Eigene Vorschlag-Chips für Vergleichsmodus** (UX Designer) — ✅

- „Welches lohnt sich am meisten?", „Größter Unterschied?" — alle 5 Sprachen in `src/i18n/assistant.js`

### Definition of Done — Phase 3

- [x] §6-Trick- und Vorfälligkeitsrechner haben vollwertigen Assistenten — im Browser bestätigt, beide zeigen Chip mit korrektem Kontext-Tag
- [x] Merkliste-Vergleich funktioniert für 2–5 Objekte, eigener Einstiegspunkt getrennt vom Rechner-Chip — im Browser mit 2 gespeicherten Objekten (Rendite + Finanzierung) getestet, Compare-Sheet öffnet mit „Bezieht sich auf: Objektvergleich" und den beiden Vergleichs-Vorschlag-Chips
- [ ] Kosten-Impact des größeren Kontext-Payloads — kann erst nach echtem Deploy beobachtet werden
- [x] Alle sechs Rechner + Vergleichsmodus manuell getestet (Chip-Erscheinen, Sheet-Öffnen, Kontext-Tag, Vorschlag-Chips) — echte Modell-Antworten weiterhin nur nach Worker-Deploy prüfbar
- [x] Voller Ziel-Scope aus Konzept 1.1 UI-seitig erreicht — alle sechs Rechner + Merkliste-Vergleich haben den Assistenten

### Sprint Review — Demo-Skript

§6-Trick-Rechner: Frage zum lokalen State stellen, korrekte Antwort zeigt Zugriff auf `ls/gst/grd`. Merkliste: 2+ Objekte markieren, „Objekte vergleichen" antippen, Vergleichsantwort zeigt objektübergreifende Einordnung. (Beides UI-seitig verifiziert — inhaltliche Antwortqualität erst nach Worker-Deploy prüfbar.)

---

## Go-Live-Gate (nicht an einen Sprint gebunden)

Entwicklung und Tests (Sprint 1–6) laufen unabhängig von der DSGVO/AVV-Klärung — mit Test-/Dummy-Daten in Staging ist das unproblematisch. **Bevor jedoch eine Phase mit echten Nutzerdaten live geschaltet wird** (erstmals relevant am Ende von Phase 1, dem Piloten), muss IMP-02 auf „Resolved" stehen:

- [ ] AVV mit Cloudflare Inc. abgeschlossen
- [ ] AVV mit Google abgeschlossen (falls Gemini-Pfad live geht)
- [ ] Drittlandtransfer-Grundlage geklärt (DPF-Zertifizierung geprüft oder SCC vorhanden), ggf. EU-Region-Einschränkung für Workers-AI-Inferenz aktiviert
- [ ] Datenschutzerklärung ergänzt
- [ ] VVT-Eintrag „KI-Assistent" ergänzt

Dieses Gate gilt pro Phase erneut, sobald diese live geht — wird aber inhaltlich nur einmal bearbeitet (die Klärung mit Cloudflare/Google deckt alle Phasen ab, nicht phasenweise neu). Verantwortlich: Product Owner / CEO-Immobilien-Rolle, außerhalb der Sprint-Kapazität des Dev-Teams.

---

## Rollen-Verantwortung je Phase (RACI, verkürzt)

| Baustein                                             | Solution Architect       | Fullstack-Dev | UX Designer          |
| ---------------------------------------------------- | ------------------------ | ------------- | -------------------- |
| Worker/Infra (Phase 0)                               | **R**                    | **R**         | —                    |
| System-Prompt & Sicherheitsnetz                      | **R**                    | C             | —                    |
| Komponenten (Chip/Sheet/Bubble)                      | C                        | **R**         | **A** (Spec-Vorgabe) |
| Vorschlag-Chips & Copy                               | C                        | I             | **R**                |
| Accessibility                                        | I                        | **R**         | **R**                |
| Kontext-Mapping pro Rechner                          | **A** (Datensparsamkeit) | **R**         | —                    |
| DSGVO/AVV (Go-Live-Gate, außerhalb Sprint-Kapazität) | **A**                    | I             | —                    |
| Merkliste-Vergleich (Phase 3)                        | **R** (API)              | **R** (UI)    | **R** (Flow)         |

R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## Metriken & Retro-Kadenz

- Nach jedem Sprint: Sprint Health Report (Velocity geplant/abgeschlossen, Sprint Goal erreicht ja/nein, offene Impediments)
- Retro nach Sprint 1 (Phase-0-Abschluss) und nach Sprint 3 (Phase-1-Abschluss) verpflichtend — Rollout-Entscheidung für Phase 2 hängt an den dort gesammelten Erkenntnissen (Kosten, Antwortqualität, Missbrauchsfälle)
- Velocity-Kalibrierung: Nach Sprint 1 die Kapazitäts-Annahme (Sprintlänge/Fokus-Faktor) mit echten Zahlen überschreiben

---

## Offene Freigabe-Punkte (vor Sprint-1-Start zu klären)

Laut CLAUDE.md-Regel „Approval-Pflicht" ist mit diesem Plan **noch keine Code-Zeile freigegeben**. Vor dem ersten Sprint braucht es explizite Bestätigung zu:

1. Start mit Sprint 0a (BANDS-System) vor Sprint 1, oder BANDS in Sprint 1 mit aufnehmen (Kapazität sprengt vermutlich den Sprint)?
2. Sprintlänge/Kapazitäts-Annahme oben bestätigen oder anpassen?

_(DSGVO/AVV-Klärung ist laut Entscheidung 2026-07-19 kein Sprint-1-Thema mehr — siehe Go-Live-Gate.)_

---

## Gesamtstatus (Stand 2026-07-19, nach Sprint 1–6 in einem Durchlauf)

Auf Nutzerwunsch wurden alle sechs Sprints (Phase 0–3) direkt hintereinander umgesetzt, statt einzeln freizugeben. **UI-/Code-seitig ist der volle Ziel-Scope aus Konzept 1.1 fertig:**

- Alle sechs Rechner (Rendite, Finanzierung, Miete, Sanierung, §6-Trick, Vorfälligkeit) + Merkliste-Objektvergleich haben den Assistenten
- Worker-Code (Validierung, Rate-Limit, Kill-Switch, Model-Router, System-Prompt, Output-Filter) vollständig, typsicher, bündelt fehlerfrei
- `npm run build` durchgehend grün, alle Integrationen manuell im Dev-Server (Mobile + Desktop) durchgeklickt

**Was für den echten Go-Live noch fehlt — beides liegt außerhalb dessen, was in dieser Session automatisierbar war:**

1. **Worker-Deploy** (`worker/README.md`) — braucht `wrangler login` mit deinem Cloudflare-Konto. Erst danach sind echte Modell-Antworten, Rate-Limit-429, Kill-Switch-503 und der Jailbreak-Test gegen ein echtes Modell verifizierbar (bisher nur der Fehlerzustand sichtbar, weil kein Worker erreichbar ist).
2. **Go-Live-Gate** (DSGVO/AVV) — bewusst zurückgestellt, siehe eigener Abschnitt oben. Blockiert nur die Live-Schaltung mit echten Nutzerdaten, nicht Entwicklung/Tests.

Kleinere bekannte Lücken (nicht blockierend, für spätere Sessions notiert):

- Kein Pro-Rechner-Kill-Switch (nur global) — siehe Phase-2-DoD-Hinweis
- `Vorfaelligkeit.jsx`: Assistent nur im normal berechneten Fall eingebaut, nicht im „§489 kostenlos kündbar"-Sonderfall
- tr/zh/hi-Übersetzungen sind Best-Effort, nicht muttersprachlich gegengelesen
- IMP-03 (Maskottchen-Asset) weiterhin offen — Emoji-Platzhalter 🦊 überall im Einsatz

**Soll ich diesen Sprint-Plan so freigeben, oder Anpassungen an Phasenzuschnitt/Reihenfolge vornehmen, bevor Sprint 0a/1 startet?**
