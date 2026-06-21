# ImmoFuchs.info — Architektur-Refactor: App.jsx Modularisierung

> **Für Claude:** REQUIRED SUB-SKILL: Nutze `claude-superskills:executing-plans` um diesen Plan Task für Task umzusetzen.

**Ziel:** App.jsx (652KB / 3.660 Zeilen) in eine saubere, modulare Dateistruktur aufteilen — ohne eine einzige Zeile Logik zu verändern.

**Architektur:** Reine Extraktion — kein Refactor, keine Umstrukturierung von Logik. Jede Datei bekommt genau das, was bereits da ist. Imports werden angepasst, sonst nichts. Die §558-BGB-Logik (`buildMP`) und die Annuität-Berechnung in `Kredit` sind FROZEN und werden 1:1 kopiert.

**Tech Stack:** React 18 + Vite + Tailwind CSS — kein neues Tooling, keine neuen Dependencies.

---

## Ziel-Dateistruktur

```
src/
  context/
    AppContext.jsx         ← Ctx, useApp (aktuell App.jsx Z.101–102)
  i18n/
    translations.js        ← T, TL, LANGS (App.jsx Z.23–100)
    tips.js               ← TIPS (App.jsx Z.503–706)
    steuerTrick.js        ← STEUER_T (App.jsx Z.2219–2371)
    vorfaelligkeit.js     ← VFE_T (App.jsx Z.2547–2553)
  data/
    plzData.js            ← PLZ_RAW, PLZ_DB, kapp15Set, isK15 (App.jsx Z.6–22) ← GRÖSSTER GEWINN (~400KB)
  utils/
    helpers.js            ← fmt, fmtE, fmtP, tf, fmtDat, addM, addY, tpl (App.jsx Z.103–121)
    bands.js              ← AMPEL, Dot, BANDS, rate, vrd (App.jsx Z.111–118, 444–469)
  components/
    ui/
      atoms.jsx           ← F, Sel, Row, Sec, KPI, NeutralKPI, AmpelKPI, Ins, VT (App.jsx Z.123–168, 417–441, 498–502)
      Tip.jsx             ← Tip (App.jsx Z.742–756)
      LangSel.jsx         ← LangSel, Legal (App.jsx Z.758–795)
      AccordionSection.jsx ← AccordionSection, SectionExplain (App.jsx Z.391–416, 470–487)
      PLZSearch.jsx       ← PLZSearch (App.jsx Z.488–496)
    charts/
      RBar.jsx            ← RBar (App.jsx Z.271–390)
      LineChart.jsx       ← LineChart (App.jsx Z.796–917)
    tables/
      YearTable.jsx       ← YearTable (App.jsx Z.918–982)
      Detail.jsx          ← Detail (App.jsx Z.983–1077)
    export/
      ExportPDF.jsx       ← ExportPDF (App.jsx Z.1078–1137)
    calculators/
      Renditerechner.jsx  ← function Haupt() (App.jsx Z.1138–1644)
      Finanzierung.jsx    ← function Kredit() [FROZEN] (App.jsx Z.1645–1779)
      Miete.jsx           ← function Miete() + buildMP [FROZEN] (App.jsx Z.1780–1851)
      Sanier.jsx          ← function Sanier() + TierSel + EC helpers (App.jsx Z.1852–2218)
    extras/
      SteuerTrick.jsx     ← SteuerTrick + InfoTooltip (App.jsx Z.2415–2534)
      Vorfaelligkeit.jsx  ← Vorfaelligkeit + IC (App.jsx Z.2535–2792)
    shell/
      ZinsAlarm.jsx       ← ZinsAlarm + showAlarmNotification (App.jsx Z.3341–3511)
      Merkliste.jsx       ← Merkliste + SaveModal + SaveBtn + useSavedObjects (App.jsx Z.3222–3340)
      LegalModal.jsx      ← LegalModal + Hilfstexte (App.jsx Z.3120–3210)
      OfflineBanner.jsx   ← OfflineBanner (App.jsx Z.3513–3524)
      Statusleiste.jsx    ← Statusleiste (App.jsx Z.3211–3218)
  pages/
    Landing.jsx           ← Landing() (App.jsx Z.2795–3114)
  App.jsx                 ← ~150 Zeilen: nur Root + Provider + Tab-Routing
  data.js                 ← UNVERÄNDERT (bleibt wie ist)
  main.jsx                ← UNVERÄNDERT
```

