# ImmoFuchs.info — Architektur-Refactoring Bibel

> **Für Claude:** REQUIRED SUB-SKILL: Nutze `claude-superskills:executing-plans` um diesen Plan Task für Task umzusetzen.

---

## Übersicht

| | Ist-Zustand | Ziel-Zustand |
|---|---|---|
| Dateien im `src/` | 5 Dateien | ~40 Dateien |
| App.jsx Größe | 656KB / 3.686 Zeilen | <10KB / ~150 Zeilen |
| JS-Bundle (dist) | **756KB** (ein Chunk) | ~150KB initial + lazy chunks |
| Babel-Warning | ja | nein |
| Code Splitting | nein | automatisch via Vite |
| Lazy Loading | nicht möglich | möglich |
| Capacitor-fähig | schwierig | sauber |

**Ansatz:** Reine Extraktion. Keine Logik wird verändert, umgeschrieben oder formatiert. Jede Funktion, jede Variable, jede Berechnung wandert 1:1 in die neue Datei.

---

## ⚠ ABSOLUTE GRUNDREGEL

**Jede Funktion, jede Berechnung, jede Variable bleibt unverändert.**

Erlaubt: Code verschieben + Import-Zeilen anpassen.
Verboten: Logik ändern · Variablennamen ändern · Formatierung ändern · Etwas hinzufügen oder weglassen.

---

## Status-Tracking

> Dieses Feld nach jedem abgeschlossenen Sprint aktualisieren.

| Phase | Sprint | Status | Abgeschlossen am |
|---|---|---|---|
| Phase 1 — Foundation | Sprint 1 | ✅ Abgeschlossen | 2026-07-18 |
| Phase 2 — Shared UI | Sprint 2 | ✅ Abgeschlossen | 2026-07-18 |
| Phase 3 — Calculators | Sprint 3 | ✅ Abgeschlossen | 2026-07-18 |
| Phase 4 — Extras & Shell | Sprint 4 | ✅ Abgeschlossen | 2026-07-18 |
| Phase 5 — Finalisierung | Sprint 5 | ✅ Abgeschlossen (ohne manuelle Browser-Kontrolle — siehe Hinweis unten) | 2026-07-18 |

Status-Legende: ⬜ Ausstehend · 🔄 In Arbeit · ✅ Abgeschlossen · ❌ Blockiert

> **Hinweis zur Ausführung (2026-07-18):** Alle 33 Tasks wurden mit Build-Verifikation
> nach jedem Schritt durchgeführt. Zusätzlich zur reinen Zeilen-für-Zeilen-Extraktion
> wurde ein Cross-Modul-Audit ergänzt (nicht im Original-Plan vorgesehen), das jede
> JSX-Komponentenreferenz und jedes Modul-Symbol gegen die tatsächlichen Imports jeder
> Datei prüft — `npm run build` allein hätte fehlende Imports bei JSX-Komponenten nicht
> erkannt (Vite/esbuild validiert keine JSX-Referenzen zur Build-Zeit, nur zur Laufzeit).
> Dabei wurden 15 fehlende Imports in 9 Dateien gefunden und ergänzt (reine
> Import-Ergänzungen, keine Logikänderungen — Details in release-notes.txt v1.55.5).
>
> Die manuelle Funktionskontrolle im Browser (Schritt 4 von Task 32) konnte in dieser
> Session **nicht** durchgeführt werden — die Browser-Vorschau ließ sich nicht auf den
> lokalen Vite-Dev-Server navigieren. Vor dem Mergen in einen Ziel-Branch sollte die
> Checkliste aus Task 32 manuell durchgegangen werden.

---

## Ziel-Dateistruktur

