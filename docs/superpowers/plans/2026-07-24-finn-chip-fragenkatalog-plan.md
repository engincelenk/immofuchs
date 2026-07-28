# Finn Chip-Fragenkatalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frage-Chips im Finn-Assistenten (`AssistantSheet.jsx`) von 3 statischen Vorschlägen zu einem durchblätterbaren Fragenkatalog erweitern — weiterhin 3 Fragen-Chips gleichzeitig sichtbar, plus separate `◂ Vorherige Fragen` / `Weitere Fragen ▸`-Nav-Chips, um durch einen kuratierten Fragen-Pool pro Rechner zu blättern.

**Architecture:** Ein neuer, reiner Paginierungs-Helper (`getSuggestedPage`) berechnet aus einem flachen Fragen-Pool + Seiten-Index die sichtbaren 3 Fragen sowie `hasPrev`/`hasNext`. `AssistantSheet.jsx` bekommt dafür einen neuen `page`-State (Reset bei jedem Öffnen). Die vier Rechner-Komponenten übergeben statt 3 nur noch ihren vollen kuratierten Pool als `suggested`-Prop. Neue Frage-Strings werden in `ASSISTANT_T` ergänzt (alle 5 Sprachen sofort).

**Tech Stack:** React 18, Vite, Vitest (bestehendes Testsetup — nur `src/utils/rendite.test.js` existiert als Präzedenzfall, keine Komponenten-Test-Infrastruktur vorhanden).

**Referenz-Design:** [`docs/superpowers/specs/2026-07-24-finn-chip-fragenkatalog-design.md`](../specs/2026-07-24-finn-chip-fragenkatalog-design.md)

**Hinweis zu Tests:** Diese Codebasis hat keine React-Komponenten-Test-Infrastruktur (kein React Testing Library, kein jsdom-Setup) — nur reine Funktionen werden mit Vitest getestet (Präzedenzfall: `rendite.test.js`). Dieser Plan folgt diesem Muster: die reine Paginierungslogik (Task 1) bekommt TDD-Tests, die React-Verdrahtung (Tasks 2-7) wird stattdessen in Task 9 manuell im Browser verifiziert. Neue Test-Infrastruktur wird nicht unilateral eingeführt.

---

### Task 1: Paginierungs-Helper `getSuggestedPage`

**Files:**
- Create: `src/components/assistant/suggestedPaging.js`
- Test: `src/components/assistant/suggestedPaging.test.js`

- [ ] **Step 1: Failing Test schreiben**

```javascript
import { describe, it, expect } from "vitest";
import { getSuggestedPage } from "./suggestedPaging.js";

describe("getSuggestedPage", () => {
  const pool = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];

  it("zeigt die ersten 3 Fragen auf Seite 0, ohne 'zurueck', mit 'weiter'", () => {
    const r = getSuggestedPage(pool, 0, 3);
    expect(r.items).toEqual(["q1", "q2", "q3"]);
    expect(r.hasPrev).toBe(false);
    expect(r.hasNext).toBe(true);
  });

  it("zeigt Fragen 4-6 auf Seite 1, mit 'zurueck' und 'weiter'", () => {
    const r = getSuggestedPage(pool, 1, 3);
    expect(r.items).toEqual(["q4", "q5", "q6"]);
    expect(r.hasPrev).toBe(true);
    expect(r.hasNext).toBe(true);
  });

  it("zeigt den Rest auf der letzten Seite, mit 'zurueck', ohne 'weiter'", () => {
    const r = getSuggestedPage(pool, 2, 3);
    expect(r.items).toEqual(["q7"]);
    expect(r.hasPrev).toBe(true);
    expect(r.hasNext).toBe(false);
  });

  it("liefert leere items und keine Navigation bei leerem Pool", () => {
    const r = getSuggestedPage([], 0, 3);
    expect(r.items).toEqual([]);
    expect(r.hasPrev).toBe(false);
    expect(r.hasNext).toBe(false);
  });

  it("liefert hasNext=false, wenn der Pool exakt durch pageSize teilbar ist", () => {
    const exactPool = ["a", "b", "c", "d", "e", "f"];
    const r = getSuggestedPage(exactPool, 1, 3);
    expect(r.items).toEqual(["d", "e", "f"]);
    expect(r.hasNext).toBe(false);
  });

  it("nutzt pageSize=3 als Default", () => {
    const r = getSuggestedPage(pool, 0);
    expect(r.items).toEqual(["q1", "q2", "q3"]);
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm test -- suggestedPaging`
Expected: FAIL — `Failed to resolve import "./suggestedPaging.js"` (Datei existiert noch nicht)

- [ ] **Step 3: Minimale Implementierung schreiben**

```javascript
export function getSuggestedPage(pool, page, pageSize = 3) {
  const start = page * pageSize;
  const items = pool.slice(start, start + pageSize);
  return {
    items,
    hasPrev: page > 0,
    hasNext: start + pageSize < pool.length,
  };
}
```

- [ ] **Step 4: Test ausführen, Erfolg verifizieren**