---

## Kritische Regeln für die Ausführung

1. **KEINE Logik verändern** — nur kopieren und Imports anpassen
2. **FROZEN-Code (buildMP, Annuität)** — 1:1 kopieren, keine Formatierung ändern
3. **Nach jedem Task:** `npm run build` ausführen und auf Fehler prüfen
4. **Nach jedem Task:** Git commit (kleiner, revertierbarer Schritt)
5. **Reihenfolge strikt einhalten** — jeder Task baut auf dem vorherigen auf
6. **Niemals zwei Tasks gleichzeitig** — ein Fehler soll sofort sichtbar sein

---

## Vorbereitung

```powershell
# Branch anlegen (von Immofuchs-dev abzweigen)
git checkout Immofuchs-dev
git pull origin Immofuchs-dev
git checkout -b refactor/modular-architecture

# Ordnerstruktur anlegen
mkdir src/context, src/i18n, src/data, src/utils
mkdir src/components/ui, src/components/charts, src/components/tables
mkdir src/components/export, src/components/calculators
mkdir src/components/extras, src/components/shell
mkdir src/pages
```

---

## Tasks

---

### Task 1: `src/data/plzData.js` — PLZ-Daten extrahieren

**Warum zuerst:** Dieser eine Schritt reduziert App.jsx von 652KB auf ~250KB und beseitigt die Babel-Warning. Größtes Risiko-Nutzen-Verhältnis.

**Betroffene Zeilen in App.jsx:** Z.6–22

**Files:**
- Create: `src/data/plzData.js`
- Modify: `src/App.jsx` (Zeilen 1–22: Import + Code ersetzen)

**Schritt 1: Neue Datei erstellen**

Zeilen 6–22 aus App.jsx exakt herauskopieren nach `src/data/plzData.js`:

```js
// src/data/plzData.js
// PLZ_RAW: alle 19.676 Einträge als String (Format: Ort;Plz;Bundesland)
export const PLZ_RAW = `[EXAKT DER STRING AUS APP.JSX Z.6]`;

export const PLZ_DB = PLZ_RAW.trim().split("\n").map(r => {
  // [EXAKT DER CODE AUS APP.JSX Z.7–8]
});

// kapp15Set + isK15 (Z.9–22) ebenfalls 1:1 kopieren
const kapp15Set = new Set();
// [exakter Code aus App.jsx]
export const isK15 = (ort) => kapp15Set.has(ort?.toLowerCase());
```

**Schritt 2: App.jsx anpassen**

Zeilen 6–22 in App.jsx ersetzen durch:
```js
import { PLZ_DB, isK15 } from "./data/plzData.js";
```

**Schritt 3: Build-Test**
```powershell
npm run build
```
Erwartetes Ergebnis: Build erfolgreich, KEINE Fehler, App.jsx jetzt ~250KB, keine Babel-Warning mehr.

**Schritt 4: Commit**
```powershell
git add src/data/plzData.js src/App.jsx
git commit -m "refactor: extract PLZ data to src/data/plzData.js"
```

---

### Task 2: `src/context/AppContext.jsx` — Context extrahieren

**Warum:** Alle kommenden Komponenten-Dateien brauchen `useApp`. Dieser Import muss zuerst existieren.

**Betroffene Zeilen in App.jsx:** Z.101–102

**Files:**
- Create: `src/context/AppContext.jsx`
- Modify: `src/App.jsx`

**Schritt 1: Neue Datei erstellen**