```
src/
  context/
    AppContext.jsx              ← Ctx, useApp                        (App.jsx Z.101–102)
  i18n/
    translations.js            ← T, TL, LANGS                       (App.jsx Z.23–100, 757)
    tips.js                    ← TIPS                                (App.jsx Z.503–706)
    legal.js                   ← LEG                                 (App.jsx Z.707–741)
    steuerTrick.js             ← STEUER_T                            (App.jsx Z.2230–2382)
    vorfaelligkeit.js          ← VFE_T                               (App.jsx Z.2558–2566)
  data/
    plzData.js                 ← PLZ_RAW, PLZ_DB, kapp15Set, isK15  (App.jsx Z.6–22)
  utils/
    helpers.js                 ← fmt, fmtE, fmtP, tf, LANG_LOCALE,
                                  fmtDat, addM, addY, tpl           (App.jsx Z.103–121, 442)
    bands.js                   ← AMPEL, BANDS, rate, vrd             (App.jsx Z.111–118, 444–469)
  components/
    ui/
      atoms.jsx                ← F, Sel, Row, Sec, KPI, Ins, VT,
                                  AmpelKPI, NeutralKPI, Dot          (App.jsx Z.119, 123–168,
                                                                       270, 417–441, 498–502)
      AccordionSection.jsx     ← AccordionSection, SectionExplain   (App.jsx Z.391–416, 470–487)
      PLZSearch.jsx            ← PLZSearch                           (App.jsx Z.488–496)
      Tip.jsx                  ← Tip                                 (App.jsx Z.742–756)
      LangSel.jsx              ← LangSel, Legal (UI-Atom)            (App.jsx Z.758–795)
    charts/
      RBar.jsx                 ← RBar                                (App.jsx Z.271–390)
      LineChart.jsx            ← LineChart                           (App.jsx Z.796–917)
    tables/
      YearTable.jsx            ← YearTable                           (App.jsx Z.918–982)
      Detail.jsx               ← Detail                              (App.jsx Z.983–1077)
    export/
      ExportPDF.jsx            ← ExportPDF                           (App.jsx Z.1078–1137)
    calculators/
      SelbsttraegerCheck.jsx   ← SelbsttraegerCheck, BreakEvenCards  (App.jsx Z.169–269)
      Renditerechner.jsx       ← function Haupt()                    (App.jsx Z.1142–1647)
      Finanzierung.jsx         ← function Kredit()                   (App.jsx Z.1648–1790)
      Miete.jsx                ← buildMP + function Miete()          (App.jsx Z.497, 1791–1862)
      Sanier.jsx               ← EC_O, EC_C, kw2ec, TierSel,
                                  function Sanier()                  (App.jsx Z.1863–2229)
    extras/
      SteuerTrick.jsx          ← InfoTooltip, SteuerTrick            (App.jsx Z.2383–2545)
      Vorfaelligkeit.jsx       ← Vorfaelligkeit                      (App.jsx Z.2567–2805)
    shell/
      LegalModal.jsx           ← LegalModal + Style-Konstanten       (App.jsx Z.3131–3221)
      Statusleiste.jsx         ← Statusleiste                        (App.jsx Z.3222–3232)
      OfflineBanner.jsx        ← OfflineBanner                       (App.jsx Z.3524–3536)
      Merkliste.jsx            ← useSavedObjects, SaveModal,
                                  SaveBtn, Merkliste                 (App.jsx Z.3233–3351)
      ZinsAlarm.jsx            ← showAlarmNotification, ZinsAlarm    (App.jsx Z.3352–3523)
  pages/
    Landing.jsx                ← function Landing()                  (App.jsx Z.2806–3125)
  App.jsx                      ← ~150 Zeilen: Root + Provider + Routing
  data.js                      ← UNVERÄNDERT
  main.jsx                     ← UNVERÄNDERT
  InstallPrompt.jsx            ← UNVERÄNDERT
  LoadingScreen.jsx            ← UNVERÄNDERT
```

---

## Sonderfälle (vor Beginn lesen)

| Datei | Besonderheit |
|---|---|
| `plzData.js` | `kapp15Set` lädt async via IIFE — Timing bleibt identisch da ES-Module beim ersten Import ausgeführt werden |
| `SelbsttraegerCheck.jsx` | Zwei Exports nötig: `export const SelbsttraegerCheck` + `export const BreakEvenCards = SelbsttraegerCheck` |
| `Tip.jsx` | Braucht `import { createPortal } from "react-dom"` |
| `Merkliste.jsx` | Braucht `import { createPortal } from "react-dom"` + importiert `T` direkt aus `i18n/translations.js` |
| `Miete.jsx` | Enthält `buildMP` (App.jsx Z.497) — außerhalb von Miete definiert, kommt aber nach Miete.jsx |
| `IC` (icon map, Z.2534–2543) | Bleibt in `App.jsx` — wird nur dort für Tab-Definitionen genutzt |
| `LEG` (Z.707–741) | Geht nach `i18n/legal.js` — alle 4 Rechner nutzen `LEG.xxx` |
| `LANG_LOCALE` (Z.106) | Neu gefunden — fehlt im ursprünglichen Plan. Geht nach `utils/helpers.js` zusammen mit `fmtDat` (wird von `fmtDat` intern genutzt) |
| `ExportPDF` (Z.1078) | Lädt jsPDF/html2canvas per dynamischem Import zur Laufzeit — extrahiert sauber ohne Änderung |
| Shell-Komponenten (SaveModal, SaveBtn, Merkliste) | Importieren `T` direkt: `const t = T[lang] \|\| T.de` — brauchen direkten Import aus `translations.js` |

---

## Import-Abhängigkeitsgraph

