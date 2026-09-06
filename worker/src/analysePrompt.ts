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

export type AnalyseProdukt = "analyse" | "hebel" | "preis";

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

Deine Aufgabe: Erklaere, was sich aendern muesste, damit dieses Objekt traegt.

Wenn der Abschnitt "Durchgerechnete Varianten" mitgeliefert ist, sind das fertige
Rechenergebnisse aus derselben Engine wie die Kennzahlen. Uebernimm ihre Zahlen woertlich und
rechne sie NICHT nach. Deine Aufgabe ist die Einordnung: welcher Hebel ist realistisch
verhandelbar, welcher nicht, und woran das jeweils haengt.

Fehlt der Abschnitt, nenne die Hebel qualitativ und erfinde KEINE Zielwerte - eine
ausgedachte Zahl waere in einem Dokument, das der Nutzer fuer eine Verhandlung benutzt,
schaedlicher als eine fehlende.

Die Abschnitte sollten nach den Hebeln benannt sein, etwa KAUFPREIS, MIETE, SANIERUNG.

${FORM}`;

// Preiseinordnung. Bewusst KEINE Bewertung: das Modell kennt weder Lage noch
// Zustand noch Vergleichsfaelle. Es bekommt eine amtliche Ortsmiete, die
// Mietannahme des Nutzers und den daraus gerechneten Preis - und ordnet nur
// ein, was diese Abweichung fuer den Kauf bedeutet.
//
// Die harte Regel steht hier, weil genau sie den Unterschied zur
// Vorlage-App ausmacht, die einen Punktwert auf den Euro genau raten laesst.
const PREIS = `${HALTUNG}

Deine Aufgabe: Ordne die Mietannahme dieses Objekts gegen das oertliche
Mietniveau ein und sage, was das fuer den aufgerufenen Kaufpreis bedeutet.

Die mitgelieferten Werte unter "Gerechnete Werte" sind fertig berechnet.
Uebernimm sie woertlich. Nenne KEINE eigene Zahl, die dort nicht steht -
insbesondere keinen geschaetzten Verkehrswert und keinen Quadratmeterpreis,
den du selbst gebildet hast. Du bewertest die Immobilie NICHT.

Die Ortsmiete stammt aus dem Zensus 2022 und ist eine BESTANDSMIETE ueber
alle Vertragsalter. Neuvermietungen liegen darueber, in angespannten Maerkten
deutlich. Sage das, wenn die Mietannahme darueber liegt: eine Abweichung nach
oben ist nicht automatisch unrealistisch, sie ist begruendungsbeduerftig.
Moegliche Gruende sind Sanierungsstand, Ausstattung, Lage im Ort oder eine
moeblierte Vermietung.

Die Abschnitte sollten MIETNIVEAU, PREIS und RISIKO heissen.

${FORM}`;

export function systemPromptFuer(produkt: AnalyseProdukt): string {
  if (produkt === "hebel") return HEBEL;
  if (produkt === "preis") return PREIS;
  return ANALYSE;
}

// Eine durchgerechnete Variante: "Kaufpreis -14.250 EUR (neu 270.750 EUR)
// ergibt Score 78 statt 72". Die Zahlen stammen aus berechneHebelAnalyse()
// im Client, also aus derselben getesteten Rendite-/Score-Engine wie die
// Kennzahlen - das Modell ordnet sie nur ein.
export type HebelVariante = {
  feld: string;
  aenderung: string;
  neuerWert: string;
  score: number;
  deltaScore: number;
};

// Der Nutzerteil: nur Kennzahlen, keine personenbezogenen Daten. Bewusst als
// lesbare Liste statt JSON - Modelle folgen Klartext-Kennzahlen zuverlaessiger
// als verschachtelten Objekten.
//
// Die Varianten sind der zweite Block. Bis 2026-09-05 versprach der
// HEBEL-Prompt dem Modell woertlich "Die Rechenergebnisse dazu bekommst du
// mitgeliefert" - geschickt wurden sie nie. Das Modell musste also erfinden,
// was es laut Prompt nicht erfinden sollte, und durfte es laut HALTUNG
// ("Rechne NICHT nach") auch nicht ausrechnen.
// Eine fertig gerechnete Label-Wert-Zeile, wie sie der Nutzer im Zahlenblock
// sieht - Traeger des Produkts "preis".
export type GerechneteZahl = { label: string; wert: string };

export function nutzerPayload(
  kennzahlen: Record<string, unknown>,
  hinweis?: string,
  varianten?: HebelVariante[],
  zahlen?: GerechneteZahl[],
): string {
  const zeilen = Object.entries(kennzahlen)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`);

  const zahlenBlock =
    zahlen && zahlen.length > 0
      ? "\n\nGerechnete Werte (bereits berechnet, NICHT neu rechnen, keine eigenen Zahlen bilden):\n" +
        zahlen.map((z) => `- ${z.label}: ${z.wert}`).join("\n")
      : "";

  const variantenBlock =
    varianten && varianten.length > 0
      ? "\n\nDurchgerechnete Varianten (bereits berechnet, NICHT neu rechnen):\n" +
        varianten
          .map(
            (v) =>
              `- ${v.feld} ${v.aenderung} (neu ${v.neuerWert}): Score ${v.score} statt ${v.score - v.deltaScore}`,
          )
          .join("\n")
      : "";

  const extra = hinweis && hinweis.trim() ? `\n\nZusaetzliche Hinweise des Nutzers:\n${hinweis.trim()}` : "";
  return `Kennzahlen des Objekts:\n${zeilen.join("\n")}${zahlenBlock}${variantenBlock}${extra}`;
}