```jsx
// src/context/AppContext.jsx
import { createContext, useContext } from "react";

export const Ctx = createContext();
export const useApp = () => useContext(Ctx);
```

**Schritt 2: App.jsx anpassen**

In App.jsx Zeilen 101–102 ersetzen durch:
```js
import { Ctx, useApp } from "./context/AppContext.jsx";
```

Außerdem: Den React-Import in Zeile 1 um `createContext, useContext` kürzen (werden jetzt nicht mehr in App.jsx gebraucht).

**Schritt 3: Build-Test**
```powershell
npm run build
```
Erwartetes Ergebnis: Build erfolgreich.

**Schritt 4: Commit**
```powershell
git add src/context/AppContext.jsx src/App.jsx
git commit -m "refactor: extract Context to src/context/AppContext.jsx"
```

---

### Task 3: `src/i18n/translations.js` + `src/i18n/tips.js` — Übersetzungen extrahieren

**Betroffene Zeilen in App.jsx:** Z.23–100 (T, TL, LANGS) und Z.503–706 (TIPS)

**Files:**
- Create: `src/i18n/translations.js`
- Create: `src/i18n/tips.js`
- Modify: `src/App.jsx`

**Schritt 1: `src/i18n/translations.js` erstellen**

```js
// src/i18n/translations.js
export const T = { /* Z.23–89 exakt kopieren */ };
export const TL = { /* Z.90–100 exakt kopieren */ };
export const LANGS = [ /* Z.757 exakt kopieren */ ];
```

**Schritt 2: `src/i18n/tips.js` erstellen**

```js
// src/i18n/tips.js
export const TIPS = { /* Z.503–706 exakt kopieren */ };
```

**Schritt 3: App.jsx anpassen**

Zeilen 23–100 ersetzen:
```js
import { T, TL, LANGS } from "./i18n/translations.js";
```
Zeilen 503–706 ersetzen:
```js
import { TIPS } from "./i18n/tips.js";
```

**Schritt 4: Build-Test + Commit**
```powershell
npm run build
git add src/i18n/ src/App.jsx
git commit -m "refactor: extract translations and TIPS to src/i18n/"
```

---

### Task 4: `src/utils/helpers.js` + `src/utils/bands.js` — Utilities extrahieren

**Betroffene Zeilen in App.jsx:** Z.103–121 (helpers), Z.111–118 + Z.444–469 (bands)

**Files:**
- Create: `src/utils/helpers.js`
- Create: `src/utils/bands.js`
- Modify: `src/App.jsx`

**Schritt 1: `src/utils/helpers.js` erstellen**

```js
// src/utils/helpers.js
export const fmt = /* Z.103 */;
export const fmtE = /* Z.104 */;
export const fmtP = /* Z.105 */;
export const tf = /* Z.106 */;
export const fmtDat = /* Z.107 */;
export const addM = /* Z.120 */;
export const addY = /* Z.121 */;
export const tpl = /* Z.442 */;
```

**Schritt 2: `src/utils/bands.js` erstellen**

```js
// src/utils/bands.js
export const AMPEL = /* Z.111–118 */;
export const BANDS = /* Z.444–458 */;
export const rate = /* Z.459–467 */;
export const vrd = /* Z.468 */;
```

**Schritt 3: App.jsx anpassen** — entsprechende Zeilen durch Imports ersetzen.

**Schritt 4: Build-Test + Commit**
```powershell
npm run build
git add src/utils/ src/App.jsx
git commit -m "refactor: extract utilities to src/utils/"
```

---

### Task 5: `src/components/ui/atoms.jsx` — UI-Atoms extrahieren

**Betroffene Zeilen in App.jsx:** Z.119 (Dot), Z.123–168 (F, Sel, Row, Sec, KPI), Z.417–441 (AccordionSection, AmpelKPI, NeutralKPI), Z.270 (Ins), Z.498–502 (VT)

**WICHTIG:** Diese Komponenten importieren `useApp` — der muss aus `AppContext.jsx` importiert werden.