```
App.jsx (Root)
  ├── context/AppContext.jsx
  ├── i18n/translations.js
  ├── i18n/tips.js
  ├── data/plzData.js
  ├── utils/helpers.js
  ├── utils/bands.js
  ├── components/ui/atoms.jsx
  │     ├── context/AppContext.jsx
  │     └── utils/helpers.js
  ├── components/ui/Tip.jsx           ← react-dom (createPortal)
  ├── components/ui/LangSel.jsx
  ├── components/ui/PLZSearch.jsx
  │     └── data/plzData.js
  ├── components/charts/RBar.jsx
  ├── components/charts/LineChart.jsx
  ├── components/tables/YearTable.jsx
  ├── components/tables/Detail.jsx
  ├── components/export/ExportPDF.jsx
  ├── components/calculators/SelbsttraegerCheck.jsx
  ├── components/calculators/Renditerechner.jsx
  │     └── [alle oben + data.js: GREST, MIET_P, MARKET_RATES]
  ├── components/calculators/Finanzierung.jsx
  ├── components/calculators/Miete.jsx
  │     └── data/plzData.js (isK15) + data.js (MIET_P)
  ├── components/calculators/Sanier.jsx
  │     └── data.js (KFW, SAN_ENERGIE, SAN_NORMEN, SAN_TIERS, ...)
  ├── components/extras/SteuerTrick.jsx
  │     └── i18n/steuerTrick.js
  ├── components/extras/Vorfaelligkeit.jsx
  │     └── i18n/vorfaelligkeit.js + data.js (PFANDBRIEF)
  ├── components/shell/LegalModal.jsx
  ├── components/shell/Statusleiste.jsx
  ├── components/shell/OfflineBanner.jsx
  ├── components/shell/Merkliste.jsx  ← react-dom + T direkt
  ├── components/shell/ZinsAlarm.jsx
  └── pages/Landing.jsx
```

---

## Vorbereitung (einmalig vor Sprint 1)

```powershell
# Branch anlegen
git checkout Immofuchs-dev
git pull origin Immofuchs-dev
git checkout -b refactor/modular-architecture

# Ordnerstruktur anlegen
New-Item -ItemType Directory -Force -Path `
  src/context, src/i18n, src/data, src/utils, `
  src/components/ui, src/components/charts, `
  src/components/tables, src/components/export, `
  src/components/calculators, src/components/extras, `
  src/components/shell, src/pages
```

---

## Task-Schema (gilt für alle Tasks)

Jeder Task folgt exakt diesem Schema — keine Abweichungen:

```
1. Neue Datei anlegen
2. Code aus App.jsx exakt kopieren (Zeilen-Referenz beachten)
3. Imports in der neuen Datei setzen
4. In App.jsx: extrahierte Zeilen durch eine Import-Zeile ersetzen
5. npm run build  →  muss fehlerfrei sein
6. git add . && git commit -m "refactor: ..."
```

---

---

# PHASE 1 — Foundation

**Ziel:** Alle Daten, Context, i18n und Utilities aus App.jsx extrahieren.
**Risiko:** Niedrig — kein UI-Code betroffen.
**Ergebnis:** App.jsx von 652KB auf ~250KB reduziert. Babel-Warning verschwindet nach Task 1.

## Sprint 1 — Daten & Infrastruktur

**Umfang:** 9 Tasks · geschätzte Dauer: ~1,5 Stunden

### 🏁 Meilenstein 1: Alle Basis-Module isoliert
> Erreichbar nach Task 9. App.jsx enthält danach nur noch UI-Komponenten und Rechner — kein Daten-Code mehr.

---

### Task 1 — `src/data/plzData.js`

**Quelle:** App.jsx Z.6–22 · **Größte Einzelreduktion (~400KB)**

Exporte: `PLZ_RAW`, `PLZ_DB`, `isK15`
Imports in der neuen Datei: keine (reines JS)

In App.jsx ersetzen durch:
```js
import { PLZ_DB, isK15 } from "./data/plzData.js";
```

Build + Commit: `"refactor: extract PLZ data to src/data/plzData.js"`

> ✅ Nach diesem Task verschwindet die Babel-Warning.

---

### Task 2 — `src/context/AppContext.jsx`

**Quelle:** App.jsx Z.101–102

Exporte: `Ctx`, `useApp`

Neue Datei:
```jsx
import { createContext, useContext } from "react";
export const Ctx = createContext();
export const useApp = () => useContext(Ctx);
```

In App.jsx ersetzen durch:
```js
import { Ctx, useApp } from "./context/AppContext.jsx";
```
`createContext` + `useContext` aus dem React-Import in Z.1 entfernen.

Build + Commit: `"refactor: extract Context to src/context/AppContext.jsx"`

---

### Task 3 — `src/i18n/translations.js`

**Quelle:** App.jsx Z.23–100 (T, TL) + Z.757 (LANGS)

Exporte: `T`, `TL`, `LANGS`
Imports: keine

In App.jsx ersetzen durch:
```js
import { T, TL, LANGS } from "./i18n/translations.js";
```

Build + Commit: `"refactor: extract translations to src/i18n/translations.js"`

---

### Task 4 — `src/i18n/tips.js`

**Quelle:** App.jsx Z.503–706

Exporte: `TIPS`
Imports: keine

In App.jsx ersetzen durch:
```js
import { TIPS } from "./i18n/tips.js";
```

Build + Commit: `"refactor: extract TIPS to src/i18n/tips.js"`

---

### Task 5 — `src/i18n/legal.js`

**Quelle:** App.jsx Z.707–741

Exporte: `LEG`
Imports: keine

In App.jsx ersetzen durch:
```js
import { LEG } from "./i18n/legal.js";
```

Build + Commit: `"refactor: extract LEG to src/i18n/legal.js"`

---

### Task 6 — `src/i18n/steuerTrick.js`

**Quelle:** App.jsx Z.2230–2382

Exporte: `STEUER_T`
Imports: keine

In App.jsx ersetzen durch:
```js
import { STEUER_T } from "./i18n/steuerTrick.js";
```

Build + Commit: `"refactor: extract STEUER_T to src/i18n/steuerTrick.js"`

---

### Task 7 — `src/i18n/vorfaelligkeit.js`

**Quelle:** App.jsx Z.2558–2566

Exporte: `VFE_T`
Imports: keine

In App.jsx ersetzen durch:
```js
import { VFE_T } from "./i18n/vorfaelligkeit.js";
```

Build + Commit: `"refactor: extract VFE_T to src/i18n/vorfaelligkeit.js"`

---

### Task 8 — `src/utils/helpers.js`

**Quelle:** App.jsx Z.103–121 + Z.442 (tpl)

Exporte: `fmt`, `fmtE`, `fmtP`, `tf`, `LANG_LOCALE`, `fmtDat`, `addM`, `addY`, `tpl`
Imports: keine

`LANG_LOCALE` (Z.106) war im ursprünglichen Plan nicht erfasst — muss mit extrahiert werden, da `fmtDat` es intern nutzt und `Merkliste` es direkt referenziert.

In App.jsx ersetzen durch:
```js
import { fmt, fmtE, fmtP, tf, LANG_LOCALE, fmtDat, addM, addY, tpl } from "./utils/helpers.js";
```

Build + Commit: `"refactor: extract helpers to src/utils/helpers.js"`

---

### Task 9 — `src/utils/bands.js`

**Quelle:** App.jsx Z.111–118 (AMPEL) + Z.444–469 (BANDS, rate, vrd)

Exporte: `AMPEL`, `BANDS`, `rate`, `vrd`
Imports: keine

In App.jsx ersetzen durch:
```js
import { AMPEL, BANDS, rate, vrd } from "./utils/bands.js";
```

Build + Commit: `"refactor: extract bands/rating to src/utils/bands.js"`

### 🏁 Meilenstein 1 erreicht
```
Messung nach Sprint 1:
  App.jsx Größe:   ~250KB (war 652KB)  ✓
  Babel-Warning:   verschwunden        ✓
  Build:           fehlerfrei          ✓
  Commits:         9                   ✓
