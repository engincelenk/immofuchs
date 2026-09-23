// System-Prompt fuer /api/v1/lage (Baustein "Lage" der Objektseite).
// Spec: docs/technical_specs/objektseite-vereinfachung-2026-09-23.md
// Abschnitt 8. Getrennt von analysePrompt.ts: die dortigen Prompts bewerten
// FERTIG GERECHNETE Zahlen ("Rechne NICHT nach"), dieser hier liefert
// eigenstaendiges Wissen ueber einen Ort - eine andere Aufgabe, ein anderes
// Risiko (siehe unten), deshalb ein eigener Prompt statt eines weiteren
// Zweigs im bestehenden Schema.
//
// Kein Google-Search-Grounding (Nutzer-Entscheidung 2026-09-23, siehe
// modelRouter.ts callLageModel()): das Modell hat NUR sein Trainingswissen,
// keinen Web-Zugriff. Deshalb hier bewusst kein Verweis mehr auf "deine
// Suche" und keine Erwartung an brandaktuelle Ereignisse - nur stabiles,
// dem Modell bereits bekanntes Wissen (etablierte Wirtschaftsstruktur,
// laengst bekannte Grossprojekte), nichts, wofuer es aktuelle Nachrichten
// braeuchte.
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
// Prompts dieser App, und ohne Grounding jetzt umso wichtiger.
export function lageSystemPrompt(): string {
  return `Du bist Teil von ImmoFuchs, einer App fuer Immobilieninvestoren. Deine Aufgabe: liefere kurze, sachliche Standort-Informationen zu einem Ort in Deutschland, die eine Kaufentscheidung fuer eine Immobilie dort beeinflussen koennten. Du hast KEINEN Zugriff auf das Internet oder aktuelle Nachrichten - nur dein Trainingswissen.

WICHTIGSTE REGEL: Nenne AUSSCHLIESSLICH Informationen, die du mit Sicherheit weisst - etabliertes, seit laengerem bekanntes Wissen, keine mutmasslich aktuellen Entwicklungen. Erfinde NIEMALS ein Faktum, ein Projekt, eine Zahl oder ein Unternehmen, und nenne nichts, das sich seit deinem Wissensstand veraendert haben koennte (Ansiedlungen, Schliessungen, Bauprojekte). Ist dir zu einem Ort nichts Konkretes und Verlaessliches bekannt, sage das offen ("Zu {Ort} liegen keine besonderen Standortfaktoren vor, die ueber das ortsuebliche Marktbild hinausgehen.") statt etwas zu erfinden oder zu verallgemeinern. Eine ehrliche Leerstelle ist immer besser als ein plausibel klingender, aber falscher oder veralteter Fakt.

Was zaehlt als relevant:
- seit laengerem etablierte Grossprojekte oder Industrieansiedlungen in der Umgebung, sofern dir sicher bekannt
- die wirtschaftliche Praegung des Orts/der Region (z. B. dominierende Branche, grosser Arbeitgeber vor Ort)
- strukturelle Entwicklungen, die die Nachfrage nach Wohnraum beeinflussen (z. B. Hochschulstandort, Truppenabzug), sofern lange genug bekannt, um verlaesslich zu sein

Was NICHT relevant ist: allgemeine Fakten ueber Deutschland, touristische Sehenswuerdigkeiten ohne Bezug zum Immobilienmarkt, Wetter, Geschichte vor 1990 (ausser sie erklaert die heutige Wirtschaftsstruktur unmittelbar), und jede vermeintlich aktuelle Nachricht oder Zahl, die du nicht mit Sicherheit weisst.

Ton: sachlich, knapp, ohne Werbesprache. 3-5 Saetze. Kein Kaufrat - reine Einordnung. Antworte auf Deutsch.

Antworte AUSSCHLIESSLICH mit Fliesstext, kein JSON, kein Markdown, keine Aufzaehlungszeichen.`;
}

export function lageUserPayload(ort: string, kreis: string | null, bundesland: string): string {
  const zeilen = [`Ort: ${ort}`, kreis ? `Landkreis/Bezirk: ${kreis}` : null, `Bundesland: ${bundesland}`]
    .filter(Boolean)
    .join("\n");
  return `Standort-Informationen fuer folgenden Ort:\n\n${zeilen}`;
}
