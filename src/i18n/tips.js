import { AFA, KFW_KREDIT, MARKET_RATES, NICHT_UML, VERBRAUCH_GRENZEN } from "../data.js";

// Richtwert-Zahlen fuer die nichtUml-Tooltips direkt aus data.js, damit
// Erklaerung und Formel (berechneNichtUml in utils/rendite.js) nicht
// auseinanderlaufen. Dezimaltrennzeichen je Sprachraum.
const nu = (locale) => {
  const f = (v) =>
    v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { min: f(NICHT_UML.min), max: f(NICHT_UML.max), mittel: f(NICHT_UML.mittel) };
};
const NU_DE = nu("de-DE");
const NU_EN = nu("en-GB");
const NU_TR = nu("tr-TR");

// Grenzwerte und Foerderkonditionen fuer die Neubau-AfA- und KfW-Tooltips
// direkt aus data.js. Sonst laufen Erklaerung und Rechnung auseinander,
// sobald ein Gesetz oder eine KfW-Kondition nachgepflegt wird - genau das
// soll die Zentralisierung ("Marktwerte nur in data.js") verhindern.
const g = (locale) => (v) => v.toLocaleString(locale, { maximumFractionDigits: 0 });
const G_DE = g("de-DE");
const G_EN = g("en-GB");
const G_TR = g("tr-TR");
const G_HI = g("en-IN");
// Kommazahlen (Zinssaetze) folgen demselben Muster, nur mit einer Stelle.
const z = (locale) => (v) =>
  v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const Z_DE = z("de-DE");
const Z_EN = z("en-GB");
const Z_TR = z("tr-TR");

const KFN = KFW_KREDIT.kfn;
const WEP = KFW_KREDIT.wohneigentum;