```

---

---

# PHASE 2 — Shared UI

**Ziel:** Alle wiederverwendbaren UI-Komponenten aus App.jsx extrahieren.
**Risiko:** Mittel — Komponenten nutzen Context und Utils, Imports müssen korrekt gesetzt sein.
**Ergebnis:** Alle Rechner können danach sauber in eigene Dateien.

## Sprint 2 — UI-Komponenten & Charts

**Umfang:** 10 Tasks · geschätzte Dauer: ~2 Stunden

### 🏁 Meilenstein 2: Alle geteilten Komponenten isoliert
> Erreichbar nach Task 19. App.jsx enthält danach nur noch die 4 Rechner, Extras und Shell.

---

### Task 10 — `src/components/ui/atoms.jsx`

**Quelle:** App.jsx Z.119, 123–168, 270, 417–441, 498–502

Exporte: `Dot`, `F`, `Sel`, `Row`, `Sec`, `KPI`, `Ins`, `AmpelKPI`, `NeutralKPI`, `VT`

Imports (am Code verifizieren — alle referenzierten Symbole importieren):
```js
import { useState, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmt } from "../../utils/helpers.js";
```

In App.jsx ersetzen durch:
```js
import { Dot, F, Sel, Row, Sec, KPI, Ins, AmpelKPI, NeutralKPI, VT }
  from "./components/ui/atoms.jsx";
```

Build + Commit: `"refactor: extract UI atoms to src/components/ui/atoms.jsx"`

---

### Task 11 — `src/components/ui/AccordionSection.jsx`

**Quelle:** App.jsx Z.391–416 (AccordionSection) + Z.470–487 (SectionExplain)

Exporte: `AccordionSection`, `SectionExplain`

Imports:
```js
import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
```

In App.jsx ersetzen durch:
```js
import { AccordionSection, SectionExplain }
  from "./components/ui/AccordionSection.jsx";