**Files:**
- Create: `src/components/ui/atoms.jsx`
- Modify: `src/App.jsx`

**Schritt 1: Datei erstellen**

```jsx
// src/components/ui/atoms.jsx
import { useApp } from "../../context/AppContext.jsx";
// Alle weiteren Imports die die Komponenten brauchen (React hooks, etc.)

export const Dot = /* Z.119 */;
export const F = /* Z.123–164 */;
export const Sel = /* Z.165 */;
export const Row = /* Z.166 */;
export const Sec = /* Z.167 */;
export const KPI = /* Z.168 */;
export const Ins = /* Z.270 */;
export const AccordionSection = /* Z.391–416 */;
export const AmpelKPI = /* Z.417–433 */;
export const NeutralKPI = /* Z.434–441 */;
export const VT = /* Z.498–502 */;
```

**Schritt 2: App.jsx anpassen** — entsprechende Zeilen durch Import ersetzen.

**Schritt 3: Build-Test + Commit**
```powershell
npm run build
git add src/components/ui/atoms.jsx src/App.jsx
git commit -m "refactor: extract UI atoms to src/components/ui/atoms.jsx"
```

---

### Task 6: Weitere UI-Komponenten extrahieren

Diese Tasks können sequenziell abgearbeitet werden — jede Datei ist unabhängig.

**6a: `src/components/ui/Tip.jsx`** — Z.742–756
**6b: `src/components/ui/LangSel.jsx`** — Z.757–795 (LangSel + Legal)
**6c: `src/components/ui/PLZSearch.jsx`** — Z.488–496
**6d: `src/components/ui/SectionExplain.jsx`** — Z.470–487
**6e: `src/components/charts/RBar.jsx`** — Z.271–390
**6f: `src/components/charts/LineChart.jsx`** — Z.796–917
**6g: `src/components/tables/YearTable.jsx`** — Z.918–982
**6h: `src/components/tables/Detail.jsx`** — Z.983–1077
**6i: `src/components/export/ExportPDF.jsx`** — Z.1078–1137

**Für jede Datei:**
1. Datei erstellen, Code 1:1 kopieren, korrekte Imports setzen (useApp, utils, etc.)
2. In App.jsx: Zeilen ersetzen durch Import
3. `npm run build` — muss fehlerfrei sein
4. Git commit pro Datei

```powershell
# Beispiel-Commit-Schema:
git commit -m "refactor: extract RBar to src/components/charts/RBar.jsx"
git commit -m "refactor: extract LineChart to src/components/charts/LineChart.jsx"
# etc.
```

---

### Task 7: `src/i18n/steuerTrick.js` + `src/i18n/vorfaelligkeit.js`

**7a:** Z.2219–2371 → `src/i18n/steuerTrick.js` — `export const STEUER_T = {...}`
**7b:** Z.2547–2553 → `src/i18n/vorfaelligkeit.js` — `export const VFE_T = {...}`

Build + Commit nach jeder Datei.

---

### Task 8: `src/components/calculators/` — Die 4 Rechner extrahieren

**KRITISCHSTER TASK.** Reihenfolge wichtig.

**ZWINGEND vor Beginn lesen:** Die Rechner verwenden `useApp()`, alle shared components, alle utils und alle i18n-Objekte. Imports müssen vollständig sein.

**8a: `src/components/calculators/Miete.jsx`** (einfachste Struktur, Z.1780–1851)

```jsx
// src/components/calculators/Miete.jsx
import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { T, TIPS } from "../../i18n/...";
import { PLZSearch } from "../ui/PLZSearch.jsx";
import { F, Row, Sec } from "../ui/atoms.jsx";
// ... alle weiteren Imports

// buildMP FROZEN — 1:1 kopieren, KEINE Änderung (Z.497)
const buildMP = /* exakter Code aus App.jsx Z.497 */;

export default function Miete() {
  /* Z.1780–1851 exakt kopieren */
}
```

Build + Commit: `git commit -m "refactor: extract Miete calculator"`