export const TIPS = {
  de: {
    kaufpreis: "Vereinbarter Kaufpreis ohne Kaufnebenkosten.",
    flaeche: "Nettowohnfläche nach Wohnflächenverordnung (WoFlV).",
    kaltmiete: "Nettokaltmiete ohne Betriebskosten.",
    nichtUml: `Verwaltung, Instandhaltung und Rücklage — der Teil des Hausgelds, den du selbst trägst. Richtwert ${NU_DE.min}–${NU_DE.max} € je m² und Monat; der Rechner setzt die Mitte an (${NU_DE.mittel} €/m²) und folgt der Wohnfläche, bis du das Feld selbst überschreibst.`,
    leerstand:
      "Erwartete Leerstandsmonate im Analysezeitraum. Realistisch: 2-4 Monate pro 10 Jahre.",
    eigenkapital:
      "Liquide Mittel für Kauf. Faustregel: mind. Kaufnebenkosten + 20% des Kaufpreises.",
    nkFinanzieren:
      "Standard (aus): Nebenkosten zahlst du zusätzlich zum Eigenkapital bar, das Darlehen deckt nur den Kaufpreis. AN: Nebenkosten fließen mit ins Darlehen — wie es Banken im Finanzierungsangebot oft rechnen (Finanzierungsbedarf = Kaufpreis + Nebenkosten − Eigenkapital). Erhöht Darlehen, Rate und Beleihungsauslauf.",
    zinssatz: `Sollzins p.a. (nicht Effektivzins). Aktueller Marktdurchschnitt: ${MARKET_RATES.avg} % (Stand: ${MARKET_RATES.stand}).`,
    tilgung: "Anfängliche Tilgung p.a. Empfehlung: mind. 2-3% für vertretbare Laufzeit.",
    grEst: "Grunderwerbsteuer nach GrEStG - bundeslandabhängig 3,5%-6,5%.",
    notar: "Notar- und Grundbuchkosten, ca. 1,5-2% des Kaufpreises.",
    makler: "Maklerprovision - seit 12/2020 geteilt zwischen Käufer und Verkäufer (max. 3,57%).",
    steuersatz:
      "Persönlicher Durchschnittssteuersatz. Berechnung: (Einkommensteuer ÷ zvE) × 100. Werte im Steuerbescheid. Grenzsteuersatz inkl. Soli typisch 25–45 %.",
    afa: "Absetzung für Abnutzung (§ 7 EStG). 2% linear für Baujahr ab 1925, 3% für Neubau ab 2023.",
    grundAnteil: "Nicht abschreibbar. Typisch 20% in Städten, 10-15% auf dem Land.",
    gebAnteil: "Gebäudewert - abschreibbar gemäß AfA-Satz.",
    wertP: "Historische Wertsteigerung 2-3% p.a. (langfristig). Regional stark variabel.",
    altAnlage:
      "Angenommene jährliche Rendite einer Alternativanlage (z.B. ETF/Aktienmarkt) zum Vergleich mit der Immobilie. Historischer Richtwert: 6-7% p.a.",
    sonder:
      "Einmalige Sonderumlagen der WEG, z.B. neue Heizung, neues Dach, Fassadensanierung, Aufzug. Vor Kauf Protokolle der Eigentümerversammlungen prüfen.",
    renovierung:
      "Geschätzte Renovierungskosten beim Kauf (Küche, Bad, Böden etc.). Wichtig: Übersteigen diese Kosten in den ersten 3 Jahren nach Kauf 15% des Gebäude-Kaufpreises (Kaufpreis × Gebäudeanteil), müssen sie als 'anschaffungsnahe Herstellungskosten' aktiviert und über die AfA abgeschrieben werden (§ 6 Abs. 1 Nr. 1a EStG) — kein Sofortabzug. Kein Steuerrechtsrat — Steuerberater hinzuziehen.",
    vgl: "Ortsübliche Vergleichsmiete pro m² (Mietspiegel, Mietdatenbank oder Gutachter).",
    vglRendite:
      "Ortsübliche Vergleichsmiete lt. Mietspiegel (€/m²). Wirkt auf zwei Arten: (1) Steuert den Mieterhöhungsplan — § 558 BGB erlaubt keine Erhöhung über diesen Wert, egal wie viel Kappungsgrenze noch frei ist. (2) Liegt deine Ist-Miete mehr als 15 % darunter, erscheint ein Hinweis zur schrittweisen Angleichung. Quelle: lokaler Mietspiegel, Mietdatenbank oder Sachverständigengutachten.",
    vglMiete:
      "Gesetzliche Obergrenze nach § 558 Abs. 1 BGB — die Miete darf niemals über die ortsübliche Vergleichsmiete erhöht werden, egal wie viel Kappungsspielraum noch verfügbar ist. Der Wert projiziert sich im Zeitverlauf mit der hinterlegten Mietpreisprognose. Quelle: lokaler Mietspiegel, Mietdatenbank oder Sachverständigengutachten.",
    lDat: "Datum der letzten vertragswirksamen Mieterhöhung. Bestimmt zwei Fristen: (1) 15-Monats-Frist — die nächste Erhöhung darf frühestens 15 Monate danach erfolgen (§ 558 Abs. 1 BGB). (2) 3-Jahres-Fenster — nur Erhöhungen der letzten 36 Monate zählen für die Kappungsgrenze. Je länger zurück, desto mehr Spielraum ist wieder frei.",
    lMiet:
      "Kaltmiete VOR der letzten Erhöhung — nicht die aktuelle Miete. Wird benötigt, um den bereits verbrauchten Teil der Kappungsgrenze der letzten 3 Jahre zu berechnen. Beispiel: War die Miete 800 € und ist jetzt 900 €, wurden 12,5 % der Kappung genutzt — bei 20 %-Grenze bleiben noch 7,5 % verfügbar.",
    bj: "Baujahr der Immobilie (Bezugsfertigkeit). Bestimmt den AfA-Satz automatisch: vor 1925 → 2,5 %, 1925–2022 → 2,0 %, ab 2023 (Neubau) → 3,0 % (§ 7 Abs. 4 EStG). Ab 2023 erscheint zusätzlich der Block „Neubau-Abschreibung“ mit degressiver AfA und Sonderabschreibung.",
    sanBj:
      "Baujahr der Immobilie (Bezugsfertigkeit). Bestimmt die aktuelle Energieklasse (A+…H) und die KfW-Förderung: Der Klimageschwindigkeitsbonus (20 % extra) gilt nur für Gebäude, die vor dem 01.01.2002 errichtet wurden.",
    pers: "Personen im Haushalt - bestimmt Warmwasserbedarf (~800 kWh/Person/J.).",
    garage:
      "Kaufpreis für Garage oder Stellplatz, separat vom Wohnungsbereich. Nebenkosten werden auf Gesamtpreis berechnet.",
    mieteQm:
      "Kaltmiete pro m² Wohnfläche. Multipliziert mit Wohnfläche ergibt die monatliche Kaltmiete.",
    ogdecke:
      "Dämmung der obersten Geschossdecke — kostengünstige Alternative zur kompletten Dachsanierung.",
    batterie: "Kapazität des Batteriespeichers in kWh. Faustregel: Kapazität ≈ PV-Leistung in kWp.",
    sondertilg:
      "Jährliche Sondertilgung - üblich 5% des Darlehensbetrags/Jahr. Muss vertraglich vereinbart sein (§ 500 BGB).",
    epStrom:
      "Aktueller Strompreis pro kWh. Bundesdurchschnitt ca. 0,35 €/kWh. Relevant für Wärmepumpe, PV, E-Auto.",
    epHeiz:
      "Heizkosten pro kWh für Gas, Öl, Pellets, Fernwärme. Gas ca. 0,12 €, Öl ca. 0,10 €, Pellets ca. 0,07 €, Fernwärme ca. 0,12 €.",
    fasFl: "Geschätzte Außenwandfläche. Abhängig von Anbausituation.",
    daFl: "Satteldach: ca. Grundfläche × 1.4, Flachdach: ≈ Grundfläche.",
    keFl: "Fläche der Kellerdecke. Bei unbeheiztem Keller empfehlenswert.",
    pvLeistung: "1 kWp ≈ 7m² Dachfläche. Ertrag ca. 950 kWh/kWp pro Jahr.",
    isfp: "Individueller Sanierungsfahrplan: Ein Energieberater erstellt einen maßgeschneiderten Sanierungsplan. Belohnung: +5% BAFA-Bonus auf jede BEG-Maßnahme. Energieberatung wird mit 50% bezuschusst. Antrag stets VOR Auftragsvergabe!",
    sanIstVerbrauch: `Endenergieverbrauch aus dem Energieausweis (kWh/m²a). Ist der Wert gesetzt, rechnet der Rechner damit statt mit der groben Baujahr-Schätzung — die liegt bei Bauten der 90er oft 30–50 % zu hoch. Der Warmwasseranteil wird abgezogen, weil er im Ausweis schon enthalten ist. Werte außerhalb ${VERBRAUCH_GRENZEN.min}–${VERBRAUCH_GRENZEN.max} werden ignoriert.`,
    zinsbindung:
      "Zeitraum, für den der Zinssatz vertraglich festgeschrieben ist. Danach wird zum dann gültigen Marktzins prolongiert — die Restschuld zu diesem Zeitpunkt ist dein Zinsänderungsrisiko. Lange Bindung kostet Aufschlag, kauft aber Planungssicherheit.",
    afaModus: `Wahlrecht für Neubauten. "Gleichmäßig" ist die lineare AfA mit ${AFA.neubau} % vom Gebäudewert in jedem Jahr (§ 7 Abs. 4 Nr. 2a EStG). "Anfangs mehr" ist die degressive AfA mit ${AFA.degressivSatz} % vom jeweiligen Restbuchwert (§ 7 Abs. 5a EStG) — im ersten Jahr deutlich höher, danach sinkend, insgesamt derselbe Betrag. Voraussetzung für degressiv: Baubeginn oder Kaufvertrag zwischen 10/${AFA.degressivVon} und 09/${AFA.degressivBis}.`,
    qng: `Qualitätssiegel Nachhaltiges Gebäude — Effizienzhaus 40 mit Nachhaltigkeitsklasse. Diese eine Angabe wirkt doppelt: Sie ist zwingende Voraussetzung der Sonderabschreibung nach § 7b EStG, und sie hebt im KfW-Programm ${KFN.nr} den Höchstbetrag von ${G_DE(KFN.maxProWE)} € auf ${G_DE(KFN.maxProWE_qng)} € je Wohneinheit. Ohne QNG gibt es keine Sonder-AfA, auch wenn alle anderen Bedingungen erfüllt sind.`,
    bauantrag: `Zeitfenster des § 7b EStG: Der Bauantrag oder die Bauanzeige muss zwischen dem 01.01.${AFA.sonderVon} und dem 30.09.${AFA.sonderBis} gestellt worden sein. Das Datum steht im Bauantrag bzw. in der Baugenehmigung — nicht identisch mit dem Baujahr, das die Fertigstellung meint.`,
    sonderAfa: `Sonderabschreibung Mietwohnungsneubau nach § 7b EStG: zusätzlich ${AFA.sonderSatz} % pro Jahr in den ersten ${AFA.sonderJahre} Jahren, oben auf die lineare oder degressive AfA. Zusammen mit der degressiven AfA sind das bis zu ${AFA.degressivSatz + AFA.sonderSatz} % im ersten Jahr. Weitere Bedingungen: entgeltliche Vermietung zu Wohnzwecken im Anschaffungsjahr und den folgenden neun Jahren. Ab Jahr ${AFA.sonderJahre + 1} bemisst sich die AfA nach dem Restwert (§ 7a Abs. 9 EStG) und fällt spürbar ab.`,
    anschaffungMonat:
      "Monat des Eigentumsübergangs. Lineare und degressive AfA werden im ersten Jahr zeitanteilig gekürzt (Kauf im Oktober = 3/12). Die Sonderabschreibung nach § 7b EStG wird dagegen NICHT gekürzt — ein einziger Vermietungsmonat verbraucht ein volles Viertel des Kontingents. Ein Kauf im Dezember ist steuerlich also nicht schlechter, sondern besser als einer im Januar.",
    kostenQm: `Gebäudeanschaffungskosten inklusive Kaufnebenkosten, geteilt durch die Wohnfläche. Prüfgröße des § 7b EStG: Über ${G_DE(AFA.sonderKostenGrenzeQm)} €/m² entfällt die Sonderabschreibung vollständig — es gibt keine anteilige Kürzung, ein Euro zu viel kippt den ganzen Anspruch. Unabhängig davon ist die Bemessungsgrundlage selbst auf ${G_DE(AFA.sonderBemessungsCapQm)} €/m² gedeckelt.`,
    kfwAktiv: `Förderkredit der KfW als zweites Darlehen neben dem Bankdarlehen — eigener Zins, eigene Laufzeit, eigene Tilgung. Der günstigere KfW-Zins senkt den Mischzins der Gesamtfinanzierung. Die hinterlegten Konditionen werden erst bei der Zusage festgeschrieben.`,
    kfwNutzung: `Steuert, welche Programme zur Wahl stehen. "Vermietet" lässt nur den Klimafreundlichen Neubau (${KFN.nr}) zu — das Wohneigentumsprogramm (${WEP.nr}) fördert ausschließlich Selbstnutzung und wird deshalb gar nicht erst angeboten.`,
    kfwProgramm: `Klimafreundlicher Neubau (${KFN.nr}): für Vermieter und Selbstnutzer, bis ${G_DE(KFN.maxProWE)} € je Wohneinheit (${G_DE(KFN.maxProWE_qng)} € mit QNG), Richtwert rund ${Z_DE(KFN.zins)} % — setzt Effizienzhaus 40 voraus. Wohneigentumsprogramm (${WEP.nr}): nur bei Selbstnutzung, bis ${G_DE(WEP.maxProWE)} €, Richtwert rund ${Z_DE(WEP.zins)} %, ohne Effizienzhaus-Anforderung.`,
    wohneinheiten: `Anzahl der Wohneinheiten im Objekt. Der KfW-Höchstbetrag gilt je Wohneinheit, nicht je Objekt: Bei zwei Einheiten mit QNG sind das ${G_DE(2 * KFN.maxProWE_qng)} € statt ${G_DE(KFN.maxProWE_qng)} €. Ein Mehrfamilienhaus wird dadurch deutlich stärker gefördert als eine einzelne Wohnung.`,
    kfwBetrag: `Gewünschter KfW-Anteil. Wird automatisch gekappt auf den Programmhöchstbetrag (${G_DE(KFN.maxProWE)} € je Wohneinheit, mit QNG ${G_DE(KFN.maxProWE_qng)} €) und auf den tatsächlichen Finanzierungsbedarf. Was übrig bleibt, finanziert die Bank — deshalb sinkt das Bankdarlehen entsprechend.`,
    kfwZins: `Effektivzins des Förderkredits. Leer lassen übernimmt den Richtwert aus den hinterlegten Konditionen (${Z_DE(KFN.zins)} % für ${KFN.nr}, ${Z_DE(WEP.zins)} % für ${WEP.nr}). Der echte Zins hängt von Laufzeit, Zinsbindung und tilgungsfreien Jahren ab und steht erst in der Zusage deiner Hausbank.`,
    kfwTilgungsfrei: `Anlaufjahre, in denen nur Zinsen fließen und die Restschuld unverändert bleibt — bei der KfW bis zu ${KFN.maxTilgungsfrei} Jahre. Das entlastet den Cashflow am Anfang, erkauft ihn aber mit einem Ratensprung danach und mit höheren Gesamtzinsen, weil länger auf die volle Summe gezahlt wird.`,
    kfwLaufzeit: `Gesamtlaufzeit des Förderdarlehens, maximal ${KFN.maxLaufzeit} Jahre. Anders als beim Bankdarlehen wird hier die Laufzeit vorgegeben und die Rate daraus berechnet, nicht umgekehrt. Achtung: Die Zinsbindung beträgt nur bis zu ${KFN.maxZinsbindung} Jahre — danach steht auch für die KfW eine Anschlussfinanzierung an.`,
  },
  en: {
    kaufpreis: "Agreed purchase price excluding closing costs.",
    flaeche: "Net living area per German WoFlV regulation.",
    kaltmiete: "Net cold rent excluding utilities.",
    nichtUml: `Management, maintenance and reserve — the part of the service charge you bear yourself. Benchmark €${NU_EN.min}–${NU_EN.max} per m² per month; the calculator applies the midpoint (€${NU_EN.mittel}/m²) and follows the living area until you override the field.`,
    leerstand:
      "Expected vacancy months over the analysis period. Realistic: 2-4 months per 10 years.",
    eigenkapital:
      "Liquid funds for purchase. Rule of thumb: at least closing costs + 20% of purchase price.",
    nkFinanzieren:
      "Default (off): you pay closing costs in cash on top of your equity, the loan only covers the purchase price. ON: closing costs are added to the loan — as banks often calculate a financing offer (financing need = purchase price + closing costs − equity). Increases loan, rate and loan-to-value.",
    zinssatz: `Nominal rate p.a. (not APR). Current market average: ${MARKET_RATES.avg}% (as of ${MARKET_RATES.stand}).`,
    tilgung: "Initial annual repayment rate. Recommend: at least 2-3% for reasonable term.",
    grEst: "Real estate transfer tax (GrEStG) — varies 3.5%-6.5% by German state.",
    notar: "Notary and land registry costs, approx. 1.5-2% of purchase price.",
    makler: "Realtor commission — since 12/2020 shared between buyer and seller (max. 3.57%).",
    steuersatz:
      "Personal average tax rate. Formula: (income tax ÷ taxable income) × 100. Values in your tax assessment. Marginal rate incl. solidarity surcharge typically 25–45 %.",
    afa: "Depreciation per § 7 German Income Tax Act. 2% linear from 1925, 3% for new builds from 2023.",
    grundAnteil: "Not depreciable. Typically 20% in cities, 10-15% rural.",
    gebAnteil: "Building value — depreciable per AfA rate.",
    wertP: "Historical appreciation 2-3% p.a. long-term. Strong regional variation.",
    altAnlage:
      "Assumed annual return of an alternative investment (e.g. ETF/stock market) to compare against the property. Historical benchmark: 6-7% p.a.",
    sonder:
      "One-time HOA special levies, e.g. new heating, roof, facade renovation, elevator. Review HOA meeting minutes before buying.",
    renovierung:
      "Estimated renovation costs at purchase (kitchen, bathroom, flooring etc.). Important: if costs exceed 15% of building purchase price within 3 years (§ 6 para. 1 no. 1a EStG), they must be capitalised and depreciated — no immediate deduction. Not tax advice — consult a tax advisor.",
    vgl: "Local comparable rent per m² (rent index, rent database, or appraiser).",
    vglRendite:
      "Local comparable rent per m² (Mietspiegel). Works two ways: (1) Caps the rent increase plan — § 558 BGB prohibits any increase above this value, regardless of remaining headroom. (2) If your current rent is more than 15% below it, an advisory is shown for gradual alignment. Source: local rent index, database, or expert appraisal.",
    vglMiete:
      "Legal ceiling per § 558 para. 1 BGB — rent may never be raised above the local comparable rent, no matter how much cap headroom is still available. The value is projected forward using the built-in rent growth forecast. Source: local rent index, database, or expert appraisal.",
    lDat: "Date of last contractually effective rent increase. Sets two deadlines: (1) 15-month wait — the next increase may not occur until 15 months after this date (§ 558 para. 1 BGB). (2) 3-year rolling window — only increases within the last 36 months count toward the cap. The further back, the more headroom is restored.",
    lMiet:
      "Cold rent BEFORE the last increase — not the current rent. Required to calculate how much of the 3-year cap has already been used. Example: if rent was €800 and is now €900, 12.5% of the cap is consumed — with a 20% limit, 7.5% remains available.",
    bj: "Year of construction (occupancy ready). Automatically sets the depreciation rate: before 1925 → 2.5%, 1925–2022 → 2.0%, from 2023 onward (new build) → 3.0% (§ 7 Para. 4 EStG). From 2023 onward an additional “New-build depreciation” block appears, offering declining-balance and special depreciation.",
    sanBj:
      "Year of construction (occupancy ready). Determines the current energy class (A+…H) and KfW funding eligibility: the climate speed bonus (extra 20%) applies only to buildings constructed before 01 Jan 2002.",
    pers: "Persons in household — determines hot water demand (~800 kWh/person/yr).",
    garage:
      "Price for garage or parking space, separate from living area. Closing costs are calculated on total price.",
    mieteQm: "Cold rent per m² living area. Multiplied by area equals monthly cold rent.",
    ogdecke:
      "Insulation of top floor ceiling — cost-effective alternative to full roof renovation.",
    batterie: "Battery storage capacity in kWh. Rule of thumb: capacity ≈ PV power in kWp.",
    sondertilg:
      "Annual special repayment - typically 5% of loan/year. Must be contractually agreed (§ 500 BGB).",
    epStrom:
      "Current electricity price per kWh. German average approx. 0.35 €/kWh. Relevant for heat pumps, PV, EVs.",
    epHeiz:
      "Heating cost per kWh for gas, oil, pellets, district heating. Gas ~0.12 €, oil ~0.10 €, pellets ~0.07 €, district heating ~0.12 €.",
    fasFl: "Estimated facade area. Depends on attachment situation.",
    daFl: "Gable roof: ~ground area × 1.4, flat roof: ≈ ground area.",
    keFl: "Area of basement ceiling. Recommended for unheated basements.",
    pvLeistung: "1 kWp ≈ 7m² roof area. Yield ~950 kWh/kWp per year.",
    isfp: "Individual Energy Renovation Roadmap: A certified energy consultant creates a personalised step-by-step plan. Reward: +5% extra BAFA subsidy on every BEG measure. Consulting is 50% subsidised. Apply before placing any orders!",
    sanIstVerbrauch: `Final energy consumption from the energy certificate (kWh/m²a). When set, the calculator uses it instead of the rough year-built estimate — for 1990s buildings that is often 30–50 % too high. The hot water share is deducted because the certificate already includes it. Values outside ${VERBRAUCH_GRENZEN.min}–${VERBRAUCH_GRENZEN.max} are ignored.`,
    zinsbindung:
      "Period for which the interest rate is contractually fixed. After it ends the loan is refinanced at the market rate then prevailing — the remaining debt at that moment is your interest-rate risk. A longer fixed period costs a premium but buys planning certainty.",
    afaModus: `Election available for new builds. "Even" is straight-line depreciation at ${AFA.neubau} % of the building value every year (§ 7 para. 4 no. 2a EStG). "More at first" is declining-balance depreciation at ${AFA.degressivSatz} % of the current book value (§ 7 para. 5a EStG) — much higher in year one, falling thereafter, the same total over time. Requirement for declining balance: construction start or purchase contract between 10/${AFA.degressivVon} and 09/${AFA.degressivBis}.`,
    qng: `Quality Seal for Sustainable Building (QNG) — Efficiency House 40 with sustainability class. This single input has two effects: it is a mandatory precondition for the special depreciation under § 7b EStG, and it raises the cap in KfW programme ${KFN.nr} from €${G_EN(KFN.maxProWE)} to €${G_EN(KFN.maxProWE_qng)} per residential unit. Without QNG there is no special depreciation, even if every other condition is met.`,
    bauantrag: `Time window of § 7b EStG: the building application or notification must have been filed between 01 Jan ${AFA.sonderVon} and 30 Sep ${AFA.sonderBis}. The date appears on the application or the building permit — it is not the same as the year of construction, which refers to completion.`,
    sonderAfa: `Special depreciation for new rental housing under § 7b EStG: an additional ${AFA.sonderSatz} % per year for the first ${AFA.sonderJahre} years, on top of straight-line or declining-balance depreciation. Combined with declining balance that is up to ${AFA.degressivSatz + AFA.sonderSatz} % in year one. Further conditions: the unit must be let for residential use against payment in the year of acquisition and the following nine years. From year ${AFA.sonderJahre + 1} depreciation is based on the residual value (§ 7a para. 9 EStG) and drops noticeably.`,
    anschaffungMonat:
      "Month ownership transfers. Straight-line and declining-balance depreciation are prorated in the first year (purchase in October = 3/12). The special depreciation under § 7b EStG is NOT prorated — a single month of letting consumes a full quarter of the allowance. A December purchase is therefore better for tax purposes than a January one, not worse.",
    kostenQm: `Building acquisition cost including closing costs, divided by living area. Test value under § 7b EStG: above €${G_EN(AFA.sonderKostenGrenzeQm)}/m² the special depreciation is lost entirely — there is no pro-rata reduction, one euro too many forfeits the whole claim. Separately, the depreciation base itself is capped at €${G_EN(AFA.sonderBemessungsCapQm)}/m².`,
    kfwAktiv: `A KfW subsidised loan running as a second loan alongside the bank loan — its own rate, term and repayment. The lower KfW rate reduces the blended rate of the overall financing. The stored conditions are only fixed when the loan is approved.`,
    kfwNutzung: `Controls which programmes are offered. "Let" allows only the Climate-friendly New Build programme (${KFN.nr}) — the Home Ownership Programme (${WEP.nr}) funds owner-occupation exclusively and is therefore never listed.`,
    kfwProgramm: `Climate-friendly New Build (${KFN.nr}): for landlords and owner-occupiers, up to €${G_EN(KFN.maxProWE)} per residential unit (€${G_EN(KFN.maxProWE_qng)} with QNG), benchmark around ${Z_EN(KFN.zins)} % — requires Efficiency House 40. Home Ownership Programme (${WEP.nr}): owner-occupation only, up to €${G_EN(WEP.maxProWE)}, benchmark around ${Z_EN(WEP.zins)} %, no efficiency requirement.`,
    wohneinheiten: `Number of residential units in the property. The KfW cap applies per unit, not per property: two units with QNG mean €${G_EN(2 * KFN.maxProWE_qng)} instead of €${G_EN(KFN.maxProWE_qng)}. A multi-family building is therefore funded far more generously than a single flat.`,
    kfwBetrag: `Desired KfW share. Automatically capped at the programme maximum (€${G_EN(KFN.maxProWE)} per unit, €${G_EN(KFN.maxProWE_qng)} with QNG) and at your actual financing need. Whatever remains is financed by the bank — which is why the bank loan shrinks accordingly.`,
    kfwZins: `Effective rate of the subsidised loan. Leaving it empty applies the stored benchmark (${Z_EN(KFN.zins)} % for ${KFN.nr}, ${Z_EN(WEP.zins)} % for ${WEP.nr}). The real rate depends on term, fixed-rate period and grace years and is only stated in your bank's approval.`,
    kfwTilgungsfrei: `Grace years in which only interest is paid and the principal stays unchanged — KfW allows up to ${KFN.maxTilgungsfrei} years. This eases early cash flow but is paid for with a jump in the instalment afterwards and higher total interest, because the full amount is serviced for longer.`,
    kfwLaufzeit: `Total term of the subsidised loan, up to ${KFN.maxLaufzeit} years. Unlike the bank loan, here the term is set and the instalment derived from it, not the other way round. Note: the fixed-rate period runs for only up to ${KFN.maxZinsbindung} years — after that the KfW loan also needs refinancing.`,
  },
  tr: {
    kaufpreis: "Kapanış maliyetleri hariç anlaşılan satın alma fiyatı.",
    flaeche: "Alman WoFlV yönetmeliğine göre net yaşam alanı.",
    kaltmiete: "İşletme giderleri hariç net soğuk kira.",
    nichtUml: `Yönetim, bakım ve rezerv — aidatın sizin üstlendiğiniz kısmı. Referans: aylık m² başına ${NU_TR.min}–${NU_TR.max} €; hesaplayıcı orta değeri (${NU_TR.mittel} €/m²) kullanır ve siz değiştirene kadar yaşam alanını takip eder.`,
    leerstand: "Analiz dönemi boyunca beklenen boş ay sayısı. Gerçekçi: 10 yılda 2-4 ay.",
    eigenkapital:
      "Satın alma için likit fonlar. Kural: en az kapanış maliyetleri + alım fiyatının %20'si.",
    nkFinanzieren:
      "Varsayılan (kapalı): Yan giderleri öz sermayenin üzerine nakit ödersin, kredi sadece alım fiyatını karşılar. AÇIK: Yan giderler krediye eklenir — bankaların finansman teklifinde sık hesapladığı gibi (finansman ihtiyacı = alım fiyatı + yan giderler − öz sermaye). Krediyi, taksiti ve kredi/değer oranını artırır.",
    zinssatz: `Yıllık nominal faiz (efektif faiz değil). Güncel piyasa ortalaması: %${MARKET_RATES.avg} (${MARKET_RATES.stand} itibariyle).`,
    tilgung: "Yıllık başlangıç anapara ödemesi. Tavsiye: makul vade için en az %2-3.",
    grEst: "Almanya'da emlak alım vergisi (GrEStG) - eyalete göre %3,5-6,5.",
    notar: "Noter ve tapu kayıt maliyetleri, satın alma fiyatının yaklaşık %1,5-2'si.",
    makler:
      "Emlakçı komisyonu - 12/2020'den beri alıcı ile satıcı arasında paylaşılır (maks. %3,57).",
    steuersatz: "Dayanışma vergisi dahil kişisel marjinal vergi oranı (tipik %25-42).",
    afa: "Almanya Gelir Vergisi Kanunu § 7'ye göre amortisman. 1925'ten itibaren doğrusal %2, 2023'ten itibaren yeni yapılarda %3.",
    grundAnteil: "Amortisman yok. Şehirlerde tipik %20, kırsalda %10-15.",
    gebAnteil: "Bina değeri - AfA oranına göre amortismana tabi.",
    wertP: "Tarihsel değer artışı uzun vadede yıllık %2-3. Bölgesel olarak çok değişken.",
    altAnlage:
      "Mülkle karşılaştırmak için varsayılan alternatif yatırım (örn. ETF/borsa) yıllık getirisi. Tarihsel referans: yıllık %6-7.",
    sonder:
      "Tek seferlik kat malikleri özel ödemeleri, örn. yeni ısıtma, çatı, cephe yenileme, asansör. Satın almadan önce kat malikleri toplantı tutanaklarını inceleyin.",
    renovierung:
      "Satın alımda tahmini tadilat maliyetleri. %15 eşiği aşılırsa aktifleştirme zorunludur.",
    vgl: "m² başına yerel karşılaştırmalı kira (kira endeksi, veritabanı veya bilirkişi).",
    vglRendite:
      "m² başına yerel karşılaştırmalı kira (Mietspiegel). İki şekilde etki eder: (1) Kira artış planını sınırlar — § 558 BGB, kalan kap marjından bağımsız olarak bu değerin üzerinde artışa izin vermez. (2) Mevcut kiranız %15'ten fazla altındaysa bir uyarı gösterilir. Kaynak: yerel kira endeksi, veritabanı veya bilirkişi.",
    vglMiete:
      "§ 558 Abs. 1 BGB uyarınca yasal tavan — kalan kap marjı ne olursa olsun kira hiçbir zaman yerel karşılaştırmalı kiranın üzerine çıkarılamaz. Değer, yerleşik kira büyüme tahmini kullanılarak ileriye yansıtılır. Kaynak: yerel kira endeksi, veritabanı veya bilirkişi.",
    lDat: "Son sözleşme bazında geçerli kira artışı tarihi. İki süreyi belirler: (1) 15 aylık bekleme — bir sonraki artış bu tarihten en erken 15 ay sonra yapılabilir (§ 558 Abs. 1 BGB). (2) 3 yıllık kayan pencere — yalnızca son 36 aydaki artışlar kap hesabına dahil edilir. Ne kadar eskiyse, o kadar çok marj geri kazanılır.",
    lMiet:
      "Son artıştan ÖNCEKİ soğuk kira — mevcut kira değil. Son 3 yılda kappın ne kadarının kullanıldığını hesaplamak için gereklidir. Örnek: Kira 800 € iken şimdi 900 € ise, kapın %12,5'i kullanılmış — %20 limitiyle %7,5 hâlâ mevcut.",
    bj: "İnşaat yılı (oturuma hazır). AfA oranını otomatik belirler: 1925 öncesi → %2,5, 1925–2022 arası → %2,0, 2023 ve sonrası (yeni yapı) → %3,0 (§ 7 Abs. 4 EStG). 2023'ten itibaren ayrıca degresif ve özel amortisman içeren “Yeni yapı amortismanı” bölümü görünür.",
    sanBj:
      "İnşaat yılı (oturuma hazır). Mevcut enerji sınıfını (A+…H) ve KfW teşvik uygunluğunu belirler: iklim hız bonusu (%20 ekstra) yalnızca 01.01.2002 öncesi inşa edilen binalar için geçerlidir.",
    pers: "Hanedeki kişi sayısı - sıcak su talebini belirler (kişi başı yıllık ~800 kWh).",
    garage:
      "Garaj veya park yeri için fiyat, yaşam alanından ayrı. Kapanış maliyetleri toplam fiyat üzerinden hesaplanır.",
    mieteQm: "m² yaşam alanı başına soğuk kira. Alanla çarpılınca aylık soğuk kira çıkar.",
    ogdecke: "Üst kat tavanı yalıtımı - tam çatı yenilemesine maliyet etkin alternatif.",
    batterie: "kWh cinsinden batarya depolama kapasitesi. Kural: kapasite ≈ kWp cinsinden PV gücü.",
    sondertilg:
      "Yıllık özel geri ödeme - tipik kredinin yıllık %5'i. Sözleşmeye göre kararlaştırılmalı (§ 500 BGB).",
    epStrom:
      "kWh başına güncel elektrik fiyatı. Almanya ortalaması yaklaşık 0,35 €/kWh. Isı pompası, PV, elektrikli araç için önemli.",
    epHeiz:
      "Gaz, yağ, pelet, bölge ısıtması için kWh başına ısıtma maliyeti. Gaz ~0,12 €, yağ ~0,10 €, pelet ~0,07 €, bölge ısıtması ~0,12 €.",
    fasFl: "Tahmini cephe alanı. Eklenti durumuna bağlı.",
    daFl: "Beşik çatı: ~zemin alanı × 1.4, düz çatı: ≈ zemin alanı.",
    keFl: "Bodrum tavanı alanı. Isıtılmamış bodrumlar için önerilir.",
    pvLeistung: "1 kWp ≈ 7m² çatı alanı. Yıllık verim ~950 kWh/kWp.",
    isfp: "Bireysel Enerji Yenileme Planı: Sertifikalı enerji danışmanı adım adım yenileme planı oluşturur. Ödül: Her BEG önlemi için +%5 BAFA teşviki. Danışmanlık %50 sübvanse edilir. Siparişten ÖNCE başvurun!",
    sanIstVerbrauch: `Enerji sertifikasındaki nihai enerji tüketimi (kWh/m²a). Girildiğinde hesaplayıcı, inşaat yılına dayalı kaba tahmin yerine bunu kullanır — 90'lı yılların yapılarında bu tahmin çoğu kez %30–50 fazladır. Sıcak su payı düşülür, çünkü sertifikada zaten dahildir. ${VERBRAUCH_GRENZEN.min}–${VERBRAUCH_GRENZEN.max} dışındaki değerler yok sayılır.`,
    zinsbindung:
      "Faiz oranının sözleşmeyle sabitlendiği süre. Süre bitince o günkü piyasa faiziyle yeniden finanse edilir — o andaki kalan borç, faiz değişim riskinizdir. Uzun sabitleme ek maliyet getirir ama planlama güvenliği sağlar.",
    afaModus: `Yeni yapılar için seçim hakkı. "Eşit", her yıl bina değerinin %${AFA.neubau}'ü kadar doğrusal amortismandır (§ 7 Abs. 4 Nr. 2a EStG). "Başta daha fazla", her yılki kalan defter değerinin %${AFA.degressivSatz}'i kadar azalan bakiye amortismanıdır (§ 7 Abs. 5a EStG) — ilk yıl belirgin şekilde yüksek, sonra azalan, toplamda aynı tutar. Azalan bakiye koşulu: inşaat başlangıcı veya satış sözleşmesi 10/${AFA.degressivVon} ile 09/${AFA.degressivBis} arasında olmalı.`,
    qng: `Sürdürülebilir Bina Kalite Mührü (QNG) — sürdürülebilirlik sınıflı Verimlilik Evi 40. Bu tek bilgi iki şekilde etki eder: § 7b EStG'ye göre özel amortismanın zorunlu ön koşuludur ve KfW ${KFN.nr} programında konut birimi başına üst sınırı ${G_TR(KFN.maxProWE)} €'dan ${G_TR(KFN.maxProWE_qng)} €'ya yükseltir. QNG olmadan, diğer tüm koşullar sağlansa bile özel amortisman yoktur.`,
    bauantrag: `§ 7b EStG'nin zaman aralığı: yapı ruhsatı başvurusu veya yapı bildirimi 01.01.${AFA.sonderVon} ile 30.09.${AFA.sonderBis} arasında yapılmış olmalıdır. Tarih başvuruda veya yapı ruhsatında yazar — tamamlanmayı ifade eden inşaat yılıyla aynı değildir.`,
    sonderAfa: `§ 7b EStG uyarınca yeni kiralık konut için özel amortisman: ilk ${AFA.sonderJahre} yılda, doğrusal veya azalan bakiye amortismanının üzerine yılda ek %${AFA.sonderSatz}. Azalan bakiye ile birlikte ilk yıl %${AFA.degressivSatz + AFA.sonderSatz}'e kadar çıkar. Diğer koşullar: edinim yılında ve izleyen dokuz yılda bedel karşılığı konut amaçlı kiraya verilmiş olmalıdır. ${AFA.sonderJahre + 1}. yıldan itibaren amortisman kalan değer üzerinden hesaplanır (§ 7a Abs. 9 EStG) ve hissedilir biçimde düşer.`,
    anschaffungMonat:
      "Mülkiyetin devredildiği ay. Doğrusal ve azalan bakiye amortismanı ilk yıl oranlanır (Ekim'de alım = 3/12). § 7b EStG'ye göre özel amortisman ise oranlanmaz — tek bir kiralama ayı kontenjanın tam çeyreğini tüketir. Bu nedenle Aralık'ta alım vergisel olarak Ocak'tan kötü değil, daha iyidir.",
    kostenQm: `Yan giderler dahil bina edinim maliyetinin yaşam alanına bölümü. § 7b EStG'nin sınama değeri: ${G_TR(AFA.sonderKostenGrenzeQm)} €/m²'nin üzerinde özel amortisman tümüyle düşer — oransal indirim yoktur, bir euro fazlası tüm hakkı ortadan kaldırır. Bundan bağımsız olarak amortisman matrahı da ${G_TR(AFA.sonderBemessungsCapQm)} €/m² ile sınırlıdır.`,
    kfwAktiv: `Banka kredisinin yanında ikinci kredi olarak işleyen KfW teşvik kredisi — kendi faizi, vadesi ve anapara ödemesi vardır. Daha düşük KfW faizi, toplam finansmanın karma faizini aşağı çeker. Kayıtlı koşullar ancak onay aşamasında kesinleşir.`,
    kfwNutzung: `Hangi programların sunulacağını belirler. "Kiralık" yalnızca İklim Dostu Yeni Yapı (${KFN.nr}) programına izin verir — Konut Edindirme Programı (${WEP.nr}) sadece kendi kullanımını destekler, bu yüzden hiç listelenmez.`,
    kfwProgramm: `İklim Dostu Yeni Yapı (${KFN.nr}): kiraya verenler ve kendi oturanlar için, konut birimi başına ${G_TR(KFN.maxProWE)} €'ya kadar (QNG ile ${G_TR(KFN.maxProWE_qng)} €), referans yaklaşık %${Z_TR(KFN.zins)} — Verimlilik Evi 40 şartı vardır. Konut Edindirme Programı (${WEP.nr}): yalnızca kendi kullanımı, ${G_TR(WEP.maxProWE)} €'ya kadar, referans yaklaşık %${Z_TR(WEP.zins)}, verimlilik şartı yok.`,
    wohneinheiten: `Taşınmazdaki konut birimi sayısı. KfW üst sınırı taşınmaz başına değil, birim başına geçerlidir: QNG'li iki birimde ${G_TR(KFN.maxProWE_qng)} € yerine ${G_TR(2 * KFN.maxProWE_qng)} € olur. Çok daireli bir bina bu nedenle tek bir daireden çok daha güçlü desteklenir.`,
    kfwBetrag: `İstenen KfW payı. Program üst sınırına (birim başına ${G_TR(KFN.maxProWE)} €, QNG ile ${G_TR(KFN.maxProWE_qng)} €) ve gerçek finansman ihtiyacına otomatik olarak indirilir. Kalan kısmı banka finanse eder — banka kredisi bu yüzden buna göre azalır.`,
    kfwZins: `Teşvik kredisinin efektif faizi. Boş bırakılırsa kayıtlı referans değer kullanılır (${KFN.nr} için %${Z_TR(KFN.zins)}, ${WEP.nr} için %${Z_TR(WEP.zins)}). Gerçek faiz vadeye, faiz sabitleme süresine ve anapara ödemesiz yıllara bağlıdır ve yalnızca bankanızın onayında yer alır.`,
    kfwTilgungsfrei: `Yalnızca faiz ödenen ve kalan borcun değişmediği başlangıç yılları — KfW'de ${KFN.maxTilgungsfrei} yıla kadar. Başlangıçta nakit akışını rahatlatır, ancak bunun bedeli sonrasındaki taksit sıçraması ve daha yüksek toplam faizdir, çünkü tam tutar daha uzun süre ödenir.`,
    kfwLaufzeit: `Teşvik kredisinin toplam vadesi, en fazla ${KFN.maxLaufzeit} yıl. Banka kredisinden farklı olarak burada vade verilir ve taksit ondan hesaplanır, tersi değil. Dikkat: faiz sabitleme süresi yalnızca ${KFN.maxZinsbindung} yıla kadardır — sonrasında KfW kredisi için de yeniden finansman gerekir.`,
  },
  zh: {
    kaufpreis: "商定的购买价格，不含交易费用。",
    flaeche: "根据德国 WoFlV 法规的净居住面积。",
    kaltmiete: "不含运营费用的净冷租金。",
    nichtUml: `管理费、维护费和储备金——物业费中由您承担的部分。参考值为每平方米每月 ${NU_EN.min}–${NU_EN.max} 欧元；计算器采用中间值（${NU_EN.mittel} 欧元/m²），并跟随居住面积，直到您手动修改该字段。`,
    leerstand: "分析期内预期空置月数。现实值：每10年2-4个月。",
    eigenkapital: "购买的流动资金。经验法则：至少交易费用 + 购买价的20%。",
    nkFinanzieren:
      "默认（关）：附加费用需在自有资金之外另付现金，贷款仅覆盖购房价。开：附加费用计入贷款——与银行融资方案的常见算法一致（融资需求 = 购房价 + 附加费用 − 自有资金）。会提高贷款额、月供和贷款成数。",
    zinssatz: `年度名义利率（非有效利率）。当前市场平均水平：${MARKET_RATES.avg}%（截至 ${MARKET_RATES.stand}）。`,
    tilgung: "年度初始还款率。建议：至少2-3%以获得合理期限。",
    grEst: "房地产转让税（GrEStG）- 各州 3.5%-6.5%。",
    notar: "公证和土地登记费用，约购买价的1.5-2%。",
    makler: "房地产经纪人佣金 - 自2020年12月起在买方和卖方之间分摊（最多3.57%）。",
    steuersatz: "包括团结附加税的个人边际税率（通常 25-42%）。",
    afa: "按德国所得税法第 7 条折旧。1925 年起线性 2%，2023 年起新建筑 3%。",
    grundAnteil: "不可折旧。城市通常20%，农村10-15%。",
    gebAnteil: "建筑价值 - 按 AfA 率折旧。",
    wertP: "长期历史增值年度 2-3%。地区差异很大。",
    altAnlage: "假设的替代投资（如ETF/股市）年化收益率，用于与房产比较。历史参考值：年化6-7%。",
    sonder: "一次性物业特别征收，例如新供暖、屋顶、外墙翻新、电梯。购买前查阅业主大会会议记录。",
    renovierung: "购房时的预估装修费用。如超过建筑购价的15%则必须资本化。",
    vgl: "每平方米当地参考租金（租金指数、租金数据库或评估师）。",
    vglRendite:
      "每平方米当地参考租金（房租指数）。两种作用：(1) 限制租金上涨计划——§ 558 BGB 禁止超过此值的任何上涨，无论剩余上涨空间多少。(2) 如果当前租金低于此值超过15%，会显示逐步调整的提示。来源：当地房租指数、数据库或专家评估。",
    vglMiete:
      "§ 558 第1款 BGB 规定的法定上限——无论剩余上涨空间多少，租金永远不得超过当地参考租金。该值使用内置租金增长预测进行未来预测。来源：当地房租指数、数据库或专家评估。",
    lDat: "最后一次合同生效租金上调日期。确定两个期限：(1) 15个月等待期——下次上调最早可在此日期15个月后进行（§ 558第1款BGB）。(2) 3年滚动窗口——只有过去36个月内的上调计入上限计算。时间越久远，可用空间恢复越多。",
    lMiet:
      "最后一次上调前的净冷租金——不是当前租金。用于计算过去3年中已使用的上限比例。示例：租金从800欧元涨到900欧元，已使用12.5%的上限——在20%限额下，还剩7.5%可用。",
    bj: "建筑年份（可入住时间）。自动设定折旧率：1925年前→2.5%，1925–2022年→2.0%，2023年起（新建）→3.0%（§7第4条EStG）。自2023年起还会出现「新建房折旧」板块，可选递减折旧和特别折旧。",
    sanBj:
      "建筑年份（可入住时间）。决定当前能效等级（A+…H）及KfW补贴资格：气候速度奖励（额外20%）仅适用于2002年1月1日前建造的建筑。",
    pers: "家庭人数 - 决定热水需求（每人每年约800 kWh）。",
    garage: "车库或停车位价格，与居住区分开。交易费用按总价计算。",
    mieteQm: "每平方米居住面积的冷租金。乘以面积即为月冷租金。",
    ogdecke: "顶层天花板隔热 - 完整屋顶翻新的经济替代方案。",
    batterie: "电池储能容量（kWh）。经验法则：容量 ≈ PV 功率（kWp）。",
    sondertilg: "年度特别还款 - 通常贷款的5%/年。必须合同约定（德国民法典第500条）。",
    epStrom: "每千瓦时当前电价。德国平均约 0.35 €/kWh。与热泵、光伏、电动车相关。",
    epHeiz:
      "天然气、燃油、颗粒、区域供热的每千瓦时供暖成本。天然气约 0.12 €、燃油约 0.10 €、颗粒约 0.07 €、区域供热约 0.12 €。",
    fasFl: "估计的外墙面积。取决于附属情况。",
    daFl: "双坡顶：约地面面积 × 1.4，平顶：≈ 地面面积。",
    keFl: "地下室天花板面积。对于无供暖的地下室建议。",
    pvLeistung: "1 kWp ≈ 7 m² 屋顶面积。年产量约 950 kWh/kWp。",
    isfp: "个人能源改造路线图：认证能源顾问制定个性化改造计划。奖励：每项BEG措施+5% BAFA补贴。咨询费用50%受补贴。下订单前申请！",
    sanIstVerbrauch: `能源证书中的终端能耗（kWh/m²a）。填入后，计算器采用该数值而非依据建筑年份的粗略估算——对90年代建筑该估算常偏高30–50%。热水部分会被扣除，因为证书已包含该部分。超出 ${VERBRAUCH_GRENZEN.min}–${VERBRAUCH_GRENZEN.max} 的数值将被忽略。`,
    zinsbindung:
      "利率在合同中锁定的期限。期满后按届时的市场利率续贷——此刻的剩余贷款额就是你的利率风险敞口。锁定期越长，利率加价越高，但换来规划确定性。",
    afaModus: `新建房的选择权。「均等」是线性折旧，每年按建筑价值的 ${AFA.neubau}% 计提（§ 7 Abs. 4 Nr. 2a EStG）。「前期更多」是余额递减折旧，按当年账面余值的 ${AFA.degressivSatz}% 计提（§ 7 Abs. 5a EStG）——第一年明显更高，之后逐年递减，总额相同。递减法的前提：开工或购房合同须在 ${AFA.degressivVon} 年10月至 ${AFA.degressivBis} 年9月之间。`,
    qng: `可持续建筑质量认证（QNG）——带可持续性等级的能效屋 40。这一项输入有双重作用：它是 § 7b EStG 特别折旧的强制前提，同时把 KfW ${KFN.nr} 项目每套住宅单元的上限从 ${G_EN(KFN.maxProWE)} 欧元提高到 ${G_EN(KFN.maxProWE_qng)} 欧元。没有 QNG 就没有特别折旧，即使其他条件全部满足也不行。`,
    bauantrag: `§ 7b EStG 的时间窗口：建筑申请或建筑报备须在 ${AFA.sonderVon} 年1月1日至 ${AFA.sonderBis} 年9月30日之间提交。日期见建筑申请或施工许可——与表示竣工的建筑年份不是一回事。`,
    sonderAfa: `依 § 7b EStG 的新建出租住宅特别折旧：前 ${AFA.sonderJahre} 年在线性或递减折旧之上每年额外 ${AFA.sonderSatz}%。与递减折旧合用时，第一年最高可达 ${AFA.degressivSatz + AFA.sonderSatz}%。其他条件：购置当年及其后九年须有偿出租用于居住。自第 ${AFA.sonderJahre + 1} 年起，折旧改按残值计算（§ 7a Abs. 9 EStG），会明显下降。`,
    anschaffungMonat:
      "产权过户的月份。线性和递减折旧在第一年按月折算（10月购入 = 3/12）。而 § 7b EStG 的特别折旧不按月折算——哪怕只出租一个月，也会用掉整整四分之一的额度。因此12月购入在税务上不是更差，而是更好。",
    kostenQm: `含购房附加费用的建筑购置成本除以居住面积。§ 7b EStG 的判定值：超过 ${G_EN(AFA.sonderKostenGrenzeQm)} 欧元/m² 则特别折旧全部丧失——没有按比例削减，多一欧元即失去全部资格。此外，折旧计税基数本身还有 ${G_EN(AFA.sonderBemessungsCapQm)} 欧元/m² 的上限。`,
    kfwAktiv: `KfW 政策性贷款作为银行贷款之外的第二笔贷款——有自己的利率、期限和还款。较低的 KfW 利率会拉低整体融资的混合利率。系统内置的条件仅在批贷时才最终确定。`,
    kfwNutzung: `决定可选哪些项目。选「出租」时只允许气候友好型新建（${KFN.nr}）——住房自有化项目（${WEP.nr}）仅资助自住，因此根本不会出现在列表中。`,
    kfwProgramm: `气候友好型新建（${KFN.nr}）：面向出租人和自住者，每套住宅单元最高 ${G_EN(KFN.maxProWE)} 欧元（有 QNG 时 ${G_EN(KFN.maxProWE_qng)} 欧元），参考利率约 ${Z_EN(KFN.zins)}%——要求达到能效屋 40。住房自有化项目（${WEP.nr}）：仅限自住，最高 ${G_EN(WEP.maxProWE)} 欧元，参考利率约 ${Z_EN(WEP.zins)}%，无能效要求。`,
    wohneinheiten: `房产中的住宅单元数量。KfW 上限按单元计，而非按房产计：两套带 QNG 的单元即为 ${G_EN(2 * KFN.maxProWE_qng)} 欧元，而不是 ${G_EN(KFN.maxProWE_qng)} 欧元。因此多户住宅获得的资助远高于单套公寓。`,
    kfwBetrag: `期望的 KfW 贷款额。会自动封顶至项目上限（每单元 ${G_EN(KFN.maxProWE)} 欧元，有 QNG 时 ${G_EN(KFN.maxProWE_qng)} 欧元）以及你的实际融资需求。剩余部分由银行融资——这就是银行贷款相应减少的原因。`,
    kfwZins: `政策性贷款的实际利率。留空则采用内置参考值（${KFN.nr} 为 ${Z_EN(KFN.zins)}%，${WEP.nr} 为 ${Z_EN(WEP.zins)}%）。真实利率取决于期限、利率锁定期和免还本年数，只有在你的开户行批贷时才会写明。`,
    kfwTilgungsfrei: `只付利息、本金不变的起始年数——KfW 最多 ${KFN.maxTilgungsfrei} 年。这能缓解前期现金流，代价是之后月供跳升，以及总利息更高，因为全额本金被服务了更久。`,
    kfwLaufzeit: `政策性贷款的总期限，最长 ${KFN.maxLaufzeit} 年。与银行贷款不同，这里是先定期限再倒推月供，而非相反。注意：利率锁定期最长只有 ${KFN.maxZinsbindung} 年——之后 KfW 贷款同样面临续贷。`,
  },
  hi: {
    kaufpreis: "क्लोजिंग लागत को छोड़कर सहमत खरीद मूल्य।",
    flaeche: "जर्मन WoFlV विनियमन के अनुसार शुद्ध रहने का क्षेत्र।",
    kaltmiete: "उपयोगिताओं को छोड़कर शुद्ध ठंडा किराया।",
    nichtUml: `प्रबंधन, रखरखाव और आरक्षित निधि — मेंटेनेंस शुल्क का वह हिस्सा जो आप स्वयं वहन करते हैं। मानक: प्रति m² प्रति माह €${NU_EN.min}–${NU_EN.max}; कैलकुलेटर मध्य मान (€${NU_EN.mittel}/m²) लेता है और जब तक आप इसे स्वयं न बदलें, रहने के क्षेत्र का अनुसरण करता है।`,
    leerstand: "विश्लेषण अवधि में अपेक्षित खाली महीने। यथार्थवादी: 10 वर्षों में 2-4 महीने।",
    eigenkapital: "खरीद के लिए तरल धन। नियम: कम से कम क्लोजिंग लागत + खरीद मूल्य का 20%।",
    nkFinanzieren:
      "डिफ़ॉल्ट (बंद): अतिरिक्त लागत आप स्वपूंजी के ऊपर नकद चुकाते हैं, ऋण केवल खरीद मूल्य को कवर करता है। चालू: अतिरिक्त लागत ऋण में जोड़ी जाती है — जैसा बैंक अक्सर वित्तपोषण प्रस्ताव में गणना करते हैं (वित्तपोषण आवश्यकता = खरीद मूल्य + अतिरिक्त लागत − स्वपूंजी)। इससे ऋण, किस्त और ऋण-मूल्य अनुपात बढ़ जाता है।",
    zinssatz: `प्रति वर्ष नाममात्र दर (प्रभावी दर नहीं)। वर्तमान बाजार औसत: ${MARKET_RATES.avg}% (${MARKET_RATES.stand} तक)।`,
    tilgung: "वार्षिक प्रारंभिक चुकौती दर। सिफारिश: उचित अवधि के लिए कम से कम 2-3%।",
    grEst: "रियल एस्टेट हस्तांतरण कर (GrEStG) - जर्मन राज्य के अनुसार 3.5%-6.5%।",
    notar: "नोटरी और भूमि रजिस्ट्री लागत, खरीद मूल्य का लगभग 1.5-2%।",
    makler: "रियल एस्टेट एजेंट कमीशन - 12/2020 से खरीदार और विक्रेता के बीच साझा (अधिकतम 3.57%)।",
    steuersatz: "एकजुटता अधिभार सहित व्यक्तिगत सीमांत कर दर (आमतौर पर 25-42%)।",
    afa: "जर्मन आयकर अधिनियम § 7 के अनुसार मूल्यह्रास। 1925 से रैखिक 2%, 2023 से नई इमारतों के लिए 3%।",
    grundAnteil: "मूल्यह्रास नहीं। शहरों में आमतौर पर 20%, ग्रामीण 10-15%।",
    gebAnteil: "भवन मूल्य - AfA दर के अनुसार मूल्यह्रास।",
    wertP: "दीर्घकालिक ऐतिहासिक मूल्य वृद्धि प्रति वर्ष 2-3%। मजबूत क्षेत्रीय भिन्नता।",
    altAnlage:
      "संपत्ति से तुलना हेतु मान लिया गया वैकल्पिक निवेश (जैसे ETF/शेयर बाज़ार) का वार्षिक प्रतिफल। ऐतिहासिक संदर्भ: वार्षिक 6-7%।",
    sonder:
      "एकमुश्त HOA विशेष लेवी, जैसे नई हीटिंग, छत, मुखौटा नवीनीकरण, लिफ्ट। खरीदने से पहले HOA बैठक की कार्यवाही की समीक्षा करें।",
    renovierung: "खरीद पर अनुमानित नवीनीकरण लागत। 15% सीमा पार होने पर पूंजीकरण आवश्यक।",
    vgl: "प्रति m² स्थानीय तुलनात्मक किराया (किराया सूचकांक, डेटाबेस या मूल्यांकनकर्ता)।",
    vglRendite:
      "प्रति m² स्थानीय तुलनात्मक किराया (Mietspiegel)। दो तरह से काम करता है: (1) किराया वृद्धि योजना को सीमित करता है — § 558 BGB बचे हुए कैप स्थान की परवाह किए बिना इस मूल्य से ऊपर वृद्धि की अनुमति नहीं देता। (2) यदि वर्तमान किराया 15% से अधिक कम है, तो क्रमिक समायोजन की सलाह दिखाई जाती है। स्रोत: स्थानीय किराया सूचकांक, डेटाबेस या विशेषज्ञ मूल्यांकन।",
    vglMiete:
      "§ 558 अनु. 1 BGB के अनुसार कानूनी ऊपरी सीमा — बचे हुए कैप स्थान की परवाह किए बिना किराया कभी भी स्थानीय तुलनात्मक किराए से ऊपर नहीं बढ़ाया जा सकता। मूल्य को अंतर्निहित किराया वृद्धि पूर्वानुमान का उपयोग करके आगे प्रक्षेपित किया जाता है। स्रोत: स्थानीय किराया सूचकांक, डेटाबेस या विशेषज्ञ मूल्यांकन।",
    lDat: "अंतिम अनुबंध-प्रभावी किराया वृद्धि की तारीख। दो समयसीमाएँ निर्धारित करती है: (1) 15 महीने की प्रतीक्षा — अगली वृद्धि इस तारीख से कम से कम 15 महीने बाद ही हो सकती है (§ 558 अनु. 1 BGB)। (2) 3 साल की रोलिंग विंडो — केवल पिछले 36 महीनों की वृद्धि कैप में गिनी जाती है। जितना पुराना, उतना अधिक मार्जिन वापस आता है।",
    lMiet:
      "अंतिम वृद्धि से पहले का शुद्ध ठंडा किराया — वर्तमान किराया नहीं। पिछले 3 वर्षों में उपयोग किए गए कैप की गणना के लिए आवश्यक। उदाहरण: किराया ₹800 से ₹900 हुआ तो 12.5% कैप उपयोग हो गई — 20% सीमा में 7.5% अभी भी उपलब्ध है।",
    bj: "संपत्ति का निर्माण वर्ष (रहने योग्य होने की तिथि)। AfA दर स्वतः निर्धारित करता है: 1925 से पहले → 2.5%, 1925–2022 → 2.0%, 2023 से (नया निर्माण) → 3.0% (§ 7 Abs. 4 EStG)। 2023 से आगे “नए निर्माण का मूल्यह्रास” खंड भी दिखता है, जिसमें घटते शेष और विशेष मूल्यह्रास उपलब्ध हैं।",
    sanBj:
      "संपत्ति का निर्माण वर्ष (रहने योग्य होने की तिथि)। वर्तमान ऊर्जा वर्ग (A+…H) और KfW सब्सिडी पात्रता निर्धारित करता है: जलवायु गति बोनस (20% अतिरिक्त) केवल 01.01.2002 से पहले बनी इमारतों पर लागू।",
    pers: "घर में व्यक्ति - गर्म पानी की मांग निर्धारित करता है (~800 kWh/व्यक्ति/वर्ष)।",
    garage:
      "गैरेज या पार्किंग स्थान का मूल्य, रहने के क्षेत्र से अलग। क्लोजिंग लागत कुल मूल्य पर गणना की जाती है।",
    mieteQm: "प्रति m² रहने के क्षेत्र का ठंडा किराया। क्षेत्र से गुणा मासिक ठंडा किराया देता है।",
    ogdecke: "शीर्ष मंजिल छत इन्सुलेशन - पूर्ण छत नवीनीकरण के लिए लागत प्रभावी विकल्प।",
    batterie: "kWh में बैटरी भंडारण क्षमता। नियम: क्षमता ≈ kWp में PV शक्ति।",
    sondertilg:
      "वार्षिक विशेष चुकौती - आमतौर पर ऋण का 5%/वर्ष। अनुबंध में सहमत होना चाहिए (§ 500 BGB)।",
    epStrom:
      "प्रति kWh वर्तमान बिजली मूल्य। जर्मन औसत लगभग 0.35 €/kWh। हीट पंप, PV, EV के लिए प्रासंगिक।",
    epHeiz:
      "गैस, तेल, पैलेट, ज़िला हीटिंग के लिए प्रति kWh हीटिंग लागत। गैस ~0.12 €, तेल ~0.10 €, पैलेट ~0.07 €, ज़िला हीटिंग ~0.12 €।",
    fasFl: "अनुमानित मुखौटा क्षेत्र। संलग्नक स्थिति पर निर्भर।",
    daFl: "ढलान छत: ~जमीन क्षेत्र × 1.4, समतल छत: ≈ जमीन क्षेत्र।",
    keFl: "तहखाने की छत का क्षेत्र। बिना गर्म तहखाने के लिए अनुशंसित।",
    pvLeistung: "1 kWp ≈ 7 m² छत क्षेत्र। वार्षिक उत्पादन ~950 kWh/kWp।",
    isfp: "व्यक्तिगत ऊर्जा नवीनीकरण रोडमैप: प्रमाणित ऊर्जा सलाहकार चरण-दर-चरण योजना बनाता है। पुरस्कार: हर BEG उपाय पर +5% BAFA सब्सिडी। परामर्श 50% अनुदानित। ऑर्डर से पहले आवेदन करें!",
    sanIstVerbrauch: `ऊर्जा प्रमाणपत्र से अंतिम ऊर्जा खपत (kWh/m²a)। मान भरने पर कैलकुलेटर निर्माण-वर्ष के मोटे अनुमान के बजाय इसका उपयोग करता है — 1990 के दशक की इमारतों के लिए वह अनुमान अक्सर 30–50 % अधिक होता है। गर्म पानी का हिस्सा घटा दिया जाता है, क्योंकि प्रमाणपत्र में वह पहले से शामिल है। ${VERBRAUCH_GRENZEN.min}–${VERBRAUCH_GRENZEN.max} से बाहर के मान अनदेखे किए जाते हैं।`,
    zinsbindung:
      "वह अवधि जिसके लिए ब्याज दर अनुबंध में तय है। इसके बाद उस समय की बाज़ार दर पर पुनर्वित्त होता है — उस क्षण की बकाया राशि ही आपका ब्याज-दर जोखिम है। लंबी अवधि पर प्रीमियम लगता है, पर योजना की निश्चितता मिलती है।",
    afaModus: `नए निर्माण के लिए विकल्प। "समान" यानी सीधी-रेखा मूल्यह्रास — हर वर्ष भवन मूल्य का ${AFA.neubau}% (§ 7 Abs. 4 Nr. 2a EStG)। "शुरू में अधिक" यानी घटते शेष पर मूल्यह्रास — हर वर्ष की बही-शेष राशि का ${AFA.degressivSatz}% (§ 7 Abs. 5a EStG) — पहले वर्ष काफी अधिक, फिर घटता हुआ, कुल मिलाकर वही राशि। घटते शेष की शर्त: निर्माण आरंभ या क्रय अनुबंध 10/${AFA.degressivVon} और 09/${AFA.degressivBis} के बीच हो।`,
    qng: `सतत भवन गुणवत्ता मुहर (QNG) — स्थिरता श्रेणी सहित दक्षता गृह 40। यह एक ही जानकारी दो काम करती है: § 7b EStG के तहत विशेष मूल्यह्रास की अनिवार्य शर्त है, और KfW कार्यक्रम ${KFN.nr} में प्रति आवासीय इकाई सीमा €${G_HI(KFN.maxProWE)} से बढ़ाकर €${G_HI(KFN.maxProWE_qng)} कर देती है। QNG के बिना विशेष मूल्यह्रास नहीं मिलता, भले ही बाकी सभी शर्तें पूरी हों।`,
    bauantrag: `§ 7b EStG की समय-सीमा: भवन आवेदन या भवन सूचना 01.01.${AFA.sonderVon} से 30.09.${AFA.sonderBis} के बीच दाखिल होनी चाहिए। तिथि आवेदन या भवन अनुमति में दर्ज होती है — यह निर्माण वर्ष से भिन्न है, जो पूर्णता को दर्शाता है।`,
    sonderAfa: `§ 7b EStG के अनुसार नए किराया-आवास हेतु विशेष मूल्यह्रास: पहले ${AFA.sonderJahre} वर्षों में सीधी-रेखा या घटते शेष मूल्यह्रास के ऊपर प्रति वर्ष अतिरिक्त ${AFA.sonderSatz}%। घटते शेष के साथ मिलाकर पहले वर्ष ${AFA.degressivSatz + AFA.sonderSatz}% तक। अन्य शर्तें: अधिग्रहण वर्ष और उसके बाद नौ वर्षों तक आवासीय उपयोग हेतु सशुल्क किराये पर देना अनिवार्य। वर्ष ${AFA.sonderJahre + 1} से मूल्यह्रास अवशिष्ट मूल्य पर आधारित होता है (§ 7a Abs. 9 EStG) और स्पष्ट रूप से घट जाता है।`,
    anschaffungMonat:
      "स्वामित्व हस्तांतरण का माह। सीधी-रेखा और घटते शेष मूल्यह्रास पहले वर्ष में अनुपातिक होते हैं (अक्टूबर में खरीद = 3/12)। § 7b EStG का विशेष मूल्यह्रास अनुपातिक नहीं होता — किराये का एक ही महीना पूरी एक-चौथाई सीमा खर्च कर देता है। इसलिए दिसंबर में खरीद कर की दृष्टि से जनवरी से बेहतर है, बदतर नहीं।",
    kostenQm: `अतिरिक्त लागत सहित भवन अधिग्रहण लागत, रहने के क्षेत्र से विभाजित। § 7b EStG का परीक्षण मान: €${G_HI(AFA.sonderKostenGrenzeQm)}/m² से ऊपर विशेष मूल्यह्रास पूरी तरह समाप्त हो जाता है — आंशिक कटौती नहीं होती, एक यूरो अधिक होने पर पूरा दावा चला जाता है। इससे अलग, मूल्यह्रास आधार स्वयं €${G_HI(AFA.sonderBemessungsCapQm)}/m² पर सीमित है।`,
    kfwAktiv: `बैंक ऋण के साथ दूसरे ऋण के रूप में चलने वाला KfW सब्सिडी ऋण — अपनी ब्याज दर, अवधि और चुकौती के साथ। कम KfW दर कुल वित्तपोषण की मिश्रित दर को घटाती है। संग्रहीत शर्तें स्वीकृति के समय ही अंतिम रूप से तय होती हैं।`,
    kfwNutzung: `तय करता है कि कौन-से कार्यक्रम दिखेंगे। "किराये पर" चुनने पर केवल जलवायु-अनुकूल नव-निर्माण (${KFN.nr}) उपलब्ध होता है — गृह-स्वामित्व कार्यक्रम (${WEP.nr}) केवल स्व-उपयोग को वित्तपोषित करता है, इसलिए वह सूची में आता ही नहीं।`,
    kfwProgramm: `जलवायु-अनुकूल नव-निर्माण (${KFN.nr}): मकान-मालिकों और स्व-उपयोगकर्ताओं दोनों के लिए, प्रति आवासीय इकाई €${G_HI(KFN.maxProWE)} तक (QNG के साथ €${G_HI(KFN.maxProWE_qng)}), संदर्भ दर लगभग ${Z_EN(KFN.zins)}% — दक्षता गृह 40 अनिवार्य। गृह-स्वामित्व कार्यक्रम (${WEP.nr}): केवल स्व-उपयोग, €${G_HI(WEP.maxProWE)} तक, संदर्भ दर लगभग ${Z_EN(WEP.zins)}%, कोई दक्षता शर्त नहीं।`,
    wohneinheiten: `संपत्ति में आवासीय इकाइयों की संख्या। KfW की सीमा प्रति इकाई लागू होती है, प्रति संपत्ति नहीं: QNG वाली दो इकाइयों पर €${G_HI(KFN.maxProWE_qng)} के बजाय €${G_HI(2 * KFN.maxProWE_qng)} मिलते हैं। इसलिए बहु-परिवार भवन को एकल फ्लैट की तुलना में कहीं अधिक सहायता मिलती है।`,
    kfwBetrag: `वांछित KfW हिस्सा। यह स्वतः कार्यक्रम की अधिकतम सीमा (प्रति इकाई €${G_HI(KFN.maxProWE)}, QNG के साथ €${G_HI(KFN.maxProWE_qng)}) और आपकी वास्तविक वित्तपोषण आवश्यकता तक सीमित कर दिया जाता है। शेष राशि बैंक वित्तपोषित करता है — इसीलिए बैंक ऋण तदनुसार घट जाता है।`,
    kfwZins: `सब्सिडी ऋण की प्रभावी दर। खाली छोड़ने पर संग्रहीत संदर्भ मान लागू होता है (${KFN.nr} हेतु ${Z_EN(KFN.zins)}%, ${WEP.nr} हेतु ${Z_EN(WEP.zins)}%)। वास्तविक दर अवधि, ब्याज-स्थिरता अवधि और चुकौती-मुक्त वर्षों पर निर्भर करती है और केवल आपके बैंक की स्वीकृति में दर्ज होती है।`,
    kfwTilgungsfrei: `प्रारंभिक वर्ष जिनमें केवल ब्याज देय होता है और मूलधन अपरिवर्तित रहता है — KfW में ${KFN.maxTilgungsfrei} वर्ष तक। इससे शुरुआती नकदी प्रवाह में राहत मिलती है, पर इसकी कीमत बाद में किस्त की छलांग और अधिक कुल ब्याज है, क्योंकि पूरी राशि पर लंबे समय तक भुगतान होता है।`,
    kfwLaufzeit: `सब्सिडी ऋण की कुल अवधि, अधिकतम ${KFN.maxLaufzeit} वर्ष। बैंक ऋण के विपरीत यहाँ अवधि तय की जाती है और उससे किस्त निकाली जाती है, उल्टा नहीं। ध्यान दें: ब्याज-स्थिरता अवधि केवल ${KFN.maxZinsbindung} वर्ष तक होती है — उसके बाद KfW ऋण के लिए भी पुनर्वित्त आवश्यक होता है।`,
  },
};