```

Build + Commit: `"refactor: extract AccordionSection to src/components/ui/"`

---

### Task 12 — `src/components/ui/PLZSearch.jsx`

**Quelle:** App.jsx Z.488–496

Exporte: `PLZSearch`

Imports:
```js
import { useState, useRef } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { PLZ_DB } from "../../data/plzData.js";
```

In App.jsx ersetzen durch:
```js
import { PLZSearch } from "./components/ui/PLZSearch.jsx";
```

Build + Commit: `"refactor: extract PLZSearch to src/components/ui/PLZSearch.jsx"`

---

### Task 13 — `src/components/ui/Tip.jsx`

**Quelle:** App.jsx Z.742–756

Exporte: `Tip`

Imports (**createPortal beachten**):
```js
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
```

In App.jsx ersetzen durch:
```js
import { Tip } from "./components/ui/Tip.jsx";
```

Build + Commit: `"refactor: extract Tip to src/components/ui/Tip.jsx"`

---

### Task 14 — `src/components/ui/LangSel.jsx`

**Quelle:** App.jsx Z.758–795

Exporte: `LangSel`, `Legal` (UI-Atom, nicht `LEG`)

Imports:
```js
import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { LANGS } from "../../i18n/translations.js";
```

In App.jsx ersetzen durch:
```js
import { LangSel, Legal } from "./components/ui/LangSel.jsx";
```

Build + Commit: `"refactor: extract LangSel to src/components/ui/LangSel.jsx"`

---

### Task 15 — `src/components/charts/RBar.jsx`

**Quelle:** App.jsx Z.271–390

Exporte: `RBar`

Imports:
```js
import { useApp } from "../../context/AppContext.jsx";
import { AMPEL } from "../../utils/bands.js";
```

In App.jsx ersetzen durch:
```js
import { RBar } from "./components/charts/RBar.jsx";
```

Build + Commit: `"refactor: extract RBar to src/components/charts/RBar.jsx"`

---

### Task 16 — `src/components/charts/LineChart.jsx`

**Quelle:** App.jsx Z.796–917

Exporte: `LineChart`

Imports:
```js
import { useApp } from "../../context/AppContext.jsx";
import { fmt, fmtE } from "../../utils/helpers.js";
```
(am Code verifizieren)

In App.jsx ersetzen durch:
```js
import { LineChart } from "./components/charts/LineChart.jsx";
```

Build + Commit: `"refactor: extract LineChart to src/components/charts/LineChart.jsx"`

---

### Task 17 — `src/components/tables/YearTable.jsx`

**Quelle:** App.jsx Z.918–982

Exporte: `YearTable`

Imports:
```js
import { useApp } from "../../context/AppContext.jsx";
import { fmt, fmtP } from "../../utils/helpers.js";
```
(am Code verifizieren)

In App.jsx ersetzen durch:
```js
import { YearTable } from "./components/tables/YearTable.jsx";
```

Build + Commit: `"refactor: extract YearTable to src/components/tables/YearTable.jsx"`

---

### Task 18 — `src/components/tables/Detail.jsx`

**Quelle:** App.jsx Z.983–1077

Exporte: `Detail`

Imports:
```js
import { useApp } from "../../context/AppContext.jsx";
import { fmt, fmtE } from "../../utils/helpers.js";
```
(am Code verifizieren)

In App.jsx ersetzen durch:
```js
import { Detail } from "./components/tables/Detail.jsx";
```

Build + Commit: `"refactor: extract Detail to src/components/tables/Detail.jsx"`

---

### Task 19 — `src/components/export/ExportPDF.jsx`

**Quelle:** App.jsx Z.1078–1137

Exporte: `ExportPDF`

Imports: React-Hooks + `useApp` + alle referenzierten Symbole (am Code ablesen)

In App.jsx ersetzen durch:
```js
import { ExportPDF } from "./components/export/ExportPDF.jsx";
```

Build + Commit: `"refactor: extract ExportPDF to src/components/export/ExportPDF.jsx"`

### 🏁 Meilenstein 2 erreicht
```
Messung nach Sprint 2:
  App.jsx Größe:   ~200KB (war 652KB)  ✓
  Shared Components: alle isoliert     ✓
  Build:           fehlerfrei          ✓
  Commits:         19 gesamt           ✓
```

---

---

# PHASE 3 — Calculators

**Ziel:** Alle 4 Rechner + Hilfskomponenten in eigene Dateien extrahieren.
**Risiko:** Hoch — komplexeste Imports, meiste Abhängigkeiten.
**Ergebnis:** Jeder Rechner vollständig isoliert, Code Splitting durch Vite aktiv.

## Sprint 3 — Rechner-Extraktion

**Umfang:** 5 Tasks · geschätzte Dauer: ~1,5 Stunden

### 🏁 Meilenstein 3: Alle Rechner isoliert — Code Splitting aktiv
> Erreichbar nach Task 24. Vite erzeugt automatisch separate Chunks pro Rechner.

---

### Task 20 — `src/components/calculators/SelbsttraegerCheck.jsx`

**Quelle:** App.jsx Z.169–269

Exporte (**beide erforderlich**):
```js
export const SelbsttraegerCheck = /* Z.169–268 */;
export const BreakEvenCards = SelbsttraegerCheck;
```

Imports: React-Hooks + `useApp` + alle referenzierten Symbole

In App.jsx Z.169–269 ersetzen durch:
```js
import { SelbsttraegerCheck, BreakEvenCards }
  from "./components/calculators/SelbsttraegerCheck.jsx";