**8b: `src/components/calculators/Finanzierung.jsx`** (Z.1645–1779)

ACHTUNG: Annuität-Logik im `useMemo` (Z.1650–1688) ist FROZEN — 1:1 kopieren.

Build + Commit: `git commit -m "refactor: extract Finanzierung calculator"`

**8c: `src/components/calculators/Sanier.jsx`** (Z.1852–2218)

Enthält eigene lokale Helpers (EC_O, EC_C, kw2ec, TierSel) — diese kommen MIT in die Datei (sind Sanier-spezifisch).

Build + Commit: `git commit -m "refactor: extract Sanier calculator"`

**8d: `src/components/calculators/Renditerechner.jsx`** (Z.1138–1644, größte Datei)

Dieser Rechner ist der komplexeste — er nutzt fast alle shared components. Imports sorgfältig prüfen.

Build + Commit: `git commit -m "refactor: extract Renditerechner (Haupt)"`

---

### Task 9: `src/components/extras/` — Bonus-Tools extrahieren

**9a: `src/components/extras/SteuerTrick.jsx`** — Z.2415–2534 (inkl. InfoTooltip)
**9b: `src/components/extras/Vorfaelligkeit.jsx`** — Z.2556–2792 (inkl. IC icon map)

Build + Commit nach jeder Datei.

---

### Task 10: `src/pages/Landing.jsx` — Landing Page extrahieren

Z.2795–3114 → `src/pages/Landing.jsx`

Build + Commit: `git commit -m "refactor: extract Landing page"`

---

### Task 11: `src/components/shell/` — App-Shell-Komponenten extrahieren

**11a: `src/components/shell/LegalModal.jsx`** — Z.3120–3210
**11b: `src/components/shell/Statusleiste.jsx`** — Z.3211–3218
**11c: `src/components/shell/Merkliste.jsx`** — Z.3222–3340 (inkl. useSavedObjects, SaveModal, SaveBtn)
**11d: `src/components/shell/ZinsAlarm.jsx`** — Z.3341–3511 (inkl. showAlarmNotification)
**11e: `src/components/shell/OfflineBanner.jsx`** — Z.3513–3524

Build + Commit nach jeder Datei.

---

### Task 12: App.jsx aufräumen — Finalisierung

Nach allen vorherigen Tasks sollte App.jsx nur noch enthalten:
- Imports (~20 Zeilen)
- `export default function App()` mit useState für tab/lang/zinsen/landed
- Ctx.Provider
- Tab-Routing (welcher Rechner wird angezeigt)
- CSS-in-JS für Root-Layout

Ziel: **App.jsx < 200 Zeilen**

**Schritt 1:** Alle nicht mehr genutzten Zeilen aus App.jsx entfernen (die wurden schon durch Imports ersetzt).

**Schritt 2:** Build-Test — MUSS fehlerfrei sein.

**Schritt 3: Volltest im Browser**
- Alle 4 Rechner durchklicken
- PLZ-Suche testen (mind. 2 PLZs eingeben)
- Mieterhöhung mit §558-BGB testen
- Sanierungsrechner mit Maßnahmen testen
- Finanzierungsrechner: Annuität, Sondertilgung
- Sprache wechseln
- Speichern in Merkliste
- ZinsAlarm testen
- Offline-Modus simulieren (DevTools → Offline)

**Schritt 4: Commit**
```powershell
git add src/App.jsx
git commit -m "refactor: App.jsx cleanup - now <200 lines"
```

---

### Task 13: Verifikation & Abschluss

**Schritt 1: Dateigrößen prüfen**
```powershell
# App.jsx sollte < 200 Zeilen und < 10KB sein
(Get-Content src/App.jsx).Count
(Get-Item src/App.jsx).Length / 1KB
```

**Schritt 2: Build-Analyse**
```powershell
npm run build
# Prüfen: Keine Warnings, Bundle-Größe ± gleich wie vorher
```