Run: `npm test -- suggestedPaging`
Expected: PASS — alle 6 Tests grün

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant/suggestedPaging.js src/components/assistant/suggestedPaging.test.js
git commit -m "feat(finn): Paginierungs-Helper fuer Fragen-Chips"
```

---

### Task 2: `SuggestedQuestionChip` um kompakte Variante erweitern

**Files:**
- Modify: `src/components/assistant/SuggestedQuestionChip.jsx`
- Modify: `src/components/assistant/assistantStyles.js`

Grund: Die Fragen-Chips sind volle Breite (Spalten-Layout). Die beiden neuen
Nav-Chips (`Vorherige`/`Weitere`) sollen nebeneinander in einer schmalen Zeile
stehen statt je eine volle Zeile zu belegen.

- [ ] **Step 1: `compact`-Prop ergänzen**

Modify `src/components/assistant/SuggestedQuestionChip.jsx` — komplette Datei ersetzen durch:

```javascript
export function SuggestedQuestionChip({ label, onClick, compact = false }) {
  return (
    <button
      onClick={onClick}
      className="if-asst-sugg-chip"
      style={{
        display: compact ? "inline-block" : "block",
        width: compact ? "auto" : "100%",
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--ca)",
        background: "var(--ca-bg)",
        border: "1px solid var(--ca-bd)",
        borderRadius: 12,
        padding: "10px 14px",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Nav-Row-CSS ergänzen**

Modify `src/components/assistant/assistantStyles.js`:

Old:
```
  .if-asst-suggested{flex:none;display:flex;flex-direction:column;gap:8px;padding:2px 14px 10px}
```

New:
```
  .if-asst-suggested{flex:none;display:flex;flex-direction:column;gap:8px;padding:2px 14px 10px}
  .if-asst-nav-row{display:flex;gap:8px}
```

- [ ] **Step 3: Kein automatisierter Test (rein präsentational)**

Keine Testinfrastruktur für Komponenten-Rendering vorhanden (siehe Plan-Kopf). Verifikation erfolgt manuell in Task 9.

- [ ] **Step 4: Commit**

```bash
git add src/components/assistant/SuggestedQuestionChip.jsx src/components/assistant/assistantStyles.js
git commit -m "feat(finn): kompakte Chip-Variante fuer Nav-Chips"
```

---

### Task 3: Paginierung in `AssistantSheet.jsx` verdrahten

**Files:**
- Modify: `src/components/assistant/AssistantSheet.jsx`
- Modify: `src/i18n/assistant.js` (neue Keys `moreQuestions`/`prevQuestions`, alle 5 Sprachen)

- [ ] **Step 1: `moreQuestions`/`prevQuestions` in `ASSISTANT_T` ergänzen**

Modify `src/i18n/assistant.js` — 5 Edits, jeweils direkt nach der Zeile `suggestQuestions: "..."` im jeweiligen Sprachblock:

`de`-Block — Old:
```
    suggestQuestions: "Schlage Fragen vor",
```
New:
```
    suggestQuestions: "Schlage Fragen vor",
    moreQuestions: "Weitere Fragen",
    prevQuestions: "Vorherige Fragen",
```

`en`-Block — Old:
```
    suggestQuestions: "Suggest questions",
```
New:
```
    suggestQuestions: "Suggest questions",
    moreQuestions: "More questions",
    prevQuestions: "Previous questions",
```

`tr`-Block — Old:
```
    suggestQuestions: "Soru öner",
```
New:
```
    suggestQuestions: "Soru öner",
    moreQuestions: "Diğer sorular",
    prevQuestions: "Önceki sorular",
```

`zh`-Block — Old:
```
    suggestQuestions: "推荐问题",
```
New:
```
    suggestQuestions: "推荐问题",
    moreQuestions: "更多问题",
    prevQuestions: "上一组问题",
```

`hi`-Block — Old:
```
    suggestQuestions: "प्रश्न सुझाएं",
```
New:
```
    suggestQuestions: "प्रश्न सुझाएं",
    moreQuestions: "और प्रश्न",
    prevQuestions: "पिछले प्रश्न",
```

- [ ] **Step 2: Import ergänzen**

Modify `src/components/assistant/AssistantSheet.jsx`:

Old:
```javascript
import { SuggestedQuestionChip } from "./SuggestedQuestionChip.jsx";
import { ASSISTANT_SHEET_CSS } from "./assistantStyles.js";
```
New:
```javascript
import { SuggestedQuestionChip } from "./SuggestedQuestionChip.jsx";
import { getSuggestedPage } from "./suggestedPaging.js";
import { ASSISTANT_SHEET_CSS } from "./assistantStyles.js";
```

- [ ] **Step 3: `page`-State + Reset-Effect + Paginierung ergänzen**

Old:
```javascript
  // Chips nur beim Erstkontakt permanent sichtbar (Vodafone-TOBi-Vorbild,
  // Nutzer-Feedback 2026-07-22) - sobald eine Frage lief, kollabieren sie zu
  // einem einzelnen "Schlage Fragen vor"-Chip, der sie bei Bedarf wieder
  // einblendet. Verhindert, dass die Chip-Liste dauerhaft Platz frisst und
  // den eigentlichen Chatverlauf verdrängt.
  const [chipsForcedOpen, setChipsForcedOpen] = useState(false);
  const showChips = messages.length === 0 || chipsForcedOpen;
  // Harte Obergrenze statt Verlass auf die Aufrufer: mehr als drei Chips
  // verdraengen den Chatverlauf, und "Schlage Fragen vor" wuerde sonst die
  // volle Liste zurueckholen (Nutzer-Feedback 2026-07-22).
  const visibleSuggested = suggested.slice(0, 3);
```
New:
```javascript
  // Chips nur beim Erstkontakt permanent sichtbar (Vodafone-TOBi-Vorbild,
  // Nutzer-Feedback 2026-07-22) - sobald eine Frage lief, kollabieren sie zu
  // einem einzelnen "Schlage Fragen vor"-Chip, der sie bei Bedarf wieder
  // einblendet. Verhindert, dass die Chip-Liste dauerhaft Platz frisst und
  // den eigentlichen Chatverlauf verdrängt.
  const [chipsForcedOpen, setChipsForcedOpen] = useState(false);
  const showChips = messages.length === 0 || chipsForcedOpen;
  // Fragenkatalog (Nutzerwunsch 2026-07-24): "suggested" ist jetzt ein
  // voller, kuratierter Fragen-Pool pro Rechner statt nur 3 Eintraegen.
  // Weiterhin harte Obergrenze von 3 sichtbaren Fragen-Chips gleichzeitig
  // (Nutzer-Feedback 2026-07-22) - "Vorherige"/"Weitere" sind eigene,
  // zusaetzliche Nav-Chips ausserhalb dieses 3er-Caps.
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (open) setPage(0);
  }, [open, rechner]);
  const { items: visibleSuggested, hasPrev, hasNext } = getSuggestedPage(suggested, page, 3);
```

- [ ] **Step 4: `page` beim Neustart zuruecksetzen**

Old:
```javascript
  const handleRestart = () => {
    reset();
    setChipsForcedOpen(false);
  };
```
New:
```javascript
  const handleRestart = () => {
    reset();
    setChipsForcedOpen(false);
    setPage(0);
  };
```

- [ ] **Step 5: Nav-Chips im JSX rendern**

Old:
```javascript
            <div className="if-asst-suggested">
              {showChips ? (
                visibleSuggested.map((label, i) => (
                  <SuggestedQuestionChip key={i} label={label} onClick={() => submit(label)} />
                ))
              ) : (
                <SuggestedQuestionChip
                  label={t.suggestQuestions}
                  onClick={() => setChipsForcedOpen(true)}
                />
              )}
            </div>
```
New:
```javascript
            <div className="if-asst-suggested">
              {showChips ? (
                <>
                  {visibleSuggested.map((label, i) => (
                    <SuggestedQuestionChip key={i} label={label} onClick={() => submit(label)} />
                  ))}
                  {(hasPrev || hasNext) && (
                    <div className="if-asst-nav-row">
                      {hasPrev && (
                        <SuggestedQuestionChip
                          compact
                          label={`◂ ${t.prevQuestions}`}
                          onClick={() => setPage((p) => p - 1)}
                        />
                      )}
                      {hasNext && (
                        <SuggestedQuestionChip
                          compact
                          label={`${t.moreQuestions} ▸`}
                          onClick={() => setPage((p) => p + 1)}
                        />
                      )}
                    </div>
                  )}
                </>
              ) : (
                <SuggestedQuestionChip
                  label={t.suggestQuestions}
                  onClick={() => setChipsForcedOpen(true)}
                />
              )}
            </div>
```

- [ ] **Step 6: Bestehende Tests laufen lassen (Regressionscheck)**

Run: `npm test`
Expected: PASS — bestehende `rendite.test.js`- und neue `suggestedPaging.test.js`-Suiten grün. Kein automatisierter Test deckt `AssistantSheet.jsx` selbst ab (siehe Plan-Kopf) — manuelle Verifikation folgt in Task 9.

- [ ] **Step 7: Commit**

```bash
git add src/components/assistant/AssistantSheet.jsx src/i18n/assistant.js
git commit -m "feat(finn): Vor/Zurueck-Paginierung fuer Frage-Chips verdrahten"
```

---

### Task 4: Renditerechner — Fragen-Pool (15 Fragen, 5 Sprachen)

**Files:**
- Modify: `src/i18n/assistant.js`
- Modify: `src/components/calculators/Renditerechner.jsx`

- [ ] **Step 1: Neue Keys `suggested6`-`suggested15` ergänzen (alle 5 Sprachen)**

Modify `src/i18n/assistant.js`, 5 Edits — jeweils direkt nach `suggested5: "..."` im jeweiligen Sprachblock (unmittelbar vor `finSuggested1: "..."`):

`de`-Block — Old:
```
    suggested5: "Was passiert nach Verkauf in {jahre} Jahren?",
    finSuggested1: "Was passiert nach der Zinsbindung?",
```
New:
```
    suggested5: "Was passiert nach Verkauf in {jahre} Jahren?",
    suggested6: "Warum ist das Verdikt bei mir \"Nein\" (bzw. \"Ja\")?",
    suggested7: "Ist meine Rendite gut im Vergleich zu anderen Anlagen?",
    suggested8: "Wie viel zahle ich jeden Monat drauf?",
    suggested9: "Was kann ich tun, wenn der Cashflow negativ ist?",
    suggested10: "Ist mein Beleihungsauslauf zu hoch?",
    suggested11: "Wie viel spare ich durch die AfA?",
    suggested12: "Ab welchem Jahr wird der Cashflow positiv?",
    suggested13: "Welcher Punkt im Radar ist mein schwächster?",
    suggested14: "Was bleibt mir wirklich nach dem Verkauf übrig?",
    suggested15: "Warum ist mein Risiko-Score so hoch/niedrig?",
    finSuggested1: "Was passiert nach der Zinsbindung?",
```

`en`-Block — Old:
```
    suggested5: "What happens after selling in {jahre} years?",
    finSuggested1: "What happens after the fixed-rate period?",
```
New:
```
    suggested5: "What happens after selling in {jahre} years?",
    suggested6: "Why is the verdict \"No\" (or \"Yes\") for me?",
    suggested7: "Is my yield good compared to other investments?",
    suggested8: "How much do I pay out of pocket each month?",
    suggested9: "What can I do if the cash flow is negative?",
    suggested10: "Is my loan-to-value too high?",
    suggested11: "How much do I save through depreciation (AfA)?",
    suggested12: "From which year does the cash flow turn positive?",
    suggested13: "Which point on the radar is my weakest?",
    suggested14: "What's really left for me after selling?",
    suggested15: "Why is my risk score so high/low?",
    finSuggested1: "What happens after the fixed-rate period?",
```

`tr`-Block — Old:
```
    suggested5: "{jahre} yıl sonra satarsam ne olur?",
    finSuggested1: "Sabit faiz döneminden sonra ne olur?",
```
New:
```
    suggested5: "{jahre} yıl sonra satarsam ne olur?",
    suggested6: "Neden benim için karar \"Hayır\" (ya da \"Evet\")?",
    suggested7: "Getirim diğer yatırımlara göre iyi mi?",
    suggested8: "Her ay cebimden ne kadar ödüyorum?",
    suggested9: "Nakit akışı negatifse ne yapabilirim?",
    suggested10: "Kredi/değer oranım çok mu yüksek?",
    suggested11: "Amortisman (AfA) ile ne kadar tasarruf ediyorum?",
    suggested12: "Nakit akışı hangi yıldan itibaren pozitife dönüyor?",
    suggested13: "Radar grafiğindeki en zayıf noktam hangisi?",
    suggested14: "Satıştan sonra elimde gerçekten ne kalır?",
    suggested15: "Risk skorum neden bu kadar yüksek/düşük?",
    finSuggested1: "Sabit faiz döneminden sonra ne olur?",
```

`zh`-Block — Old:
```
    suggested5: "{jahre}年后卖出会怎样？",
    finSuggested1: "固定利率期结束后会怎样？",
```
New:
```
    suggested5: "{jahre}年后卖出会怎样？",
    suggested6: "为什么我的结论是"否"（或"是"）？",
    suggested7: "与其他投资相比，我的收益率好吗？",
    suggested8: "我每个月要自己贴多少钱？",
    suggested9: "如果现金流是负的，我能做什么？",
    suggested10: "我的贷款成数是不是太高了？",
    suggested11: "通过折旧（AfA）我能省多少？",
    suggested12: "从哪一年起现金流会转正？",
    suggested13: "雷达图中我最薄弱的一项是什么？",
    suggested14: "卖出后我真正能剩下多少？",
    suggested15: "为什么我的风险评分这么高/低？",
    finSuggested1: "固定利率期结束后会怎样？",
```

`hi`-Block — Old:
```
    suggested5: "{jahre} साल बाद बेचने पर क्या होगा?",
    finSuggested1: "निश्चित दर अवधि के बाद क्या होगा?",
```
New:
```
    suggested5: "{jahre} साल बाद बेचने पर क्या होगा?",
    suggested6: "मेरे लिए फैसला \"नहीं\" (या \"हाँ\") क्यों है?",
    suggested7: "क्या अन्य निवेशों की तुलना में मेरा रिटर्न अच्छा है?",
    suggested8: "मुझे हर महीने अपनी जेब से कितना देना पड़ता है?",
    suggested9: "अगर कैश फ़्लो नेगेटिव है तो मैं क्या कर सकता हूँ?",
    suggested10: "क्या मेरा ऋण-मूल्य अनुपात बहुत ज़्यादा है?",
    suggested11: "AfA (मूल्यह्रास) से मुझे कितनी बचत होती है?",
    suggested12: "किस साल से कैश फ़्लो पॉज़िटिव हो जाता है?",
    suggested13: "रडार में मेरा सबसे कमज़ोर बिंदु कौन सा है?",
    suggested14: "बेचने के बाद मेरे पास वास्तव में क्या बचता है?",
    suggested15: "मेरा जोखिम स्कोर इतना ज़्यादा/कम क्यों है?",
    finSuggested1: "निश्चित दर अवधि के बाद क्या होगा?",
```

Hinweis: in JS-Doppelquote-Strings müssen wörtliche `"` als `\"` escaped werden
(siehe `suggested6`/`suggested10` in `de`/`en`/`tr`/`hi`). Im `zh`-Block werden
bewusst die chinesischen Anführungszeichen „ " " " ("„"/"""), nicht ASCII-`"`,
verwendet — dort ist kein Escaping nötig.

- [ ] **Step 2: `suggested`-Array in `Renditerechner.jsx` auf vollen Pool erweitern**

Old:
```javascript
          // Auf die 3 entscheidungsrelevanten Fragen gekuerzt (Nutzerwunsch
          // 2026-07-22) - Begriffsdefinition (suggested3) und Verkaufs-
          // szenario (suggested5) sind ueber das Freitextfeld erreichbar.
          const suggested = [
            tpl(at.suggested1, { ampel: at["tier_" + nrTier] || nrTier }),
            at.suggested2,
            at.suggested4,
          ];
```
New:
```javascript
          // Fragenkatalog (Nutzerwunsch 2026-07-24): voller kuratierter Pool
          // statt nur 3 Fragen - Blaettern uebernimmt AssistantSheet.jsx.
          const suggested = [
            tpl(at.suggested1, { ampel: at["tier_" + nrTier] || nrTier }),
            at.suggested2,
            at.suggested4,
            at.suggested3,
            tpl(at.suggested5, { jahre: d.jahre || 10 }),
            at.suggested6,
            at.suggested7,
            at.suggested8,
            at.suggested9,
            at.suggested10,
            at.suggested11,
            at.suggested12,
            at.suggested13,
            at.suggested14,
            at.suggested15,
          ];
```

- [ ] **Step 3: Tests laufen lassen (Regressionscheck)**

Run: `npm test`
Expected: PASS (i18n-Datenänderung, keine Logikänderung — reine Regressionsabsicherung)

- [ ] **Step 4: Commit**

```bash
git add src/i18n/assistant.js src/components/calculators/Renditerechner.jsx
git commit -m "feat(finn): Fragenkatalog fuer Renditerechner (15 Fragen, 5 Sprachen)"
```

---

### Task 5: Finanzierungsrechner — Fragen-Pool (12 Fragen, 5 Sprachen)

**Files:**
- Modify: `src/i18n/assistant.js`
- Modify: `src/components/calculators/Finanzierung.jsx`

- [ ] **Step 1: Neue Keys `finSuggested4`-`finSuggested12` ergänzen (alle 5 Sprachen)**

Modify `src/i18n/assistant.js`, 5 Edits — jeweils direkt nach `finSuggested3: "..."`, vor `mieteSuggested1: "..."`:

`de`-Block — Old:
```
    finSuggested3: "Was bedeutet mein Beleihungsauslauf für die Konditionen?",
    mieteSuggested1: "Wann darf ich als nächstes erhöhen?",
```
New:
```
    finSuggested3: "Was bedeutet mein Beleihungsauslauf für die Konditionen?",
    finSuggested4: "Warum ist meine Rate so hoch?",
    finSuggested5: "Was ist der Unterschied zwischen Zins und Tilgung?",
    finSuggested6: "Warum zahle ich am Ende viel mehr zurück, als ich mir geliehen habe?",
    finSuggested7: "Was sind Nebenkosten und warum kommen die extra dazu?",
    finSuggested8: "Wie komme ich auf bessere Konditionen?",
    finSuggested9: "Wie viel spare ich wirklich an Zinsen?",
    finSuggested10: "Warum sinkt die Restschuld am Anfang so langsam?",
    finSuggested11: "Ist meine Zinsbindung zu kurz gewählt?",
    finSuggested12: "Was, wenn die Zinsen bei der Anschlussfinanzierung steigen?",
    mieteSuggested1: "Wann darf ich als nächstes erhöhen?",
```

`en`-Block — Old:
```
    finSuggested3: "What does my loan-to-value mean for my rate?",
    mieteSuggested1: "When can I raise the rent next?",
```
New:
```
    finSuggested3: "What does my loan-to-value mean for my rate?",
    finSuggested4: "Why is my installment so high?",
    finSuggested5: "What's the difference between interest and repayment?",
    finSuggested6: "Why do I pay back much more in the end than I borrowed?",
    finSuggested7: "What are closing costs and why are they extra?",
    finSuggested8: "How do I get better terms?",
    finSuggested9: "How much do I really save on interest?",
    finSuggested10: "Why does the remaining debt fall so slowly at first?",
    finSuggested11: "Is my fixed-rate period too short?",
    finSuggested12: "What if interest rates rise for the follow-up financing?",
    mieteSuggested1: "When can I raise the rent next?",
```

`tr`-Block — Old:
```
    finSuggested3: "Kredi/değer oranım faiz koşullarım için ne anlama geliyor?",
    mieteSuggested1: "Bir sonraki kira artışını ne zaman yapabilirim?",
```
New:
```
    finSuggested3: "Kredi/değer oranım faiz koşullarım için ne anlama geliyor?",
    finSuggested4: "Taksitim neden bu kadar yüksek?",
    finSuggested5: "Faiz ve anapara ödemesi arasındaki fark nedir?",
    finSuggested6: "Neden sonunda borç aldığımdan çok daha fazlasını geri ödüyorum?",
    finSuggested7: "Ek masraflar nedir ve neden ayrıca ekleniyor?",
    finSuggested8: "Daha iyi koşullara nasıl ulaşabilirim?",
    finSuggested9: "Faizden gerçekten ne kadar tasarruf ediyorum?",
    finSuggested10: "Kalan borç başlangıçta neden bu kadar yavaş azalıyor?",
    finSuggested11: "Sabit faiz dönemim çok mu kısa seçildi?",
    finSuggested12: "Yeniden finansmanda faizler yükselirse ne olur?",
    mieteSuggested1: "Bir sonraki kira artışını ne zaman yapabilirim?",
```

`zh`-Block — Old:
```
    finSuggested3: "我的贷款成数对利率条件意味着什么？",
    mieteSuggested1: "我下次何时可以涨租？",
```
New:
```
    finSuggested3: "我的贷款成数对利率条件意味着什么？",
    finSuggested4: "为什么我的月供这么高？",
    finSuggested5: "利息和还本之间有什么区别？",
    finSuggested6: "为什么最终还款总额比借款金额多很多？",
    finSuggested7: "附加费用是什么，为什么要额外收取？",
    finSuggested8: "我怎样才能获得更好的条件？",
    finSuggested9: "我实际上能省下多少利息？",
    finSuggested10: "为什么一开始剩余债务下降得这么慢？",
    finSuggested11: "我的固定利率期是不是选得太短了？",
    finSuggested12: "如果续贷时利率上升会怎样？",
    mieteSuggested1: "我下次何时可以涨租？",
```

`hi`-Block — Old:
```
    finSuggested3: "मेरा ऋण-मूल्य अनुपात मेरी शर्तों के लिए क्या मायने रखता है?",
    mieteSuggested1: "मैं अगली बार किराया कब बढ़ा सकता हूँ?",
```
New:
```
    finSuggested3: "मेरा ऋण-मूल्य अनुपात मेरी शर्तों के लिए क्या मायने रखता है?",
    finSuggested4: "मेरी किस्त इतनी अधिक क्यों है?",
    finSuggested5: "ब्याज और मूलधन भुगतान में क्या अंतर है?",
    finSuggested6: "आख़िर में मैं उधार से कहीं ज़्यादा वापस क्यों चुकाता हूँ?",
    finSuggested7: "अतिरिक्त लागतें क्या हैं और वे अलग से क्यों जुड़ती हैं?",
    finSuggested8: "मुझे बेहतर शर्तें कैसे मिल सकती हैं?",
    finSuggested9: "मैं वास्तव में ब्याज पर कितनी बचत करता हूँ?",
    finSuggested10: "शुरुआत में बकाया राशि इतनी धीरे क्यों घटती है?",
    finSuggested11: "क्या मेरी निश्चित ब्याज दर अवधि बहुत छोटी चुनी गई है?",
    finSuggested12: "अगर आगे की फाइनेंसिंग में ब्याज दरें बढ़ जाएं तो क्या होगा?",
    mieteSuggested1: "मैं अगली बार किराया कब बढ़ा सकता हूँ?",
```

- [ ] **Step 2: `suggested`-Array in `Finanzierung.jsx` auf vollen Pool erweitern**

Old:
```javascript
          const suggested = [at.finSuggested1, at.finSuggested2, at.finSuggested3];
```
New:
```javascript
          const suggested = [
            at.finSuggested1,
            at.finSuggested2,
            at.finSuggested3,
            at.finSuggested4,
            at.finSuggested5,
            at.finSuggested6,
            at.finSuggested7,
            at.finSuggested8,
            at.finSuggested9,
            at.finSuggested10,
            at.finSuggested11,
            at.finSuggested12,
          ];
```

- [ ] **Step 3: Tests laufen lassen**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/i18n/assistant.js src/components/calculators/Finanzierung.jsx
git commit -m "feat(finn): Fragenkatalog fuer Finanzierungsrechner (12 Fragen, 5 Sprachen)"
```

---

### Task 6: Mieterhöhungsrechner — Fragen-Pool (10 Fragen, 5 Sprachen)

**Files:**
- Modify: `src/i18n/assistant.js`
- Modify: `src/components/calculators/Miete.jsx`

- [ ] **Step 1: Neue Keys `mieteSuggested4`-`mieteSuggested10` ergänzen (alle 5 Sprachen)**

Modify `src/i18n/assistant.js`, 5 Edits — jeweils direkt nach `mieteSuggested3: "..."`, vor `sanSuggested1: "..."`:

`de`-Block — Old:
```
    mieteSuggested3: "Was, wenn der Mieter widerspricht?",
    sanSuggested1: "Welche Maßnahme bringt am meisten?",
```
New:
```
    mieteSuggested3: "Was, wenn der Mieter widerspricht?",
    mieteSuggested4: "Was ist die Kappungsgrenze überhaupt?",
    mieteSuggested5: "Warum gelten bei mir 15 % und nicht 20 %?",
    mieteSuggested6: "Woher weiß ich, was die Vergleichsmiete für meine Wohnung ist?",
    mieteSuggested7: "Wie viel darf ich maximal draufschlagen?",
    mieteSuggested8: "Muss ich die Erhöhung schriftlich ankündigen?",
    mieteSuggested9: "Liegt meine Miete wirklich deutlich unter dem Marktniveau?",
    mieteSuggested10: "Warum darf ich trotzdem nicht sofort erhöhen?",
    sanSuggested1: "Welche Maßnahme bringt am meisten?",
```

`en`-Block — Old:
```
    mieteSuggested3: "What if the tenant objects?",
    sanSuggested1: "Which measure gives the most benefit?",
```
New:
```
    mieteSuggested3: "What if the tenant objects?",
    mieteSuggested4: "What exactly is the rent cap?",
    mieteSuggested5: "Why does 15% apply to me and not 20%?",
    mieteSuggested6: "How do I find out the comparative rent for my apartment?",
    mieteSuggested7: "How much am I allowed to raise it at most?",
    mieteSuggested8: "Do I have to announce the increase in writing?",
    mieteSuggested9: "Is my rent really well below market level?",
    mieteSuggested10: "Why can't I raise it right away anyway?",
    sanSuggested1: "Which measure gives the most benefit?",
```

`tr`-Block — Old:
```
    mieteSuggested3: "Kiracı itiraz ederse ne olur?",
    sanSuggested1: "Hangi önlem en çok fayda sağlar?",
```
New:
```
    mieteSuggested3: "Kiracı itiraz ederse ne olur?",
    mieteSuggested4: "Kira artış üst sınırı tam olarak nedir?",
    mieteSuggested5: "Neden benim için %20 değil %15 geçerli?",
    mieteSuggested6: "Dairem için emsal kirayı nasıl öğrenebilirim?",
    mieteSuggested7: "En fazla ne kadar artış yapabilirim?",
    mieteSuggested8: "Artışı yazılı olarak bildirmem gerekiyor mu?",
    mieteSuggested9: "Kiram gerçekten piyasa seviyesinin çok altında mı?",
    mieteSuggested10: "Yine de neden hemen artıramıyorum?",
    sanSuggested1: "Hangi önlem en çok fayda sağlar?",
```

`zh`-Block — Old:
```
    mieteSuggested3: "如果租户提出异议怎么办？",
    sanSuggested1: "哪项措施收益最大？",
```
New:
```
    mieteSuggested3: "如果租户提出异议怎么办？",
    mieteSuggested4: "涨租上限到底是什么？",
    mieteSuggested5: "为什么我适用的是15%而不是20%？",
    mieteSuggested6: "我怎么知道我房子的可比租金是多少？",
    mieteSuggested7: "我最多可以涨多少？",
    mieteSuggested8: "我必须书面通知涨租吗？",
    mieteSuggested9: "我的租金真的明显低于市场水平吗？",
    mieteSuggested10: "为什么即便如此我也不能立刻涨租？",
    sanSuggested1: "哪项措施收益最大？",
```

`hi`-Block — Old:
```
    mieteSuggested3: "यदि किरायेदार आपत्ति करे तो?",
    sanSuggested1: "कौन सा उपाय सबसे ज़्यादा फ़ायदा देता है?",
```
New:
```
    mieteSuggested3: "यदि किरायेदार आपत्ति करे तो?",
    mieteSuggested4: "किराया सीमा (कैपिंग लिमिट) आख़िर है क्या?",
    mieteSuggested5: "मेरे मामले में 20% की बजाय 15% क्यों लागू होता है?",
    mieteSuggested6: "मुझे अपने फ्लैट के लिए तुलनीय किराया कैसे पता चलेगा?",
    mieteSuggested7: "मैं अधिकतम कितना किराया बढ़ा सकता हूँ?",
    mieteSuggested8: "क्या मुझे बढ़ोतरी की सूचना लिखित में देनी होगी?",
    mieteSuggested9: "क्या मेरा किराया वाकई बाज़ार स्तर से काफ़ी कम है?",
    mieteSuggested10: "फिर भी मैं तुरंत किराया क्यों नहीं बढ़ा सकता?",
    sanSuggested1: "कौन सा उपाय सबसे ज़्यादा फ़ायदा देता है?",
```

- [ ] **Step 2: `suggested`-Array in `Miete.jsx` auf vollen Pool erweitern**

Old:
```javascript
          const suggested = [at.mieteSuggested1, at.mieteSuggested2, at.mieteSuggested3];
```
New:
```javascript
          const suggested = [
            at.mieteSuggested1,
            at.mieteSuggested2,
            at.mieteSuggested3,
            at.mieteSuggested4,
            at.mieteSuggested5,
            at.mieteSuggested6,
            at.mieteSuggested7,
            at.mieteSuggested8,
            at.mieteSuggested9,
            at.mieteSuggested10,
          ];
```

- [ ] **Step 3: Tests laufen lassen**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/i18n/assistant.js src/components/calculators/Miete.jsx
git commit -m "feat(finn): Fragenkatalog fuer Mieterhoehungsrechner (10 Fragen, 5 Sprachen)"
```

---

### Task 7: Sanierungsrechner — Fragen-Pool (14 Fragen, 5 Sprachen)

**Files:**
- Modify: `src/i18n/assistant.js`
- Modify: `src/components/calculators/Sanier.jsx`

- [ ] **Step 1: Neue Keys `sanSuggested4`-`sanSuggested14` ergänzen (alle 5 Sprachen)**

Modify `src/i18n/assistant.js`, 5 Edits — jeweils direkt nach `sanSuggested3: "..."`, vor `steuerSuggested1: "..."`:

`de`-Block — Old:
```
    sanSuggested3: "Muss ich den Förderantrag vor Beauftragung stellen?",
    steuerSuggested1: "Wie funktioniert der §6-Trick?",
```
New:
```
    sanSuggested3: "Muss ich den Förderantrag vor Beauftragung stellen?",
    sanSuggested4: "Was bleibt nach Abzug der Förderung wirklich übrig, was ich zahlen muss?",
    sanSuggested5: "Was ist der Unterschied zwischen BAFA und KfW?",
    sanSuggested6: "Bin ich gesetzlich verpflichtet, überhaupt zu sanieren?",
    sanSuggested7: "Was bedeutet GEG?",
    sanSuggested8: "Was heißt Energieeffizienzklasse überhaupt?",
    sanSuggested9: "Wie viel verbessert sich meine Klasse durch die Maßnahmen?",
    sanSuggested10: "Wie viel spare ich wirklich im Jahr an Heizkosten?",
    sanSuggested11: "Was ist ein Sanierungsfahrplan, und bringt er mir mehr Förderung?",
    sanSuggested12: "Sollte ich schrittweise sanieren oder alles auf einmal?",
    sanSuggested13: "Brauche ich einen Energieberater?",
    sanSuggested14: "Lohnt sich eine PV-Anlage mit Batteriespeicher zusätzlich?",
    steuerSuggested1: "Wie funktioniert der §6-Trick?",
```

`en`-Block — Old:
```
    sanSuggested3: "Do I need to apply for funding before hiring a contractor?",
    steuerSuggested1: "How does the §6 trick work?",
```
New:
```
    sanSuggested3: "Do I need to apply for funding before hiring a contractor?",
    sanSuggested4: "After the funding is deducted, what do I really still have to pay?",
    sanSuggested5: "What's the difference between BAFA and KfW?",
    sanSuggested6: "Am I legally required to renovate at all?",
    sanSuggested7: "What does GEG (Buildings Energy Act) mean?",
    sanSuggested8: "What does energy efficiency class actually mean?",
    sanSuggested9: "How much does my class improve through the measures?",
    sanSuggested10: "How much do I really save on heating costs per year?",
    sanSuggested11: "What is a renovation roadmap (iSFP), and does it get me more funding?",
    sanSuggested12: "Should I renovate step by step or all at once?",
    sanSuggested13: "Do I need an energy consultant?",
    sanSuggested14: "Is a solar system with battery storage worth adding?",
    steuerSuggested1: "How does the §6 trick work?",
```

`tr`-Block — Old:
```
    sanSuggested3: "Yükleniciyle anlaşmadan önce teşvik başvurusu yapmalı mıyım?",
    steuerSuggested1: "§6 hilesi nasıl çalışır?",
```
New:
```
    sanSuggested3: "Yükleniciyle anlaşmadan önce teşvik başvurusu yapmalı mıyım?",
    sanSuggested4: "Teşvik düşüldükten sonra gerçekten ne kadar ödemem gerekiyor?",
    sanSuggested5: "BAFA ve KfW arasındaki fark nedir?",
    sanSuggested6: "Yasal olarak tadilat yapmak zorunda mıyım?",
    sanSuggested7: "GEG (Bina Enerji Kanunu) ne anlama geliyor?",
    sanSuggested8: "Enerji verimlilik sınıfı tam olarak ne demek?",
    sanSuggested9: "Önlemlerle sınıfım ne kadar iyileşiyor?",
    sanSuggested10: "Yılda ısıtma masraflarından gerçekten ne kadar tasarruf ediyorum?",
    sanSuggested11: "Tadilat yol haritası (iSFP) nedir ve daha fazla teşvik sağlar mı?",
    sanSuggested12: "Adım adım mı yoksa hepsini birden mi tadilat yapmalıyım?",
    sanSuggested13: "Bir enerji danışmanına ihtiyacım var mı?",
    sanSuggested14: "Bataryalı bir güneş enerjisi sistemi eklemeye değer mi?",
    steuerSuggested1: "§6 hilesi nasıl çalışır?",
```

`zh`-Block — Old:
```
    sanSuggested3: "委托施工前必须先申请补贴吗？",
    steuerSuggested1: "§6避税方法是如何运作的？",
```
New:
```
    sanSuggested3: "委托施工前必须先申请补贴吗？",
    sanSuggested4: "扣除补贴后，我实际上还需要支付多少？",
    sanSuggested5: "BAFA和KfW有什么区别？",
    sanSuggested6: "我在法律上有翻新的义务吗？",
    sanSuggested7: "GEG（建筑能源法）是什么意思？",
    sanSuggested8: "能效等级到底是什么意思？",
    sanSuggested9: "通过这些措施我的等级能提高多少？",
    sanSuggested10: "每年在取暖费用上我实际能省多少？",
    sanSuggested11: "什么是改造路线图（iSFP），它能帮我拿到更多补贴吗？",
    sanSuggested12: "我应该分步翻新还是一次性全部完成？",
    sanSuggested13: "我需要能源顾问吗？",
    sanSuggested14: "加装带电池储能的光伏系统划算吗？",
    steuerSuggested1: "§6避税方法是如何运作的？",
```

`hi`-Block — Old:
```
    sanSuggested3: "क्या ठेकेदार को नियुक्त करने से पहले सब्सिडी के लिए आवेदन करना ज़रूरी है?",
    steuerSuggested1: "§6 ट्रिक कैसे काम करती है?",
```
New:
```
    sanSuggested3: "क्या ठेकेदार को नियुक्त करने से पहले सब्सिडी के लिए आवेदन करना ज़रूरी है?",
    sanSuggested4: "सब्सिडी घटाने के बाद मुझे वास्तव में कितना भुगतान करना होगा?",
    sanSuggested5: "BAFA और KfW में क्या अंतर है?",
    sanSuggested6: "क्या मैं कानूनी रूप से नवीनीकरण करने के लिए बाध्य हूँ?",
    sanSuggested7: "GEG (भवन ऊर्जा अधिनियम) का क्या मतलब है?",
    sanSuggested8: "ऊर्जा दक्षता श्रेणी का वास्तव में क्या अर्थ है?",
    sanSuggested9: "इन उपायों से मेरी श्रेणी कितनी सुधरती है?",
    sanSuggested10: "हीटिंग लागत में मैं सालाना वास्तव में कितनी बचत करता हूँ?",
    sanSuggested11: "सुधार रोडमैप (iSFP) क्या है, और क्या इससे ज़्यादा सब्सिडी मिलती है?",
    sanSuggested12: "क्या मुझे चरणबद्ध तरीके से नवीनीकरण करना चाहिए या एक साथ?",
    sanSuggested13: "क्या मुझे ऊर्जा सलाहकार की ज़रूरत है?",
    sanSuggested14: "बैटरी स्टोरेज वाला सोलर सिस्टम लगाना फ़ायदेमंद है क्या?",
    steuerSuggested1: "§6 ट्रिक कैसे काम करती है?",
```

- [ ] **Step 2: `suggested`-Array in `Sanier.jsx` auf vollen Pool erweitern**

Old:
```javascript
          const suggested = [at.sanSuggested1, at.sanSuggested2, at.sanSuggested3];
```
New:
```javascript
          const suggested = [
            at.sanSuggested1,
            at.sanSuggested2,
            at.sanSuggested3,
            at.sanSuggested4,
            at.sanSuggested5,
            at.sanSuggested6,
            at.sanSuggested7,
            at.sanSuggested8,
            at.sanSuggested9,
            at.sanSuggested10,
            at.sanSuggested11,
            at.sanSuggested12,
            at.sanSuggested13,
            at.sanSuggested14,
          ];
```

- [ ] **Step 3: Tests laufen lassen**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/i18n/assistant.js src/components/calculators/Sanier.jsx
git commit -m "feat(finn): Fragenkatalog fuer Sanierungsrechner (14 Fragen, 5 Sprachen)"
```

---

### Task 8: Lint-Check

**Files:** keine (nur Verifikation)

- [ ] **Step 1: ESLint laufen lassen**

Run: `npm run lint`
Expected: PASS — keine neuen Lint-Fehler in den geänderten Dateien (`AssistantSheet.jsx`, `SuggestedQuestionChip.jsx`, `suggestedPaging.js`, `assistant.js`, `Renditerechner.jsx`, `Finanzierung.jsx`, `Miete.jsx`, `Sanier.jsx`)

Falls Fehler auftreten: beheben und Schritt wiederholen, kein Commit nötig (Lint ist kein eigener Task-Output).

---

### Task 9: Manuelle Browser-Verifikation (alle 4 Rechner)

**Files:** keine (nur Verifikation, kein Code)

- [ ] **Step 1: Dev-Server starten**

Preview-Tool: `preview_start` mit `{ name: "immofuchs-dev" }` (siehe `.claude/launch.json`)

- [ ] **Step 2: Renditerechner prüfen**

Navigiere zum Renditerechner, öffne den Finn-Chat (Maskottchen antippen).
Erwartet:
- Genau 3 Fragen-Chips sichtbar + 1 Chip "Weitere Fragen ▸" (kein "Vorherige"-Chip auf Seite 0, da 15 Fragen / 3 = 5 Seiten)
- Klick auf "Weitere Fragen ▸" 4×: Fragen wechseln, ab Seite 1 erscheint zusätzlich "◂ Vorherige Fragen", auf der letzten Seite (Seite 4, Fragen 13-15) verschwindet "Weitere Fragen ▸"
- Klick auf "◂ Vorherige Fragen" 4×: zurück bis Seite 0, "◂ Vorherige Fragen" verschwindet wieder
- Klick auf einen Fragen-Chip: Frage wird gestellt (Chips kollabieren zu "Fragen vorschlagen")
- Chat schließen + neu öffnen: Seite ist wieder auf 0 zurückgesetzt

- [ ] **Step 3: Finanzierungsrechner, Mieterhöhungsrechner, Sanierungsrechner prüfen**

Gleiches Verhalten wie Schritt 2, jeweils mit der entsprechenden Fragenzahl:
- Finanzierungsrechner: 12 Fragen (4 Seiten)
- Mieterhöhungsrechner: 10 Fragen (4 Seiten, letzte Seite nur 1 Frage)
- Sanierungsrechner: 14 Fragen (5 Seiten, letzte Seite nur 2 Fragen)

- [ ] **Step 4: Sprachumschaltung stichprobenartig prüfen**

Sprache auf Englisch umstellen, Renditerechner-Chat öffnen: Chips zeigen englische Fragen, Nav-Chips zeigen "More questions ▸" / "◂ Previous questions".

- [ ] **Step 5: Screenshot als Beleg**

`computer { action: "screenshot" }` vom geöffneten Finn-Chat mit sichtbaren Nav-Chips als Nachweis für den User.

---

### Task 10: Release Notes aktualisieren

**Files:**
- Modify: `release-notes.txt`

(Pflicht laut `CLAUDE.md`, Abschnitt "Nach jeder Entwicklung")

- [ ] **Step 1: Neuen Eintrag oben ergänzen**

Old (erste Zeile der Datei):
```
## 2026-07-23 (1.55.61)
```
New:
```
## 2026-07-24 (1.55.62)

### Finn: Fragen-Chips als durchblätterbarer Fragenkatalog

Bisher zeigte jeder Rechner nur 3 feste Frage-Chips. Jetzt hat jeder der 4
Rechner (Rendite, Finanzierung, Mieterhöhung, Sanierung) einen kuratierten
Fragen-Pool (10-15 Fragen) - weiterhin 3 Fragen-Chips gleichzeitig sichtbar,
plus "◂ Vorherige Fragen" / "Weitere Fragen ▸"-Chips zum Durchblättern.
Bestehende Fragen bleiben unverändert, neue Fragen sind in allen 5 Sprachen
übersetzt.

- `suggestedPaging.js` (neu): reine Paginierungslogik, getestet.
- `SuggestedQuestionChip.jsx`: neue `compact`-Variante für die Nav-Chips.
- `AssistantSheet.jsx`: `page`-State, Reset beim Öffnen/Neustart.
- `assistant.js`: 37 neue Frage-Strings + `moreQuestions`/`prevQuestions`,
  je 5 Sprachen.

## 2026-07-23 (1.55.61)
```

- [ ] **Step 2: Commit**

```bash
git add release-notes.txt
git commit -m "docs: release notes fuer Finn-Fragenkatalog"
```

---

## Plan-Selbstpruefung (durchgeführt)

- **Spec-Abdeckung:** Datenmodell (Tasks 4-7), Komponenten-Verhalten/Pagination
  (Tasks 1-3), i18n-Umfang alle 5 Sprachen (Tasks 3-7), Out-of-Scope-Punkte
  (Sections, steuer/vfe/vgl, Umformulierung bestehender Fragen) — keiner davon
  wird berührt, wie im Design festgelegt. Abgedeckt.
- **Platzhalter-Scan:** keine TBD/TODO; alle Code-Blöcke sind vollständig,
  keine "siehe Task N"-Verweise ohne Code.
- **Typ-Konsistenz:** `getSuggestedPage(pool, page, pageSize)` Signatur ist in
  Task 1 (Test+Implementierung) und Task 3 (Aufruf in `AssistantSheet.jsx`)
  identisch. `compact`-Prop-Name ist in Task 2 (Definition) und Task 3
  (Verwendung) identisch.
- **Scope-Check:** Ein zusammenhängendes Feature (Fragenkatalog-Mechanik +
  Content für 4 Rechner), passend für einen Umsetzungsdurchlauf.