```

Build + Commit: `"refactor: extract SelbsttraegerCheck to src/components/calculators/"`

---

### Task 21 — `src/components/calculators/Renditerechner.jsx`

**Quelle:** App.jsx Z.1142–1647 · **Größte Komponente (506 Zeilen)**

Export: `export default function Haupt()`

Vollständige Import-Liste:
```js
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { T } from "../../i18n/translations.js";
import { TIPS } from "../../i18n/tips.js";
import { LEG } from "../../i18n/legal.js";
import { GREST, MIET_P, MARKET_RATES, BL_N, BL_O } from "../../data.js";
import { isK15 } from "../../data/plzData.js";
import { fmt, fmtE, fmtP, tf, fmtDat, addM, addY } from "../../utils/helpers.js";
import { AMPEL, BANDS, rate, vrd } from "../../utils/bands.js";
import { F, Sel, Row, Sec, KPI, AmpelKPI, NeutralKPI, Ins, VT, Dot }
  from "../ui/atoms.jsx";
import { AccordionSection, SectionExplain }
  from "../ui/AccordionSection.jsx";
import { Tip } from "../ui/Tip.jsx";
import { RBar } from "../charts/RBar.jsx";
import { LineChart } from "../charts/LineChart.jsx";
import { YearTable } from "../tables/YearTable.jsx";
import { Detail } from "../tables/Detail.jsx";
import { ExportPDF } from "../export/ExportPDF.jsx";
import { SelbsttraegerCheck, BreakEvenCards }
  from "./SelbsttraegerCheck.jsx";
```

In App.jsx ersetzen durch:
```js
import Haupt from "./components/calculators/Renditerechner.jsx";
```

Build + Commit: `"refactor: extract Renditerechner to src/components/calculators/"`

---

### Task 22 — `src/components/calculators/Finanzierung.jsx`

**Quelle:** App.jsx Z.1648–1790

Export: `export default function Kredit()`

Imports (am Code verifizieren):
```js
import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { LEG } from "../../i18n/legal.js";
import { fmt, fmtP, fmtDat, addM } from "../../utils/helpers.js";
import { F, Sel, Row, Sec, KPI, AmpelKPI, NeutralKPI, VT }
  from "../ui/atoms.jsx";
