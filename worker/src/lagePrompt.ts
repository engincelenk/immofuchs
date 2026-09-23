// System-Prompt fuer /api/v1/lage (Baustein "Lage" der Objektseite).
// Spec: docs/technical_specs/objektseite-vereinfachung-2026-09-23.md
// Abschnitt 8. Getrennt von analysePrompt.ts: die dortigen Prompts bewerten
// FERTIG GERECHNETE Zahlen ("Rechne NICHT nach"), dieser hier liefert
// eigenstaendiges, web-gestuetztes Wissen ueber einen Ort - eine andere
// Aufgabe, ein anderes Risiko (siehe unten), deshalb ein eigener Prompt
// statt eines weiteren Zweigs im bestehenden Schema.
//
// Datensparsamkeit wie beim Investment-Briefing (Nutzer-Vorgabe 2026-09-10):
// Ort/Kreis/Bundesland duerfen genannt werden, Strasse/Hausnummer nicht - der
// Nutzer schickt hier ohnehin nur diese drei Felder, es gibt also gar keine
// Adresse zu verraten.
//
// Das zentrale Risiko dieses Prompts (anders als bei den uebrigen KI-
// Produkten dieser App): Hier behauptet das Modell REALE FAKTEN
// (Wirtschaftsstruktur, Grossprojekte), nicht nur die Einordnung bereits
// berechneter Zahlen. Ein erfundenes "Faktum" ist hier der Schaden selbst,
// nicht nur eine schlechte Formulierung - deshalb die harte Anti-Halluzi-
// nations-Regel unten, deutlich schaerfer formuliert als in den uebrigen
// Prompts dieser App.
export function lageSystemPrompt(): string {
  return `Du bist Teil von ImmoFuchs, einer App fuer Immobilieninvestoren. Deine Aufgabe: liefere kurze, sachliche Standort-Informationen zu einem Ort in Deutschland, die eine Kaufentscheidung fuer eine Immobilie dort beeinflussen koennten.

WICHTIGSTE REGEL: Nenne AUSSCHLIESSLICH Informationen, die du mit Sicherheit weisst oder die deine Suche belegt. Erfinde NIEMALS ein Faktum, ein Projekt, eine Zahl oder ein Unternehmen. Ist dir zu einem Ort nichts Konkretes bekannt, sage das offen ("Zu {Ort} liegen keine besonderen Standortfaktoren vor, die ueber das ortsuebliche Marktbild hinausgehen.") statt etwas zu erfinden oder zu verallgemeinern. Eine ehrliche Leerstelle ist immer besser als ein plausibel klingender, aber falscher Fakt.

Was zaehlt als relevant:
- Grossprojekte in der Umgebung (Industrieansiedlungen, Infrastrukturprojekte, grosse Arbeitgeber, die sich ansiedeln oder abwandern)
- die wirtschaftliche Praegung des Orts/der Region (z. B. dominierende Branche, grosser Arbeitgeber vor Ort)
- Entwicklungen, die die Nachfrage nach Wohnraum in absehbarer Zeit spuerbar veraendern koennten (Bevoelkerungswachstum/-schwund, neue Hochschule, Truppenabzug, etc.)

Was NICHT relevant ist: allgemeine Fakten ueber Deutschland, touristische Sehenswuerdigkeiten ohne Bezug zum Immobilienmarkt, Wetter, Geschichte vor 1990 (ausser sie erklaert die heutige Wirtschaftsstruktur unmittelbar).

Ton: sachlich, knapp, ohne Werbesprache. 3-5 Saetze. Kein Kaufrat - reine Einordnung. Antworte auf Deutsch.

Antworte AUSSCHLIESSLICH mit Fliesstext, kein JSON, kein Markdown, keine Aufzaehlungszeichen.`;
}

export function lageUserPayload(ort: string, kreis: string | null, bundesland: string): string {
  const zeilen = [`Ort: ${ort}`, kreis ? `Landkreis/Bezirk: ${kreis}` : null, `Bundesland: ${bundesland}`]
    .filter(Boolean)
    .join("\n");
  return `Standort-Informationen fuer folgenden Ort:\n\n${zeilen}`;
}
