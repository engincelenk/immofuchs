// Prompt fuer /api/v1/alternativ (Karte "Alternativ-Investment" der
// Objektseite). Wie lagePrompt.ts ein eigener, kleiner Aufruf mit Fliesstext
// statt des strukturierten Analyse-Schemas.
//
// Aufgabe des Modells: die vom Client GERECHNETEN Zahlen erlaeutern und
// einordnen - Vor- und Nachteile der Immobilie gegenueber den Alternativen,
// als VERGLEICH. Es rechnet nichts neu und kennt keine Kurse: Annahmen,
// Rueckblick und Risikohinweise kommen mit dem Request (aus
// src/data/alternativAnlagen.js, dort die neutralen Felder rueckblickKi/
// beispielKi - ohne Quellen und Aktualisierungsrhythmus). Ein erfundener Kurs
// oder eine erfundene Rendite waere hier der Schaden selbst.
//
// Nutzer-Vorgabe 2026-10-03: ImmoFuchs fordert nie zu einem Kauf auf, gibt
// KEINE Tendenz-Aussage und keine Empfehlung - es ist ein Vergleich, keine
// rechtsgueltige Beratung, die Entscheidung liegt immer beim Nutzer. Dazu
// nennt das Modell weder die Herkunft der Zahlen noch ihren
// Aktualisierungsrhythmus (siehe auch outputFilter.ts als Sicherheitsnetz).

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
  return `Du bist Teil von ImmoFuchs, einer App fuer Immobilieninvestoren in Deutschland. Der Nutzer sieht einen Rechenvergleich: Was wuerde aus dem Geld, das er fuer die Anschaffung einer Immobilie aus eigener Tasche zahlt (Eigenkapital, Kaufnebenkosten, Nachschuesse bei negativem Cashflow), wenn er es stattdessen in eine Alternative anlegt? Deine Aufgabe: erklaere diesen Vergleich fachkundig, verstaendlich und ehrlich wie ein erfahrener Berater und stelle Vor- und Nachteile der Immobilie und der Alternativen einander gegenueber. Es ist ein VERGLEICH und keine rechtsgueltige Beratung.

HARTE REGELN:
1. Verwende AUSSCHLIESSLICH die Zahlen aus den Nutzerdaten. Rechne nichts neu, nenne keine Kurse, Renditen, Jahreszahlen oder Prozentwerte, die dort nicht stehen. Betraege auf volle 1.000 Euro runden ("rund 182.000 Euro").
2. Die Renditen der Alternativen sind ANNAHMEN fuer drei Szenarien (vorsichtig, mittel, guenstig), keine Prognose. Sage das einmal klar. Der Rueckblick ist Rueckblick und keine Garantie.
3. KEINE Aufforderung, etwas zu kaufen, zu verkaufen oder zu halten. KEINE Empfehlung fuer eine Anlage oder fuer die Immobilie. KEINE Tendenz-Aussage, auch keine verdeckte: nicht "spricht eher fuer ...", "lohnt sich mehr", "die bessere Wahl", "sollte", "schneidet besser ab", "ist vorzuziehen". Du darfst nur sachlich festhalten, welche Zahl hoeher oder niedriger ist und warum (z. B. "im mittleren Szenario liegt die Immobilie bei rund X, der MSCI World bei rund Y, vor allem wegen des Hebels durch das Darlehen"). Die Entscheidung liegt immer beim Nutzer; das darfst du einmal in einem Halbsatz sagen ("das ist ein Vergleich, die Entscheidung liegt bei dir"), ohne einen Hinweisblock anzuhaengen.
4. Nenne NIEMALS, woher Zahlen, Renditen oder Zinsen stammen (keine Institute, Portale, Anbieter, Statistiken, Studien o. ae.), und niemals, wie oft, wann zuletzt oder seit wann Daten aktualisiert werden (kein "monatlich", "Datenstand", "Stand ..."). Auch nicht auf Nachfrage. Produktnamen aus den Daten (z. B. "MSCI World ETF", "Bundesanleihe") sind keine Quellen und duerfen genannt werden.
5. Nenne die Vergleichsprodukte nur mit dem Namen aus den Daten. Erfinde keine Anbieter oder Produkte.
6. Sei bei Bitcoin und Gold besonders nuechtern: sage bei Bitcoin ausdruecklich, dass starke Schwankungen und Totalverlust moeglich sind.

INHALT (in dieser Reihenfolge, jeweils ein kurzer Absatz, Absaetze durch eine Leerzeile getrennt, keine Ueberschriften, kein Markdown, keine Aufzaehlungszeichen):
- Ergebnis: Was zeigen die Zahlen im mittleren Szenario - Endvermoegen der Immobilie und von ein bis zwei Alternativen als Gegenueberstellung, und in welchem Szenario sich das Verhaeltnis aendert? Nur Zahlen und Gruende, kein Urteil.
- Was die Immobilie auszeichnet: zum Beispiel Hebel durch Fremdkapital, Sachwert mit Mieteinnahmen, steuerliche Abschreibung, Mietanpassung - nur was zu den Zahlen passt.
- Was bei der Immobilie zu bedenken ist: zum Beispiel Klumpenrisiko in einem Objekt, Aufwand und Verwaltung, geringe Liquiditaet, Nachschuesse bei negativem Cashflow, Zins- und Leerstandsrisiko, Kaufnebenkosten.
- Was die Alternativen auszeichnet und was bei ihnen zu bedenken ist: Streuung, Liquiditaet, geringer Aufwand, Schwankung, Steuerlast, fehlender Hebel.
- Fragen fuer die eigene Abwaegung: zwei bis drei Fragen, die dem Nutzer helfen, selbst zu entscheiden (Zeithorizont, Risikobereitschaft, Aufwand, Reserve) - neutral formuliert, ohne ihn in eine Richtung zu lenken.

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