import { AccordionSection } from "../ui/AccordionSection.jsx";
import { YearTable } from "../tables/YearTable.jsx";
```

In App.jsx ersetzen durch:
```js
import Kredit from "./components/calculators/Finanzierung.jsx";
```

Build + Commit: `"refactor: extract Finanzierung to src/components/calculators/"`

---

### Task 23 — `src/components/calculators/Miete.jsx`

**Quelle:** App.jsx Z.497 (buildMP) + Z.1791–1862

Export: `export default function Miete()`

`buildMP` ist im Original auf Z.497 — kommt als nicht-exportierte Funktion in Miete.jsx.

Imports (am Code verifizieren):
```js
import { useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { MIET_P } from "../../data.js";
import { isK15 } from "../../data/plzData.js";
import { LEG } from "../../i18n/legal.js";
import { fmt } from "../../utils/helpers.js";
import { F, Row, Sec, VT } from "../ui/atoms.jsx";
import { PLZSearch } from "../ui/PLZSearch.jsx";
```

In App.jsx ersetzen durch:
```js
import Miete from "./components/calculators/Miete.jsx";
```
Außerdem: Z.497 (buildMP) in App.jsx entfernen.

Build + Commit: `"refactor: extract Miete to src/components/calculators/"`

---

### Task 24 — `src/components/calculators/Sanier.jsx`

**Quelle:** App.jsx Z.1863–2229 (inkl. EC_O Z.1863, EC_C Z.1864, kw2ec Z.1865, TierSel Z.1870–1879, Sanier Z.1881–2229)

Export: `export default function Sanier()`

EC_O, EC_C, kw2ec, TierSel sind Sanier-spezifisch — kommen ohne Export in dieselbe Datei.

Imports (am Code verifizieren):
```js
import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { KFW, SAN_ENERGIE, SAN_NORMEN, SAN_TIERS, SAN_SRC_KEYS,
         LAND_F, LAND_BONUS_FQ, LAND_BONUS_CAP, ENERGIE_KLASSEN, BL_O }
  from "../../data.js";
import { LEG } from "../../i18n/legal.js";
import { fmt, fmtE } from "../../utils/helpers.js";
import { F, Sel, Row, Sec, KPI, VT } from "../ui/atoms.jsx";
import { AccordionSection } from "../ui/AccordionSection.jsx";
```

In App.jsx ersetzen durch:
```js
import Sanier from "./components/calculators/Sanier.jsx";
```

Build + Commit: `"refactor: extract Sanier to src/components/calculators/"`

### 🏁 Meilenstein 3 erreicht
```
Messung nach Sprint 3:
  App.jsx Größe:   ~80KB (war 652KB)   ✓
  Vite Chunks:     5+ separate Chunks  ✓
  Code Splitting:  aktiv               ✓
  Build:           fehlerfrei          ✓
  Commits:         24 gesamt           ✓
```

---

---

# PHASE 4 — Extras & Shell

**Ziel:** Bonus-Tools, Landing Page und App-Shell-Komponenten extrahieren.
**Risiko:** Niedrig bis Mittel.
**Ergebnis:** App.jsx enthält nur noch Root-Glue-Code (~150 Zeilen).

## Sprint 4 — Extras, Landing, Shell

**Umfang:** 9 Tasks · geschätzte Dauer: ~1,5 Stunden

### 🏁 Meilenstein 4: App.jsx auf < 200 Zeilen
> Erreichbar nach Task 33. App.jsx ist nur noch Routing + Provider.

---

### Task 25 — `src/components/extras/SteuerTrick.jsx`

**Quelle:** App.jsx Z.2383–2545 (InfoTooltip Z.2383–2425 + SteuerTrick Z.2426–2545)

Exporte: `SteuerTrick` (InfoTooltip bleibt intern)

Imports:
```js
import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { STEUER_T } from "../../i18n/steuerTrick.js";
import { T } from "../../i18n/translations.js";
import { fmt } from "../../utils/helpers.js";
import { ExportPDF } from "../export/ExportPDF.jsx";
```
(am Code verifizieren)

In App.jsx ersetzen durch:
```js
import { SteuerTrick } from "./components/extras/SteuerTrick.jsx";
```

Build + Commit: `"refactor: extract SteuerTrick to src/components/extras/"`

---

### Task 26 — `src/components/extras/Vorfaelligkeit.jsx`

**Quelle:** App.jsx Z.2567–2805

Exporte: `Vorfaelligkeit`

Achtung: `IC` (Z.2546–2557) **bleibt in App.jsx** — nicht kopieren.

Imports:
```js
import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { VFE_T } from "../../i18n/vorfaelligkeit.js";
import { PFANDBRIEF } from "../../data.js";
import { fmt, fmtDat, addM } from "../../utils/helpers.js";
import { F, Sel, Row, Sec, KPI } from "../ui/atoms.jsx";
```
(am Code verifizieren)

In App.jsx ersetzen durch:
```js
import { Vorfaelligkeit } from "./components/extras/Vorfaelligkeit.jsx";
```

Build + Commit: `"refactor: extract Vorfaelligkeit to src/components/extras/"`

---

### Task 27 — `src/pages/Landing.jsx`

**Quelle:** App.jsx Z.2806–3125

Exporte: `Landing`

Imports: React-Hooks + `useApp` + `TL` aus `i18n/translations.js` + weitere (am Code ablesen)

In App.jsx ersetzen durch:
```js
import { Landing } from "./pages/Landing.jsx";
```

Build + Commit: `"refactor: extract Landing page to src/pages/Landing.jsx"`

---

### Task 28 — `src/components/shell/LegalModal.jsx`

**Quelle:** App.jsx Z.3131–3221 (inkl. navLink/navLinkMobile Z.3126–3130 bleiben in App.jsx; lmH3/lmP/lmUl/lmA Z.3214–3217 kommen mit nach LegalModal.jsx)

Exporte: `LegalModal`

Style-Konstanten (lmH3, lmP, lmUl, lmA) kommen ohne Export in dieselbe Datei.

Imports: React-Hooks + `useApp`

In App.jsx ersetzen durch:
```js
import { LegalModal } from "./components/shell/LegalModal.jsx";
```

Build + Commit: `"refactor: extract LegalModal to src/components/shell/"`

---

### Task 29 — `src/components/shell/Statusleiste.jsx` + `src/components/shell/OfflineBanner.jsx`

**Quelle Statusleiste:** App.jsx Z.3222–3232
**Quelle OfflineBanner:** App.jsx Z.3524–3536

Beide < 15 Zeilen → ein Task.

In App.jsx ersetzen durch:
```js
import { Statusleiste } from "./components/shell/Statusleiste.jsx";
import { OfflineBanner } from "./components/shell/OfflineBanner.jsx";
```

Build + Commit: `"refactor: extract Statusleiste + OfflineBanner to src/components/shell/"`

---

### Task 30 — `src/components/shell/Merkliste.jsx`

**Quelle:** App.jsx Z.3233–3351 (useSavedObjects Z.3233, SaveModal Z.3246, SaveBtn Z.3268, Merkliste Z.3285)

Exporte: `useSavedObjects`, `SaveModal`, `SaveBtn`, `Merkliste`

Besonderheiten (**beide beachten**):
- `import { createPortal } from "react-dom"` nötig
- `import { T } from "../../i18n/translations.js"` — direkter Import, nicht via useApp

In App.jsx ersetzen durch:
```js
import { useSavedObjects, SaveModal, SaveBtn, Merkliste }
  from "./components/shell/Merkliste.jsx";
```

Build + Commit: `"refactor: extract Merkliste to src/components/shell/"`

---

### Task 31 — `src/components/shell/ZinsAlarm.jsx`

**Quelle:** App.jsx Z.3352–3523 (showAlarmNotification Z.3352, ZinsAlarm Z.3369)

Exporte: `ZinsAlarm` (showAlarmNotification bleibt intern)

Imports: React-Hooks + `useApp` + weitere (am Code ablesen)

In App.jsx ersetzen durch:
```js
import { ZinsAlarm } from "./components/shell/ZinsAlarm.jsx";
```

Build + Commit: `"refactor: extract ZinsAlarm to src/components/shell/"`

### 🏁 Meilenstein 4 erreicht
```
Messung nach Sprint 4:
  App.jsx Zeilen:  < 200 Zeilen        ✓
  Alle Module:     extrahiert          ✓
  Build:           fehlerfrei          ✓
  Commits:         31 gesamt           ✓
```

---

---

# PHASE 5 — Finalisierung

**Ziel:** App.jsx aufräumen, Messung, manuelle Funktionskontrolle, Release Notes.
**Risiko:** Keines — nur Cleanup und Verifikation.

## Sprint 5 — Cleanup & Verifikation

**Umfang:** 2 Tasks · geschätzte Dauer: ~45 Minuten

### 🏁 Meilenstein 5 (Final): Refactoring abgeschlossen
> App.jsx < 200 Zeilen · Bundle < 200KB initial · alle Funktionen verifiziert.

---

### Task 32 — App.jsx finalisieren

Nach allen vorherigen Tasks enthält App.jsx nur noch:
- Imports (~25 Zeilen)
- `IC` icon map (Z.2534–2543, bleibt hier)
- `TAB_LABELS` (Z.3525)
- `export default function App()`: useState, zinsen-Fetch, Ctx.Provider, Tab-Routing, CSS-in-JS

**Schritt 1:** Alle Zeilen entfernen die durch Imports ersetzt wurden.

**Schritt 2:**
```powershell
npm run build
```

**Schritt 3: Bundle-Messung**
```powershell
# Größe aller generierten Chunks anzeigen
Get-ChildItem dist/assets/ | Select-Object Name, @{N='KB';E={[math]::Round($_.Length/1KB,1)}} | Sort-Object KB -Descending
```

**Schritt 4: Manuelle Funktionskontrolle im Browser**

Alle folgenden Punkte müssen fehlerfrei funktionieren:

```
□ Renditerechner — Werte eingeben, Ergebnis prüfen
□ Finanzierungsrechner — Annuität, Sondertilgung, Jahrestabelle
□ Mieterhöhungsrechner — PLZ eingeben, §558-Ergebnis prüfen
□ Sanierungsrechner — Maßnahmen togglen, Förderung berechnen
□ SteuerTrick — §6 EStG Berechnung
□ Vorfälligkeitsrechner — Berechnung
□ Sprache wechseln — alle verfügbaren Sprachen durchklicken
□ PLZ-Suche — mind. 2 verschiedene PLZ eingeben
□ Speichern in Merkliste + laden
□ ZinsAlarm setzen
□ PDF-Export
□ Offline simulieren (DevTools → Network → Offline) — App muss laden
□ Landing Page anzeigen
```

**Schritt 5:**
```powershell
(Get-Content src/App.jsx).Count
git add src/App.jsx
git commit -m "refactor: App.jsx cleanup - final state"
```

---

### Task 33 — Release Notes + Branch pushen

**Schritt 1:** `release-notes.txt` ergänzen:

```
[Version 1.6.0] [Datum]
Architektur-Refactoring: App.jsx Modularisierung

- App.jsx von 652KB / 3.660 Zeilen auf <10KB / ~150 Zeilen
- 30 neue Dateien in modularer Struktur:
    context/ · i18n/ · data/ · utils/ · components/ · pages/
- Vite Code Splitting aktiv — initialer Bundle ~150KB (war 774KB)
- Babel-Warning beseitigt
- Keine Logik-Änderungen — reine Extraktion
- Basis für Lazy Loading und iOS Capacitor-Integration
```

**Schritt 2:**
```powershell
git push origin refactor/modular-architecture
```

### 🏁 Meilenstein 5 (Final) erreicht
```
Finale Messung:
  App.jsx Zeilen:      < 200 Zeilen          ✓
  Initialer Bundle:    < 200KB               ✓  (war 774KB)
  Vite Chunks:         5+ separate Dateien   ✓
  Alle Funktionen:     verifiziert           ✓
  Commits:             33 gesamt             ✓
  Branch:              gepusht               ✓
```

---

---

## Gesamtübersicht

| Phase | Sprint | Tasks | Dauer | Meilenstein |
|---|---|---|---|---|
| Phase 1 — Foundation | Sprint 1 | Task 1–9 | ~1,5 Std | App.jsx von 652KB auf 250KB |
| Phase 2 — Shared UI | Sprint 2 | Task 10–19 | ~2 Std | Alle UI-Komponenten isoliert |
| Phase 3 — Calculators | Sprint 3 | Task 20–24 | ~1,5 Std | Code Splitting aktiv |
| Phase 4 — Extras & Shell | Sprint 4 | Task 25–31 | ~1,5 Std | App.jsx < 200 Zeilen |
| Phase 5 — Finalisierung | Sprint 5 | Task 32–33 | ~0,75 Std | Refactoring abgeschlossen |
| **Gesamt** | **5 Sprints** | **33 Tasks** | **~7 Std** | **Bundle: 774KB → ~150KB** |

> **Empfehlung:** Jeden Sprint an einem eigenen Tag durchführen. Nicht zwei Sprints hintereinander ohne Pause.
