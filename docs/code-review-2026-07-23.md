# 📋 Clean-Code-Report — ImmoFuchs.info

**Stand:** 2026-07-23 · Branch `Immofuchs-dev` · v1.5.2
**Umfang:** ~6.750 Zeilen Frontend (React/JSX), ~510 Zeilen Worker (TS), keine Tests

## Gesamturteil

**Solide bis gut** — besonders das KI-Backend ist sauber und durchdacht. Die
Modularisierung (Refactoring) ist gelungen: klare Ordnerstruktur, Hooks/Utils/i18n
getrennt, gute „Warum"-Kommentare. Die drei größten Schwachstellen sind
**(1) fehlende Tests bei sicherheitskritischer Finanzmathematik, (2) trivial
umgehbares Rate-Limit (Kostenrisiko) und (3) ein 65-Zeilen-Rechenblock mit
Ein-Buchstaben-Variablen**, der das Herzstück des Produkts bildet und ungetestet ist.

---

## 🟢 Was gut gelöst ist (Lob)

| Bereich | Warum vorbildlich |
|---|---|
| **Worker-Architektur** | Saubere Modultrennung: `validator` / `modelRouter` / `systemPrompt` / `promptBuilder` / `outputFilter` / `sessionRateLimiter`. Jede Datei eine Verantwortung, voll typisiert. |
| **Secrets-Handling** | `.env` + `worker/.dev.vars` gegitignored, `wrangler.toml` dokumentiert „Secrets NIE hier". API-Key nur per Header. Vorbildlich. |
| **Datenschutz im Backend** | `index.ts:59-61` loggt bewusst **keinen** Nutzer-Freitext, nur strukturelle Fehlercodes. DSGVO-bewusst. |
| **Resilienz** | Timeout-Guard (`withTimeout`), Gemini→Llama-Fallback, Kill-Switch via Env-Var ohne Redeploy, CORS-Allowlist. |
| **Rate-Limiter-Wahl** | Wechsel KV→Durable Object ist im Code begründet (KV war „eventually consistent", Limit griff nicht). Genau die Art Kommentar, die man will. |
| **Assistant-Komponenten** | `AssistantWidget` verdrahtet nur `MascotFab`→`Sheet` — klein, single-responsibility. |
| **Input-Validierung** | `validator.ts` prüft jedes Feld streng (Typen, Längen, Enums, Session-Pattern) vor dem Modell-Call. |

---

## 🔴 Kritisch / hohes Risiko

### 1. Rate-Limit ist trivial umgehbar → offenes Kostenrisiko
`useAssistant.js:6-18` erzeugt die `sessionId` als `crypto.randomUUID()` im
localStorage; der Worker limitiert **pro sessionId** (`index.ts:46`). Ein Angreifer
(oder simples Skript) rotiert einfach die sessionId und umgeht das Tageslimit von
20 vollständig — **keine IP-, kein globales Cap**. Bei kostenpflichtigem
Gemini/Workers-AI ist das ein direktes Kostenleck.
**Empfehlung:** Zusätzliches globales Tages-/Minuten-Cap (zweiter DO) oder
IP-basiertes Limit über Cloudflare-Header (`CF-Connecting-IP`) als zweite Schranke.

### 2. Keine automatisierten Tests bei Finanzmathematik
`find` findet **null** Testdateien. Das Herzstück — `Renditerechner.jsx`
`R=useMemo` (Zeilen 44-108) — berechnet Rendite, Cashflow, Steuer,
Restschuld-Verlauf und einen Risiko-Score aus Dutzenden verketteten Formeln.
**Ein Vorzeichenfehler bleibt unbemerkt und liefert Investoren falsche Zahlen.**
Für ein Produkt, dessen einziger Wert korrekte Zahlen sind, ist das die größte Lücke.
**Empfehlung:** Rechenkern in reine Funktion `computeRendite(d)` extrahieren
(siehe Punkt 4) und mit Vitest gegen bekannte Fälle absichern.

---

## 🟠 Wichtig (sollte adressiert werden)

### 3. Rate-Limit zählt vor dem Modell-Call
`index.ts:47` inkrementiert den Zähler, *bevor* das Modell antwortet. Schlägt der
Call fehl (502), ist das Kontingent trotzdem „verbraucht". Fairness-/UX-Problem.
**Empfehlung:** Erst bei Erfolg zählen, oder bei Modell-Fehler dekrementieren.

### 4. „Gott-Berechnung" mit Ein-Buchstaben-Variablen
`Renditerechner.jsx:44-108`: ~65 Zeilen mit
`kp, ga, gKP, qm, mi, ek, zP, tP, nP, mP, gP, nu, lM, sP, aP, gA, wP, j, so, ren, vQ…`
plus inline Magic-Numbers im Risiko-Scoring (`if(bel>95){rk+=30}` …).
Rechenlogik und JSX vermischt, praktisch nicht auditierbar.
**Empfehlung (höchster Hebel):** Reine, getestete Funktion in `utils/rendite.js`
auslagern, sprechende Namen, Scoring-Schwellen als benannte Konstanten. Trennt
Mathematik von Darstellung und macht Punkt 2 überhaupt erst möglich.

### 5. Design-Tokens sind auseinandergedriftet
`CLAUDE.md` deklariert als unveränderlich: Primary `#1E3A5F`, Accent `#E8650A`,
Font **Inter**, Radius 12px. Der Code nutzt aber `--ca:#e8600a` (≠ E8650A),
Font `'DM Sans'`, Text `#1a1a1a`. Die „heiligen" Tokens stimmen nicht mehr mit der
Implementierung überein.
**Empfehlung:** Entweder `CLAUDE.md` an den Ist-Zustand angleichen oder Code an die
Tokens — aber die Diskrepanz auflösen.

### 6. Fehlender Linter/Formatter
Kein ESLint-/Prettier-Config im Repo, obwohl `useFinnBubble.js:65` ein
`eslint-disable` enthält (setzt ESLint voraus). Die strengen CLAUDE.md-Regeln
werden nirgends automatisiert durchgesetzt.
**Empfehlung:** ESLint + Prettier einrichten; verhindert genau die stille Drift aus
Punkt 5.

---

## 🟡 Kleinere Punkte (Nice-to-have)

- **DRY in `App.jsx`:** Der große `<style>`-Block inkl. `:root`-Tokens ist zwischen
  Landing-Zweig (Z. 90) und App-Zweig (Z. 93-149) doppelt; ebenso der „Zur
  Startseite"-Handler (Z. 154 & 165) und `<LegalModal>`/`<OfflineBanner>` in beiden
  Zweigen. In gemeinsame Konstante/Komponente ziehen.
- **Riesiges State-Literal:** `App.jsx:80` — der komplette `data`-Initialstate in
  einer Zeile. In eine benannte `DEFAULTS`-Konstante mit Zeilenumbrüchen auslagern.
- **Stille `catch(e){}`:** `App.jsx:49, 66` schlucken Fehler kommentarlos. Zumindest
  die Absicht kommentieren.
- **Redundante Helfer:** `helpers.js` hat `tf` (replaceAll) *und* `tpl` (regex) für
  praktisch dieselbe Aufgabe — auf einen reduzieren.
- **Doppelter Timeout:** `modelRouter.ts` — `callGemini` hat einen eigenen
  `AbortController`-Timeout *und* wird in `withTimeout` gewrappt (beide
  `MODEL_TIMEOUT_MS`). Einer reicht.
- **Logik im Markup:** `Renditerechner.jsx:134` — die grund-/gebAnteil-Kopplung
  (`100-(+v||0)`) direkt im `onChange`. In Handler auslagern.
- **`_lang` ungenutzt** in `callModel` (`modelRouter.ts:21`) — ist dokumentiert,
  daher vertretbar.

---

## Priorisierte Empfehlung (Reihenfolge)

1. **Rechenkern extrahieren + Vitest-Tests** (Punkt 4 → 2) — größter Qualitäts- und
   Sicherheitsgewinn
2. **Globales/IP-Rate-Limit** (Punkt 1) — schließt das Kostenleck
3. **ESLint + Prettier** (Punkt 6) — verhindert künftige Drift
4. **Design-Token-Diskrepanz auflösen** (Punkt 5)
5. DRY-Aufräumen in `App.jsx` (Kleinere Punkte)

**Verdikt:** *Comment / kein Blocker* — die Codebasis ist gesund und der Refactor
gelungen; die Finanzmathematik gehört aber dringend getestet und das Rate-Limit
abgesichert.

---

## ✅ Umsetzungsstatus (2026-07-23, alle Punkte umgesetzt)

| # | Punkt | Status |
|---|---|---|
| 1 | Rate-Limit umgehbar | ✅ Globales Cap + IP-Limit im Worker, Refund bei Fehler |
| 2 | Keine Tests | ✅ Vitest + 12 Charakterisierungstests (`rendite.test.js`) |
| 3 | Zählt vor Modell-Call | ✅ `decrement()` bucht alle Zähler bei 502 zurück |
| 4 | Gott-Berechnung | ✅ `computeRendite()` in `utils/rendite.js`, sprechende Namen, `RISIKO`-Schwellen |
| 5 | Design-Token-Drift | ✅ `CLAUDE.md` an Ist-Zustand angeglichen (kein optischer Eingriff) |
| 6 | Kein Linter | ⚠️ **offen** — bewusst nicht in diesem Durchgang (siehe unten) |
| — | Kleinere Punkte | ✅ `tf()` entfernt, `createDefaults`, `goHome`, Token-Dedup, catch-Kommentare, `setAnteil` |

**Bewusst offen gelassen:**
- **Punkt 6 (ESLint/Prettier):** Ein Linter/Formatter würde beim dichten,
  bewusst kompakten Stil dieses Projekts (Einzeiler-Komponenten) hunderte
  Formatierungs-Warnungen erzeugen und eine eigene Konfigurationsentscheidung
  erfordern (Regelsatz, Auto-Format ja/nein). Das ist ein eigener, größerer
  Schritt — separat sinnvoll, nicht Teil dieses Aufräum-Durchgangs.
- **CSS-`html/body`-Regeln** (nicht die Tokens): nur die `:root`-Tokens wurden
  dedupliziert. Die restlichen Basis-Regeln unterscheiden sich minimal zwischen
  Landing und App (`touch-action` vs. `-webkit-text-size-adjust`); ein Zusammen-
  führen hätte gerendertes Verhalten ändern können → bewusst unangetastet.

Verifikation: `npm run build` grün · `npm test` 12/12 grün · Worker `tsc` fehlerfrei ·
Renditerechner im Browser gegengeprüft (Brutto 4,11 % / Netto 2,98 %, identisch).