**Schritt 3: Keine Babel-Warning mehr**
```powershell
npm run dev
# In der Konsole: Keine "[BABEL] Note: The code generator has deoptimised..." Meldung
```

**Schritt 4: Release Notes updaten**

In `release-notes.txt` ergänzen:
```
[Version X.XX] - Architektur-Refactor
- App.jsx von 652KB auf <10KB reduziert
- Modulare Dateistruktur eingeführt (12 neue Dateien)
- PLZ-Daten nach src/data/plzData.js extrahiert
- Context nach src/context/AppContext.jsx extrahiert
- Alle 4 Rechner als eigenständige Komponenten
- Keine Logik-Änderungen (reiner Extract)
```

**Schritt 5: Branch pushen**
```powershell
git push origin refactor/modular-architecture
```

---

## Rollback-Strategie

Da jeder Task einen eigenen Commit hat, kann jederzeit zurückgegangen werden:

```powershell
# Letzten Task rückgängig machen:
git revert HEAD

# Auf den Stand vor dem Refactor zurück:
git checkout Immofuchs-dev

# Den ganzen Refactor-Branch verwerfen:
git branch -D refactor/modular-architecture
```

---

## Import-Abhängigkeitsgraph (zur Referenz)

```
App.jsx
  ├── context/AppContext.jsx
  ├── i18n/translations.js
  ├── i18n/tips.js
  ├── data/plzData.js
  ├── utils/helpers.js
  ├── utils/bands.js
  ├── components/ui/atoms.jsx
  │     └── context/AppContext.jsx
  │     └── utils/helpers.js
  ├── components/ui/Tip.jsx
  │     └── context/AppContext.jsx
  │     └── i18n/translations.js
  ├── components/ui/LangSel.jsx
  │     └── context/AppContext.jsx
  ├── components/ui/PLZSearch.jsx
  │     └── context/AppContext.jsx
  │     └── data/plzData.js
  ├── components/charts/RBar.jsx
  │     └── utils/bands.js
  ├── components/charts/LineChart.jsx
  │     └── utils/helpers.js
  ├── components/tables/YearTable.jsx
  │     └── utils/helpers.js
  ├── components/tables/Detail.jsx
  │     └── utils/helpers.js
  ├── components/export/ExportPDF.jsx
  ├── components/calculators/Renditerechner.jsx
  │     └── [alle oben genannten]
  │     └── data.js (GREST, MIET_P, MARKET_RATES, ...)
  ├── components/calculators/Finanzierung.jsx [FROZEN]
  │     └── context, utils, ui
  ├── components/calculators/Miete.jsx [buildMP FROZEN]
  │     └── context, utils, ui, data/plzData.js
  ├── components/calculators/Sanier.jsx
  │     └── context, utils, ui
  │     └── data.js (KFW, SAN_ENERGIE, SAN_NORMEN, ...)
  ├── components/extras/SteuerTrick.jsx
  ├── components/extras/Vorfaelligkeit.jsx
  │     └── data.js (PFANDBRIEF)
  ├── components/shell/ZinsAlarm.jsx
  ├── components/shell/Merkliste.jsx
  ├── components/shell/LegalModal.jsx
  ├── components/shell/OfflineBanner.jsx
  ├── components/shell/Statusleiste.jsx
  └── pages/Landing.jsx
```

---

## Zeitschätzung

| Phase | Tasks | Geschätzte Dauer |
|---|---|---|
| Setup + Task 1 (PLZ) | 1 | 15 Min |
| Tasks 2–4 (Context, i18n, utils) | 3 | 30 Min |
| Tasks 5–7 (UI-Komponenten) | 13 Dateien | 60 Min |
| Task 8 (4 Rechner) | 4 | 45 Min |
| Tasks 9–11 (Extras, Landing, Shell) | 8 Dateien | 40 Min |
| Task 12–13 (Cleanup + Verifikation) | 2 | 20 Min |
| **Gesamt** | | **~3,5 Stunden** |

*Empfehlung: In einer dedizierten Session durchführen — nicht aufsplitten.*
