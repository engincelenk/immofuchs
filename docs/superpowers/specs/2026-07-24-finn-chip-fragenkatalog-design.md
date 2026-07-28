# Finn Chip-Fragenkatalog — Design (2026-07-24)

Basiert auf der Kandidatenliste in [`docs/finn-chip-fragen-2026-07-24.md`](../../finn-chip-fragen-2026-07-24.md).

## Ziel

Die Frage-Chips im Finn-Assistenten (`AssistantSheet.jsx`) sollen nicht mehr nur
3 statische Vorschläge pro Rechner zeigen, sondern einen durchblätterbaren
Fragenkatalog: weiterhin 3 Fragen-Chips gleichzeitig sichtbar, plus
Navigations-Chips, um vor und zurück durch alle kuratierten Fragen eines
Rechners zu blättern.

## Datenmodell

- Pro Rechner (Renditerechner, Finanzierungsrechner, Mieterhöhungsrechner,
  Sanierungsrechner) gibt es einen **flachen Pool** aller kuratierten Fragen —
  ohne Bezug zur ursprünglichen Section-Zuordnung aus der Kandidatenliste.
- Die 6 heute bereits verdrahteten Fragen (`suggested1-5`, `finSuggested1-3`,
  `mieteSuggested1-3`, `sanSuggested1-3`) bleiben **wortlautgleich** erhalten
  und sind Teil des jeweiligen Pools.
- Neue i18n-Keys werden in `ASSISTANT_T` (`src/i18n/assistant.js`) ergänzt,
  für alle 5 Sprachen (`de`, `en`, `tr`, `zh`, `hi`) sofort vollständig.
- Kuratierte Pools (final, nach User-Freigabe):

  **Renditerechner** (15 Fragen):
  - bestehend: `suggested1`, `suggested2` ("Was kann ich verbessern?"),
    `suggested4`, `suggested3` ("Was bedeutet Kaufpreisfaktor?"),
    `suggested5` ("Was passiert nach Verkauf in {jahre} Jahren?")
  - Warum ist das Verdikt bei mir "Nein" (bzw. "Ja")?
  - Ist meine Rendite gut im Vergleich zu anderen Anlagen?
  - Wie viel zahle ich jeden Monat drauf?
  - Was kann ich tun, wenn der Cashflow negativ ist?
  - Ist mein Beleihungsauslauf zu hoch?
  - Wie viel spare ich durch die AfA?
  - Ab welchem Jahr wird der Cashflow positiv?
  - Welcher Punkt im Radar ist mein schwächster?
  - Was bleibt mir wirklich nach dem Verkauf übrig?
  - Warum ist mein Risiko-Score so hoch/niedrig?

  **Finanzierungsrechner** (12 Fragen):
  - bestehend: `finSuggested1`, `finSuggested2`, `finSuggested3`
  - Warum ist meine Rate so hoch?
  - Was ist der Unterschied zwischen Zins und Tilgung?
  - Warum zahle ich am Ende viel mehr zurück, als ich mir geliehen habe?
  - Was sind Nebenkosten und warum kommen die extra dazu?
  - Wie komme ich auf bessere Konditionen?
  - Wie viel spare ich wirklich an Zinsen (Sondertilgung)?
  - Warum sinkt die Restschuld am Anfang so langsam?
  - Ist meine Zinsbindung zu kurz gewählt?
  - Was, wenn die Zinsen bei der Anschlussfinanzierung steigen?

  **Mieterhöhungsrechner** (10 Fragen):
  - bestehend: `mieteSuggested1`, `mieteSuggested2`, `mieteSuggested3`
  - Was ist die Kappungsgrenze überhaupt?
  - Warum gelten bei mir 15 % und nicht 20 %?
  - Woher weiß ich, was die Vergleichsmiete für meine Wohnung ist?
  - Wie viel darf ich maximal draufschlagen?
  - Muss ich die Erhöhung schriftlich ankündigen?
  - Liegt meine Miete wirklich deutlich unter dem Marktniveau?
  - Warum darf ich trotzdem nicht sofort erhöhen?

  **Sanierungsrechner** (14 Fragen):
  - bestehend: `sanSuggested1`, `sanSuggested2`, `sanSuggested3`
  - Was bleibt nach Abzug der Förderung wirklich übrig, was ich zahlen muss?
  - Was ist der Unterschied zwischen BAFA und KfW?
  - Bin ich gesetzlich verpflichtet, überhaupt zu sanieren?
  - Was bedeutet GEG?
  - Was heißt Energieeffizienzklasse überhaupt?
  - Wie viel verbessert sich meine Klasse durch die Maßnahmen?
  - Wie viel spare ich wirklich im Jahr an Heizkosten?
  - Was ist ein Sanierungsfahrplan, und bringt er mir mehr Förderung?
  - Sollte ich schrittweise sanieren oder alles auf einmal?
  - Brauche ich einen Energieberater?
  - Lohnt sich eine PV-Anlage mit Batteriespeicher zusätzlich?

- `steuerSuggested*`, `vfeSuggested*`, `vglSuggested*` (andere Rechner)
  sind **nicht Teil dieses Designs** — die Kandidatenliste deckt nur die
  vier oben genannten Rechner ab.

## Komponenten-Verhalten (`AssistantSheet.jsx`)

- Jeder Rechner übergibt künftig den vollen kuratierten Pool als `suggested`-
  Prop (statt bisher nur 3 Einträge).
- Neuer State `page` (Start `0`), zurückgesetzt auf `0` beim Öffnen des
  Sheets bzw. bei Kontextwechsel (neuer `rechner`/`kontext`).
- `visibleSuggested = pool.slice(page * 3, page * 3 + 3)` — weiterhin
  **genau 3 Fragen-Chips** gleichzeitig sichtbar (harter Cap bleibt für die
  Fragen-Chips selbst bestehen).
- Zwei zusätzliche, eigenständige Nav-Chips (zählen nicht zum 3er-Cap):
  - `◂ Vorherige Fragen` — nur sichtbar, wenn `page > 0`
  - `Weitere Fragen ▸` — nur sichtbar, wenn `(page + 1) * 3 < pool.length`
- Auf der ersten Seite fehlt der "Vorherige"-Chip, auf der letzten Seite
  fehlt der "Weitere"-Chip — kein Wrap-Around.
- Die bestehende Collapse-Logik (Chips kollabieren nach der ersten Antwort
  zu einem einzelnen "Fragen vorschlagen"-Chip, `chipsForcedOpen`) bleibt
  unverändert. Beim erneuten Aufklappen wird die zuletzt aktive `page`
  wiederhergestellt (kein Reset auf 0 durch Collapse/Expand allein).

## i18n-Umfang

- Alle neuen Fragen-Strings werden sofort in `de`, `en`, `tr`, `zh`, `hi`
  ergänzt (kein Fallback-Zwischenschritt).

## Out of Scope

- Section-bewusste Chip-Auswahl (Chips abhängig von Scroll-Position) —
  bewusst verworfen zugunsten eines einfachen, flachen Pools pro Rechner.
- Steuerrechner, Vermietungs-/Exitrechner, Vergleichsrechner
  (`steuerSuggested*`, `vfeSuggested*`, `vglSuggested*`) — nicht Teil der
  Kandidatenliste, daher hier nicht behandelt.
- Umformulierung bestehender Fragen — bleiben wortlautgleich.
