// Prompt fuer /api/v1/alternativ (Karte "Alternativ-Investment" der
// Objektseite). Wie lagePrompt.ts ein eigener, kleiner Aufruf mit Fliesstext
// statt des strukturierten Analyse-Schemas.
//
// Aufgabe des Modells: die vom Client GERECHNETEN Zahlen erlaeutern und
// einordnen - Vor- und Nachteile der Immobilie gegenueber den Alternativen.
// Es rechnet nichts neu und kennt keine Kurse: Annahmen, historische Werte
// und Risikohinweise kommen mit dem Request (aus src/data/alternativAnlagen.js),
// dort liegt die einzige Pflegestelle. Das Modell soll genau diese Zahlen
// verwenden und keine eigenen ergaenzen - ein erfundener Kurs oder eine
// erfundene Rendite waere hier der Schaden selbst.
//
// Rechtlich: Szenariovergleich, keine Anlageberatung. Der Prompt verbietet
// konkrete Kauf-/Anlageempfehlungen; der Disclaimer steht zusaetzlich fest in
// der Karte.

export interface AlternativAnlageInfo {
  name: string;
  beispiel: string;
  historie: string;
  risiko: string;
  szenarien: Record<"pess" | "basis" | "opt", { annahmePa: number; endvermoegenNachSteuer: number }>;
}

export interface AlternativNutzlast {
  horizontJahre: number;
  einsatzStart: number;
  nachschuesseGesamt: number;
  immobilie: { endvermoegenNachSteuer: number; gewinn: number; renditePa: number | null };
  anlagen: AlternativAnlageInfo[];
}

export function alternativSystemPrompt(): string {
  return `Du bist Teil von ImmoFuchs, einer App fuer Immobilieninvestoren in Deutschland. Der Nutzer sieht einen Rechenvergleich: Was wuerde aus dem Geld, das er fuer die Anschaffung einer Immobilie aus eigener Tasche zahlt (Eigenkapital, Kaufnebenkosten, Nachschuesse bei negativem Cashflow), wenn er es stattdessen in eine Alternative anlegt? Deine Aufgabe: erklaere diesen Vergleich verstaendlich und ehrlich und nenne Vor- und Nachteile der Immobilie gegenueber den Alternativen.

HARTE REGELN:
1. Verwende AUSSCHLIESSLICH die Zahlen aus den Nutzerdaten. Rechne nichts neu, nenne keine Kurse, Renditen, Jahreszahlen oder Prozentwerte, die dort nicht stehen. Betraege auf volle 1.000 Euro runden ("rund 182.000 Euro").
2. Die Renditen der Alternativen sind ANNAHMEN fuer drei Szenarien (vorsichtig, mittel, guenstig), keine Prognose. Sage das einmal klar. Die historischen Werte sind Rueckblick und keine Garantie.
3. Gib KEINE Kauf-, Verkaufs- oder Anlageempfehlung und rate weder zu einer konkreten Anlage noch zur Immobilie. Beschreibe, was jeweils dafuer und dagegen spricht und worauf es dem Nutzer persoenlich ankommen sollte. Es ist ein Szenariovergleich, keine Anlageberatung.
4. Nenne die Vergleichsprodukte nur mit dem Namen aus den Daten. Erfinde keine Anbieter oder Produkte.
5. Sei bei Bitcoin und Gold besonders nuechtern: sage bei Bitcoin ausdruecklich, dass starke Schwankungen und Totalverlust moeglich sind.

INHALT (in dieser Reihenfolge, jeweils ein kurzer Absatz, Absaetze durch eine Leerzeile getrennt, keine Ueberschriften, kein Markdown, keine Aufzaehlungszeichen):
- Ergebnis: Wie schneidet die Immobilie im mittleren Szenario gegen die Alternativen ab, und in welchem Szenario kippt das Bild? Nenne das Endvermoegen der Immobilie und eine bis zwei Alternativen als Vergleich.
- Was fuer die Immobilie spricht: zum Beispiel Hebel durch Fremdkapital, Sachwert mit Mieteinnahmen, steuerliche Abschreibung, Inflationsschutz durch Mietanpassung - nur was zu den Zahlen passt.
- Was gegen die Immobilie spricht: zum Beispiel Klumpenrisiko in einem Objekt, Aufwand und Verwaltung, geringe Liquiditaet, Nachschuesse bei negativem Cashflow, Zins- und Leerstandsrisiko, Kaufnebenkosten.
- Was fuer die Alternativen spricht und was gegen sie spricht: Streuung, Liquiditaet, geringer Aufwand gegenueber Schwankung, Steuerlast, fehlenden Hebel.
- Worauf es ankommt: zwei bis drei Fragen, die der Nutzer fuer sich beantworten sollte (Risikobereitschaft, Zeithorizont, Aufwand, Reserve).

Ton: sachlich, direkt, ohne Werbesprache, Anrede "du". Hoechstens 330 Woerter. Antworte auf Deutsch ausschliesslich mit Fliesstext.`;
}

export function alternativUserPayload(n: AlternativNutzlast): string {
  const szenario = { pess: "vorsichtig", basis: "mittel", opt: "guenstig" } as const;
  const anlagen = n.anlagen
    .map((a) => {
      const zeilen = (Object.keys(szenario) as Array<keyof typeof szenario>)
        .map(
          (s) =>
            `  ${szenario[s]}: Annahme ${a.szenarien[s].annahmePa} % p. a., Endvermoegen nach Steuer ${a.szenarien[s].endvermoegenNachSteuer} Euro`,
        )
        .join("\n");
      return `${a.name} (${a.beispiel})\n${zeilen}\n  Rueckblick: ${a.historie}\n  Risiko: ${a.risiko}`;
    })
    .join("\n\n");
  return [
    `Zeithorizont: ${n.horizontJahre} Jahre`,
    `Einsatz aus eigener Tasche zu Beginn: ${n.einsatzStart} Euro`,
    `Zusaetzliche Nachschuesse bei negativem Cashflow (gesamt): ${n.nachschuesseGesamt} Euro`,
    `Immobilie: Endvermoegen nach Steuer ${n.immobilie.endvermoegenNachSteuer} Euro, Gewinn ${n.immobilie.gewinn} Euro, rund ${n.immobilie.renditePa ?? "n. v."} % p. a. auf das eingezahlte Kapital`,
    "",
    "Alternativen (gerechnete Werte, gleiche Einzahlungen zu gleichen Zeitpunkten):",
    anlagen,
  ].join("\n");
}
