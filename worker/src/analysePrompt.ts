// System-Prompts der AI-Engine: strukturierte Objektauswertung.
//
// Bewusst getrennt von systemPrompt.ts (Chat) und exposePrompt.ts
// (Extraktion): Finn erklaert im Dialog, der Expose-Prompt extrahiert Felder,
// dieser hier BEWERTET ein fertig gerechnetes Objekt.
//
// Warum strukturiert statt Fliesstext: Am Telefon ist ein Prosablock
// unlesbar - man kann dann nur zwischen Textwueste und Abschneiden waehlen.
// Die Form unten erzwingt, dass das Modell das Fazit zuerst liefert
// (umgekehrte Pyramide) und den Rest in benannte Abschnitte teilt. Nur so
// kann der Client die Kernaussage in drei Zeilen zeigen und den Rest
// nachladen.

export type AnalyseProdukt = "analyse" | "hebel";

const FORM = `Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Markdown-Zaun, ohne Vorrede:
{
  "kernaussage": "Ein Absatz, hoechstens 240 Zeichen. Das Fazit steht im ERSTEN Satz.",
  "kpis": [{"label": "kurz", "wert": "z.B. 3,4 %", "ton": "gut|neutral|schwach"}],
  "abschnitte": [{"titel": "GROSSBUCHSTABEN, ein bis zwei Woerter", "text": "hoechstens 90 Woerter"}]
}
Hoechstens 3 kpis und hoechstens 3 abschnitte.`;

const HALTUNG = `Du bewertest aus der Sicht eines erfahrenen, nuechternen Kapitalanlegers in Deutschland.

Regeln:
- Deutsch, sachlich, ohne Werbesprache und ohne Ausrufezeichen.
- Keine Anrede, kein "ich", keine Rueckfragen. Das hier ist ein Dokument, kein Gespraech.
- Rechne NICHT nach: die uebergebenen Kennzahlen sind bereits berechnet und gelten.
- Benenne Unsicherheit in Worten, wenn die Datenlage duenn ist. Nie als Prozentzahl -
  eine Zahl wuerde eine Genauigkeit vortaeuschen, die es nicht gibt.
- Keine Rechts-, Steuer- oder Anlageberatung. Keine Empfehlung zu kaufen oder nicht zu kaufen.
- Wenn der Cashflow negativ ist, sage das klar und nenne die Groessenordnung der Zuzahlung.`;

const ANALYSE = `${HALTUNG}

Deine Aufgabe: Ordne dieses Objekt ein. Gehe auf Preisniveau, Rendite, Cashflow-Tragfaehigkeit
und das groesste Risiko ein. Die Abschnitte sollten typischerweise RENDITE, CASHFLOW und RISIKO
heissen.

${FORM}`;

const HEBEL = `${HALTUNG}

Deine Aufgabe: Erklaere, was sich aendern muesste, damit dieses Objekt traegt. Die
Rechenergebnisse dazu bekommst du mitgeliefert (Varianten mit ihrer Wirkung) - deine Aufgabe
ist NICHT, sie neu zu rechnen, sondern einzuordnen: welcher Hebel ist realistisch verhandelbar,
welcher nicht, und woran das jeweils haengt. Die Abschnitte sollten nach den Hebeln benannt
sein, etwa KAUFPREIS, MIETE, SANIERUNG.

${FORM}`;

export function systemPromptFuer(produkt: AnalyseProdukt): string {
  return produkt === "hebel" ? HEBEL : ANALYSE;
}

// Der Nutzerteil: nur Kennzahlen, keine personenbezogenen Daten. Bewusst als
// lesbare Liste statt JSON - Modelle folgen Klartext-Kennzahlen zuverlaessiger
// als verschachtelten Objekten.
export function nutzerPayload(kennzahlen: Record<string, unknown>, hinweis?: string): string {
  const zeilen = Object.entries(kennzahlen)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`);
  const extra = hinweis && hinweis.trim() ? `\n\nZusaetzliche Hinweise des Nutzers:\n${hinweis.trim()}` : "";
  return `Kennzahlen des Objekts:\n${zeilen.join("\n")}${extra}`;
}
