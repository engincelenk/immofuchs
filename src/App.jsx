import { useState, useCallback, useMemo, createContext, useContext, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { MARKET_RATES, PFANDBRIEF, GREST, BL_N, BL_O, MIET_P, KFW, SAN_ENERGIE, SAN_NORMEN, SAN_TIERS, SAN_SRC_KEYS, LAND_F, LAND_BONUS_FQ, LAND_BONUS_CAP, ENERGIE_KLASSEN } from "./data.js";

// ═══ DATA (Marktdaten → src/data.js) ═══
import { PLZ_DB, isK15 } from "./data/plzData.js";
const T={de:{haupt:"Rendite",kredit:"Kredit",miete:"Miete",sanier:"Sanierung",hauptFull:"Renditerechner",kreditFull:"Finanzierungsrechner",mieteFull:"Mieterhöhungsrechner (§\u202f558 BGB)",sanierFull:"Sanierungsrechner",steuer6Full:"§\u202f6-Trick-Rechner",vfeFull:"Vorfälligkeitsentschädigung",steuer6:"§6-Trick",vfe:"Vorfällig.",bundesland:"Bundesland",kaufpreis:"Kaufpreis",flaeche:"Wohnfläche",preisQm:"Preis/m²",kaltmiete:"Kaltmiete (mtl.)",nichtUml:"Nicht umlagef.",leerstand:"Leerstand",eigenkapital:"Eigenkapital",zinssatz:"Zinssatz",tilgung:"Tilgung",zinsbindung:"Zinsbindung",grEst:"Grunderwerbsteuer",notar:"Notar & Grundbuch",makler:"Maklerprovision",steuersatz:"Steuersatz",afa:"AfA-Satz",grundAnteil:"Grundstücksanteil",gebAnteil:"Gebäudeanteil",wertP:"Wertsteigerung",jahre:"Analysezeitraum",sonder:"Garage/Stellplatz",plz:"PLZ",ort:"Ort",eingabe:"Eingabe",ergebnis:"Ergebnis",bruttoR:"Bruttorendite",nettoR:"Nettorendite",rate:"Rate/Mon.",cashflow:"Cashflow/Mon.",laufzeit:"Kreditlaufzeit",nbk:"Kaufnebenkosten",nbkSub:"Grunderwerbsteuer, Notar, Grundbuch",darlehen:"Darlehen",steuerErs:"Steuerersparnis",risk:"Risikolevel",niedrig:"Niedrig",mittel:"Mittel",hoch:"Hoch",check:"Schnellcheck",jPl:"Jahren",pJ:"Ø/Jahr",iwert:"Immobilienwert",gut:"Gut",ok:"Okay",krit:"Kritisch",nK:"nach Kosten",pos:"Positiv",zus:"Zuschuss nötig",oL:"Objekt & Lage",fin:"Finanzierung",stNk:"Nebenkosten & Steuer",wZ:"Wertsteigerung & Zeitraum",vgl:"Vergleichsmiete",lDat:"Letzte Erhöhung",lMiet:"Miete damals",mietbeginn:"Mietbeginn",kapp:"Kappungsgrenze",ang:"Angespannter Markt",std:"Standardmarkt",nE:"Nächste Mieterhöhung",mxE:"Max. Erhöhung",nM:"Neue Miete max.",jM:"Jetzt möglich",ab:"Ab",keE:"Keine Erhöhungen",mPl:"Mieterhöhungsplan",dat:"Datum",akt:"Aktuell",erh:"Erhöhung",sta:"Status",foe:"Förderung",amo:"Amortisation",eKl:"Energieklasse",vor:"Vorher",nac:"Nachher",esp:"Einsparung",co2:"CO₂-Reduktion",tPl:"Tilgungsplan",bel:"Beleihungsauslauf",rest:"Restschuld n. ZB",gZin:"Gesamtzinsen",gAuf:"Gesamtaufwand",gas:"Erdgas",oel:"Heizöl",wp:"Wärmepumpe",pel:"Pellets",fw:"Fernwärme",koh:"Kohle",str:"Strom",alt:"Über 20 J.",mitt:"10–20 J.",neu:"Unter 10 J.",mR:"Mietrecht",sBJ:"Baujahr",sHTyp:"Heizungstyp",sHAlt:"Heizung Alter",sPers:"Personen",sWfl:"Wohnfläche",sFenStd:"Standardfenster",sFenXL:"Extra-groß (>3m²)",sFenHST:"Hebeschiebetüren",sAnbau:"Anbausituation",sFasFl:"Fassadenfläche",sDaFl:"Dachfläche",sDaForm:"Dachform",sLeist:"Leistung",sKap:"Kapazität",sKeFl:"Kellerfläche",sOgFl:"Geschossdecke",sStrPr:"Strompreis",sHkos:"Heizkosten",sFqAvg:"Förderquote Ø",sJEsp:"Jährl. Ersparnis",sCO2R:"CO₂-Reduktion",sEnerEsp:"Energieeinsparung",sGesK:"Gesamtkosten Sanierung",sNetK:"Netto",sAmoR:"Amortisationsrechnung",sAmoSub:"Nettokosten ÷ jährl. Ersparnis",sMassDet:"Maßnahmen im Detail",sGesamt:"Gesamt",anbFrei:"Freistehend",anbDoppel:"Doppelhaus",anbMittel:"Mittelhaus",dchSattel:"Satteldach",dchFlach:"Flachdach",dchWalm:"Walmdach",sGebData:"Gebäudedaten",sEnergie:"Energiepreise",sStruktur:"Gebäudestruktur",sMassnahmen:"Maßnahmen auswählen",kennzahlen:"📈 Analyse & Kennzahlen",cfOhneSt:"CF/Mon. ohne Steuer",cfMitSt:"CF/Mon. mit Steuervorteil",cfBasis:"Miete − Kosten − Rate",eigennutzHinweis:"Eigennutzung geplant? Dieser Rechner ist für Kapitalanlagen optimiert.",cfMitSub:"inkl. AfA-Steuerersparnis",brGreen:"Solide Bruttorendite",brYellow:"Akzeptabel",brRed:"Unter Markt",brGreenTip:"Marktüblich ≥ 5 %. Guter Ausgangspunkt für positive Nettorendite.",brYellowTip:"Ausreichend, aber laufende Kosten schmälern die Nettomarge spürbar.",brRedTip:"Kaufpreis, Miete oder Nebenkosten prüfen. Unter 4 % schwer tragfähig.",nrGreen:"Attraktiv nach Kosten",nrYellow:"Laufende Kosten gedeckt",nrRed:"Kostenrisiko",nrGreenTip:"Alle laufenden Kosten eingerechnet. Solide Rendite.",nrYellowTip:"Deckt Kosten, aber wenig Puffer bei Leerstand oder Reparaturen.",nrRedTip:"Immobilie erwirtschaftet laufende Kosten kaum. Hohes Risiko.",cfOGreen:"Immobilie trägt sich",cfOYellow:"Knapp ausgeglichen",cfORed:"Monatlicher Zuschuss",cfOGreenTip:"Ohne jeglichen Steuervorteil positiv. Beste Ausgangslage.",cfOYellowTip:"Fast ausgeglichen. Leerstand von 1–2 Monaten kann bereits zum Problem werden.",cfORedTip:"Monatlicher Eigenaufwand nötig. Liquide Reserven einplanen — mind. 6 Monatsbeträge.",cfMGreen:"Positiv mit Steuervorteil",cfMYellow:"Knapp mit Steuerentlastung",cfMRed:"Negativ auch mit Steuer",cfMGreenTip:"Gut — aber nur wenn ausreichend Einkommensteuer gezahlt wird.",cfMYellowTip:"Nur mit vollem Steuervorteil knapp positiv. Steuerlast langfristig sicherstellen.",cfMRedTip:"Selbst nach AfA und Zinsabzug negativ. Stellschrauben: Kaufpreis, Mietansatz, EK-Quote.",belGreen:"Konservativ finanziert",belYellow:"Marktüblich",belRed:"Hohe Fremdfinanzierung",belGreenTip:"Beste Zinskonditionen. Hohe EK-Quote gibt Puffer bei Wertverlust.",belYellowTip:"Typisch bei Kapitalanlegern. Zinsaufschlag möglich.",belRedTip:"Bonität und Einkommen besonders relevant. Banken können Konditionen verschlechtern.",lzGreen:"Kurze Laufzeit",lzYellow:"Mittlere Laufzeit",lzRed:"Sehr lange Laufzeit",lzInf:"Wird nie getilgt",lzGreenTip:"Schnell schuldenfrei. Günstig für Kapitalbildung und spätere Flexibilität.",lzYellowTip:"Planbar. Nach Zinsbindungsende auf Anschlusskonditionen achten.",lzRedTip:"Lange Bindung erhöht Zinsänderungsrisiko erheblich. Tilgung erhöhen empfohlen.",lzInfTip:"Tilgung erhöhen — bei aktuellem Zinssatz wird der Kredit nie vollständig zurückgezahlt.",vermietQ:"Nutzungsart",vermietJa:"Kapitalanlage (vermietet)",vermietNein:"Eigennutzung",immLeerQ:"Belegung",immLeerJa:"Aktuell vermietet",immLeerNein:"Aktuell leer",chartTitle1:"Restschuld, Cashflow & Jahresmiete",chartRestschuld:"Restschuld",chartKumCF:"Kum. Cashflow",chartJahresmiete:"Jahresmiete",chartZinsbind:"Zinsbindung",chartTitle2:"Cashflow-Verlauf / Monat",chartCFOhne:"CF ohne Steuervorteil",chartCFMit:"CF mit Steuervorteil",chartDiff:"Differenz = Steuervorteil",chartHoverKumCF:"Kum. CF",chartHoverJahresmiete:"Jahresmiete",chartHoverCFOhne:"CF ohne Steuer",chartHoverCFMit:"CF mit Steuer",chartHoverSteuervorteil:"Steuervorteil",chartDisclamer:"⚠️ Steuervorteil setzt ausreichend Einkommensteuer voraus. Steuerberater konsultieren.",tblTitle:"Jahresentwicklung",tblJahresmiete:"Jahresmiete",tblCFOhne:"CF ohne St.",tblCFMit:"CF mit St.",tblSumme:"SUMME",detTitle:"Verkaufsszenario nach",detJahren:"Jahren",detSub:"Was bleibt, wenn die Immobilie nach dem Analysezeitraum verkauft wird?",detErtraege:"ERTRÄGE",detErloes:"Erlös aus Verkauf",detCumCFOhne:"Kum. CF ohne Steuervorteil",detCumSteuer:"Kum. Steuerersparnis",detSteuerHinweis:"Setzt ausreichend Einkommensteuer voraus",detAufwand:"AUFWENDUNGEN",detSumme:"Summe",detSaldoOhne:"Gesamtsaldo ohne Steuervorteil",detSaldoMit:"Gesamtsaldo mit Steuervorteil",detEKR:"EK-Rendite",detSteuerVoraus:"Setzt ausreichende Einkommensteuer voraus",detInfo:"Steuervorteil = Steuerersparnis durch Zinsabzug, AfA und nicht umlagefähige Kosten × Steuersatz. Nur relevant wenn ausreichend Einkommensteuer gezahlt wird.",saldoOhne:"Saldo ohne Steuer",saldoMit:"Saldo mit Steuer",sanTip1:"Reihenfolge: Zuerst Gebäudehülle (Fenster, Dach, Fassade), dann Heizung.",sanTip2:"Energieberater beauftragen: iSFP-Bonus +5% Förderung. Beratung 50% bezuschusst.",sanTip3:"BAFA-/KfW-Antrag IMMER VOR Auftragsvergabe stellen!",sanTip4:"GEG § 72: Heizungen >30 J. austauschen. § 71: 65% erneuerbare Energie.",sanTip5:"§ 35c EStG: 20% Sanierungskosten absetzbar über 3 J. (max. 40.000€).",sanTip6:"Hydraulischer Abgleich: KfW-Pflicht, senkt Heizkosten 5–15%.",sanTip7:"PV + Batteriespeicher: Eigenverbrauch ~70%. Ideal für E-Auto, Wärmepumpe.",sBerat:"Beratung",ertraege:"ERTRÄGE",aufwend:"AUFWENDUNGEN",gSaldoOhne:"GESAMTSALDO OHNE STEUERVORTEIL",gSaldoMit:"GESAMTSALDO MIT STEUERVORTEIL",merkliste:"Merkliste",speichernBtn:"Speichern",pdfExport:"Als PDF exportieren",rechtlGrundlagen:"Rechtliche Grundlagen",sondTilgLabel:"Sondertilgung",vereinbSatz:"Vereinbarter Satz",entspricht:"Entspricht",stdSond:"Standard: 5% des Darlehensbetrags (bei den meisten Banken frei vereinbar)",neueLaufzeit:"Neue Laufzeit",zinsenGespart:"Zinsen gespart",statt:"statt",effekt:"Effekt bei",steuerNeutral:"Steuerlich neutral ab Jahr",steuerNeutralSub:"(Steuerersparnis deckt Nebenkosten)",positivSaldo:"Positiver Gesamtsaldo",nachJahrenVerk:"nach {n} Jahren bei Verkauf",zins:"Zins",tilgK:"Tilg.",belCond90:"⚠️ >90% - Zinszuschlag",belCond80:"🟡 80-90% - normale Konditionen",belCondOk:"✅ <80% - beste Konditionen",markt:"Markt",riskShow:"▼ Einflussfaktoren anzeigen",riskHide:"▲ Einflussfaktoren ausblenden",rechtsHinweis:"Diese Angaben sind keine Rechtsberatung. Bei konkreten Fällen Steuerberater/Rechtsanwalt konsultieren.",analyseZr:"Analysezeitraum",vercomp:"Vergleichsmiete-Grenze erreicht",sanMassN1:"Fenstertausch",sanMassN2:"Fassade dämmen",sanMassN3:"Heizung erneuern",sanMassN4:"Dach erneuern",sanMassN5:"Eingangstür",sanMassN6:"Photovoltaik",sanMassN7:"Kellerdecke dämmen",sanMassN8:"Oberste Geschossdecke",sanMassN9:"Batteriespeicher",sanMassN10:"Wohnraumlüftung",sHkJahr:"Heizkosten/Jahr",sSkJahr:"Stromkosten/Jahr",sPreisstieg:"Energiepreis-Steigerung",sAutoCalc:"Auto",sPS0:"0 %/Jahr (konstant)",sPS1:"+1 %/Jahr",sPS2:"+2 %/Jahr (Prognose)",sPS3:"+3 %/Jahr",sPS5:"+5 %/Jahr (konservativ)",sCapHin:"BAFA/KfW-Cap angewandt",tierS:"Standard",tierG:"Gehoben",tierM:"Premium",sTierFenS:"Kunststoff",sTierFenG:"Alu-Kunstst.",sTierFenM:"Holz-Alu+App",sTierFasS:"10cm Dämmung",sTierFasG:"16cm höherwert.",sTierFasM:"20cm Öko-Hanf",sTierHzS:"Heizung+Pumpen",sTierHzG:"+Heizkörper+Steuer.",sTierHzM:"+Fußbodenh.+App",sTierDaS:"Neueindeckung+Dämm.",sTierDaG:"+Unterschicht+Spengl.",sTierDaM:"Neuer Dachstuhl",sTierTuS:"Standard-Sicherheit",sTierTuG:"Hochwertig",sTierTuM:"Premium+Fingerprint",sTierPvS:"Aufdach, Einspeisung",sTierPvG:"Indach+Energiemgmt",sTierPvM:"Solar-Dachziegel",sTierLuS:"Basis-Lüftung",sTierLuG:"Bessere Filter",sTierLuM:"Premium+Steuerung",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + Heizungstausch-Bonus",sSrcPv:"KfW 270 (zinsgünstig, EEG 2023)",sSrcBat:"Landesförderung (regional)",sondTilgSub:"Jährliche Extra-Zahlung zur Verkürzung der Laufzeit (§ 500 BGB)",adv1:"Brutto-Netto-Schere > 2 % - Kostenstruktur prüfen: Nicht-umlagefähige Kosten oder Leerstand drücken die Nettorendite stark.",adv2:"Vervielfältiger > 30 - Kaufpreis entspricht mehr als 30 Jahreskaltmieten. Amortisation durch Mieteinnahmen allein dauert sehr lange.",adv3:"Nettorendite unter Finanzierungszins - Negativer Leverage-Effekt: Fremdkapital kostet mehr als es einbringt.",adv4:"Spitzensteuersatz > 42 % - AfA und Zinsabzug haben maximale Steuerwirkung. Steuerstruktur mit Steuerberater optimieren.",adv5:"Grundstücksanteil > 40 % - Hoher Anteil reduziert die AfA-Bemessungsgrundlage. Kaufpreisaufteilung notwendig.",adv6:"Leerstand > 5 % & negativer Cashflow - Liquiditätsreserve von mind. 6 Monatsmieten empfohlen.",adv7:"Anschlussfinanzierung > 60 % des Darlehens - Hohes Zinsänderungsrisiko nach Zinsbindung. Forward-Darlehen prüfen.",adv8:"Zinsbindung < 10 Jahre & Zins > 3,5 % - Anschlussrisiko erhöht. Mind. 10 Jahre Zinsbindung empfohlen.",adv9:"Tilgung < 2 % - Sehr geringe Tilgung. Auf mind. 2 % anheben, um Laufzeit zu verkürzen.",adv10:"Sondertilgung nicht genutzt - Jährliche Sondertilgung würde Laufzeit und Gesamtzinsen erheblich reduzieren.",adv11:"Beleihungsauslauf 80-90 % - Mit mehr Eigenkapital wären bessere Zinskonditionen möglich.",adv12:"Miete > 15 % unter Vergleichsmiete - Schrittweise Angleichung möglich. Kappungsgrenze noch nicht ausgeschöpft.",adv13:"Letzte Erhöhung > 3 Jahre - Kappungsfenster vollständig zurückgesetzt. Maximaler Spielraum für Erhöhung verfügbar.",adv14:"Kappungsgrenze erreicht, Vergleichsmiete deutlich höher - Erst nach erneutem Ablauf des 3-Jahres-Fensters wieder voller Spielraum.",adv15:"Angespannter Markt & Miete nahe Vergleichsmiete - § 559 BGB Modernisierungsmieterhöhung als Alternative prüfen.",adv16:"Amortisation > 20 Jahre - KfW-Kredit (z.B. 261) mit Zinsvorteil kann Amortisationsdauer erheblich verkürzen.",adv17:"Energieklasse nach Sanierung noch unter C - Unter Klasse C droht ab 2033 ein EU-Vermietungsverbot (geplante EED-Umsetzung).",adv18:"Heizungstausch ohne Dämmung - Wärmepumpe benötigt gedämmte Gebäudehülle. Effizienz stark eingeschränkt ohne Fassaden-/Dachdämmung.",advTitle:"💡 Analyse",datastand:"Datenstand",garageKauf:"Garage/Stellplatz",sonderUml:"Sonderumlage",renovierung:"Renovierungskosten",renovSofort:"✅ Unter 15%-Grenze — sofort als Werbungskosten absetzbar (§ 6 Abs. 1 Nr. 1a EStG).",renovAktiv:"⚠️ Über 15%-Grenze — aktivierungspflichtig, kein Sofortabzug. Wird über AfA abgeschrieben.",renovEigennutz:"Bei Eigennutzung steuerlich nicht absetzbar.",renovGrenzHinw:"15%-Grenze des Gebäude-Kaufpreises",stCheck:"Selbstträger-Check",stZielKP:"Ziel-Kaufpreis (CF\u00a0=\u00a00)",stSelbstAb:"Selbstträger ab",stOhneStAkt:"Ohne Steuer\u00b7bei aktuellem Kaufpreis",stSofort:"Sofort",stAusserhalb:"Außerhalb",stCFPositiv:"CF positiv ab Tag\u00a01",stMietSteig:"Mietsteigerung",stVerhandlZiel:"Verhandlungsziel",stIstKPPuffer:"unter Ist-KP\u00a0—\u00a0Puffer",stMitStVor:"Mit Steuervorteil",stUnterZiel:"unter Ziel",stHero1:"Das Objekt trägt sich selbst\u00a0— Cashflow ist positiv, ohne jeden Steuervorteil. Perfekter Ausgangspunkt.",stHero2:"Mit Steuervorteil selbsttragend ({cf}/Mon.). Ohne Steuer fehlen noch {diff}/Mon.\u00a0— kleines Puffer-Risiko.",stHero3:"Verhandle den KP um {diff} ({pct}) auf {kp} herunter\u00a0— dann trägt das Objekt sich selbst, ohne jeden Monat zuzuzahlen.",stHero4a:"Erst ab Jahr {j} selbsttragend (Mietsteigerungen). Sofort selbsttragend ab: {kp}.",stHero4b:"Trägt sich zum aktuellen Preis nicht selbst. Ziel-KP: {kp} (−{diff}).",stVerdictJa:"Ja",stVerdictNein:"Nein",expandAll:"Alle aufklappen",collapseAll:"Alle zuklappen",stWhyJa:"Schon ohne Steuervorteil bleibt ein Plus von +{cf}/Mon. Perfekter Ausgangspunkt.",stWhyNein:"Ohne Steuervorteil zahlst du {cf}/Mon. aus eigener Tasche dazu.",stTaxPos:"Mit Steuervorteil wäre der Cashflow positiv (+{cf}/Mon.) — das macht die Immobilie aber NICHT selbsttragend. Der Vorteil ist kein echter Cashflow und setzt ausreichende Steuerlast voraus.",stTaxNeg:"Auch mit Steuervorteil fehlen noch {cf}/Mon. bis zur Selbsttragung.",stTaxBonus:"Mit Steuervorteil steigt der Überschuss auf +{cf}/Mon.",close:"Schließen",saveBtnLabel:"Speichern",saveModalTitle:"Objekt speichern",savePlaceholder:"z. B. Wohnung München · 2. OG",saveConfirm:"Speichern",emptyTitle:"Noch keine Objekte gespeichert",emptyHint:"Berechne ein Objekt und tippe auf „Speichern“, um es hier zu sichern.",countSingular:"Objekt gespeichert",countPlural:"Objekte gespeichert",loadBtn:"↩ Laden",deleteTitle:"Objekt löschen?",deleteHint:"Diese Berechnung wird unwiderruflich gelöscht.",cancelBtn:"Abbrechen",deleteBtn:"Löschen",defaultObjName:"Objekt",sanIsfpLabel:"iSFP — Individueller Sanierungsfahrplan",sanIsfpSub:"+5% BAFA-Bonus auf alle BEG-Maßnahmen (Bundesförderung, § 89 GEG)",sanIsfpActive:"iSFP aktiv — +5% BAFA-Bonus auf alle BEG-Maßnahmen eingerechnet",sanIsfpTip:"iSFP aktiviert — +5% BAFA-Bonus bereits eingerechnet. Beratungskosten 50% bezuschusst.",sanLandesbankHint:"BAFA-Fördersätze gelten bundesweit einheitlich",sanLandDis:"Schätzwert, bitte aktuell prüfen",rfTitle:"Was das bedeutet",rfBelT:"Hohe Fremdfinanzierung",rfBelD:"Weniger als 20 % Eigenkapital. Banken verlangen oft Zinsaufschlag — Ausfallrisiko steigt.",rfNrT:"Schwache Nettorendite",rfNrD:"Unter 3 % nach Abzug aller Kosten. Kaum Puffer für Leerstand oder unerwartete Reparaturen.",rfCfT:"Negativer Cashflow",rfCfD:"Du zahlst monatlich drauf. Mindestens 6 Monatsmieten Liquiditätsreserve einplanen.",rfZT:"Hoher Zinssatz",rfZD:"Über 4 % Sollzins erhöht Rate und schmälert den Cashflow spürbar.",rfTT:"Geringe Tilgung",rfTD:"Unter 2 % jährlich. Schuldenfrei erst nach sehr langer Zeit — Laufzeit- und Zinsrisiko steigen.",rfLzT:"Sehr lange Laufzeit",rfLzD:"Über 35 Jahre Restlaufzeit. Hohes Risiko bei der Anschlussfinanzierung nach Zinsbindungsende.",rfPT:"Hoher Kaufpreis je m²",rfPD:"Über 5.000 €/m² erhöht den Kaufpreis relativ zur Miete — Rendite und Amortisation leiden.",rfEkT:"Geringes Eigenkapital",rfEkD:"Unter 20 % des Kaufpreises. Mehr Eigenkapital sichert bessere Konditionen und mehr Sicherheit.",rfLsT:"Hoher Leerstand",rfLsD:"Über 5–8 % Leerstandsquote mindert Mieteinnahmen deutlich. Lage und Reserve prüfen.",badgeGut:"Gut",badgeOkay:"Okay",badgeKrit:"Kritisch",badgeNeutral:"Info",jahrN:"Jahr {n}",monAbb:"/Mon.",monLabel:"Mon.",steuerErsTip:"AfA: {a}/J. | Zinsen abzugsfähig: {b}/J.",nkAmortOk:"✓ NK amortisiert",nkAmortMid:"~ NK amortisiert",nkAmortNo:"⚠ NK amortisiert",nkAmortTip:"Kaufnebenkosten ({nbk}) durch Steuerersparnis in {beJ} Jahren zurückgeholt",
sec1Q:"Welche Rendite erziele ich?",sec1Hint:"Rendite",
sec1GreenBR:"Solide Rendite — die Immobilie wirft mehr ab als ein Tagesgeldkonto oder eine sichere Anleihe. Das ist eine starke Ausgangsbasis für ein Investment.",sec1YellowBR:"Rendite im unteren Bereich — die Zahlen sind noch akzeptabel, aber prüfe ob Kaufpreis, Miete oder Kosten noch Spielraum haben.",sec1RedBR:"Niedrige Rendite — das Verhältnis von Kaufpreis zu Miete stimmt noch nicht. Entweder ist der Preis zu hoch, die Miete zu niedrig, oder die Nebenkosten zu groß. Verhandeln oder weitersuchen.",
sec2Q:"Wie ist mein monatlicher Cashflow?",sec2Hint:"Cashflow",
sec2GreenCF:"Die Immobilie trägt sich selbst — die Mieteinnahmen decken alle laufenden Kosten. Du musst monatlich keinen eigenen Euro dazugeben. Das ist das Ziel jedes Investors.",sec2YellowCF:"Knapp ausgeglichen — die Miete reicht gerade so. Wenn der Mieter 1–2 Monate nicht zahlt oder die Heizung ausfällt, musst du selbst einspringen. Plane mindestens 3–6 Monatsmieten als Reserve ein.",sec2RedCF:"Du zahlst jeden Monat aus eigener Tasche dazu. Das ist nicht per se schlecht — wenn der Steuervorteil oder die Wertsteigerung das ausgleicht. Aber du brauchst ausreichend liquide Reserven.",
sec3Q:"Was zahle ich der Bank?",sec3Hint:"Finanzierung",
sec3GreenBel:"Konservative Finanzierung — du bringst viel Eigenkapital mit. Die Bank bekommt weniger als 70% des Kaufpreises als Kredit und gibt dir dafür die besten Zinsen. Das schützt dich auch bei fallenden Preisen.",sec3YellowBel:"Marktübliche Finanzierung — dein Eigenkapital ist solide, aber die Bank trägt ein mittleres Risiko. Du bekommst gute, aber nicht die besten Zinsen. Kein Problem — das ist der Standard für die meisten Käufer.",sec3RedBel:"Hohe Fremdfinanzierung — du kaufst fast ohne Eigenkapital. Das maximiert deinen Hebel, aber auch dein Risiko. Die Bank wird strengere Anforderungen stellen und höhere Zinsen verlangen. Cashflow prüfen!",
sec4Q:"Kaufnebenkosten & Steuervorteil",sec4Hint:"Staat & Steuern",
sec4LowTax:"Dein Steuersatz ist niedrig — das bedeutet: weniger Steuern zu zahlen, aber auch weniger Steuervorteil durch AfA. Für dich zählt vor allem der Saldo ohne Steuer. Die Kaufnebenkosten (Grunderwerbsteuer, Notar, Grundbuch) musst du einmalig zahlen — danach gehört die Immobilie dir.",sec4MidTax:"Mittlerer Steuersatz — das bedeutet: Du kannst Zinsen und AfA von der Steuer absetzen und zahlst dadurch weniger Einkommensteuer. Der Steuervorteil macht die Immobilie für dich attraktiver. Kaufnebenkosten fallen einmalig an und gehen an Staat und Notar.",sec4HighTax:"Hoher Grenzsteuersatz — das bedeutet: Du profitierst maximal vom Steuervorteil. Jeder Euro AfA und Zinsen reduziert deine Steuerlast spürbar. Als Gutverdiener ist die Immobilie als Steuerinstrument besonders wirksam. Kaufnebenkosten (ca. 10–15%) fallen einmalig an.",
sec5Q:"Wie entwickelt sich die Immobilie?",sec5Hint:"Zeitverlauf",sec5Sub:"Cashflow, Restschuld und Jahresmiete über den Analysezeitraum.",
sec6Q:"Was bleibt am Ende?",sec6Hint:"Gesamtergebnis",
sec6GreenG:"Positives Ergebnis — nach allen Kosten, Zinsen und Steuern bleibt am Ende ein Plus. Dein Eigenkapital hat sich vermehrt. Das ist das Ziel.",sec6RedG:"Negatives Ergebnis — nach allen Kosten bleibt ein Minus. Das kann trotzdem akzeptabel sein, wenn der Steuervorteil oder die Wertsteigerung nicht eingerechnet wurde. Prüfe die Annahmen.",
sec6SaldoOhneHint:"Ohne Steuervorteile — du zahlst deine Steuern normal. Für Geringverdiener oder Menschen ohne Einkommensteuer ist das deine realistische Zahl.",sec6SaldoMitHint:"Mit Steuervorteil — als Gutverdiener kannst du AfA, Zinsen und nicht umlagefähige Kosten von der Einkommensteuer absetzen. Setzt ausreichende Einkommensteuer voraus.",sec7Q:"Was bleibt beim Verkauf nach {j} Jahren?",sec7Hint:"Verkaufsszenario",sec7Sub:"Hier siehst du, was bleibt wenn du nach {j} Jahren verkaufst. Den Analysezeitraum kannst du oben im Feld 'Analysezeitraum' anpassen.",selfQ:"Trägt sich die Immobilie von selbst?",selfHint:"Selbstträger-Check",secOpen:"Wie kommt das Ergebnis zustande?",secClose:"Weniger anzeigen",ekRTitle:"EK-Rendite p.a.",ekRMit:"EK-Rendite mit Steuer",ekROhne:"EK-Rendite ohne Steuer",ekRHorizon:"{j} Jahre Anlagehorizont",ekRConserv:"Konservative Betrachtung",ekRTip1:"Dein Eigenkapital ({ek}) wächst mit {p} p.a. — zum Vergleich: ETF historisch ~7%",ekRTip2:"Ohne Steuerbonus — für Geringverdiener oder Basis-Szenario"},
en:{haupt:"Return",kredit:"Loan",miete:"Rent",sanier:"Renovation",hauptFull:"Yield Calculator",kreditFull:"Financing Calculator",mieteFull:"Rent Increase Calculator (§\u202f558 BGB)",sanierFull:"Renovation Calculator",steuer6Full:"§\u202f6 Trick Calculator",vfeFull:"Early Repayment Fee",steuer6:"§6 Trick",vfe:"Prepaymt.",bundesland:"State",kaufpreis:"Purchase price",flaeche:"Living area",preisQm:"Price/m²",kaltmiete:"Cold rent (mo.)",nichtUml:"Non-recoverable",leerstand:"Vacancy",eigenkapital:"Equity",zinssatz:"Interest rate",tilgung:"Repayment",zinsbindung:"Fixed rate period",grEst:"Transfer tax",notar:"Notary",makler:"Broker fee",steuersatz:"Tax rate",afa:"Depreciation",grundAnteil:"Land portion",gebAnteil:"Building portion",wertP:"Appreciation",jahre:"Analysis period",sonder:"Garage/parking",plz:"Postal code",ort:"City",eingabe:"Input",ergebnis:"Result",bruttoR:"Gross yield",nettoR:"Net yield",rate:"Rate/mo.",cashflow:"Cashflow/mo.",laufzeit:"Loan term",nbk:"Purchase costs",nbkSub:"Transfer tax, notary, land registry",darlehen:"Loan",steuerErs:"Tax savings",risk:"Risk level",niedrig:"Low",mittel:"Medium",hoch:"High",check:"Quick check",jPl:"years",pJ:"Ø/year",iwert:"Property value",gut:"Good",ok:"Okay",krit:"Critical",nK:"after costs",pos:"Positive",zus:"Subsidy needed",oL:"Property & Location",fin:"Financing",stNk:"Costs & Taxes",wZ:"Appreciation & Period",vgl:"Comparable rent",lDat:"Last increase",lMiet:"Rent then",mietbeginn:"Rental start",kapp:"Rent cap",ang:"Tight market",std:"Standard market",nE:"Next increase",mxE:"Max. increase",nM:"Max. new rent",jM:"Possible now",ab:"From",keE:"No increases",mPl:"Rent increase plan",dat:"Date",akt:"Current",erh:"Increase",sta:"Status",foe:"Subsidy",amo:"Payback",eKl:"Energy class",vor:"Before",nac:"After",esp:"Savings",co2:"CO₂ reduction",tPl:"Amortization",bel:"Loan-to-value",rest:"Remaining debt",gZin:"Total interest",gAuf:"Total expense",gas:"Natural gas",oel:"Heating oil",wp:"Heat pump",pel:"Pellets",fw:"District heat",koh:"Coal",str:"Electric",alt:"Over 20 yr",mitt:"10–20 yr",neu:"Under 10 yr",mR:"Tenancy law",sBJ:"Year built",sHTyp:"Heating type",sHAlt:"Heating age",sPers:"Persons",sWfl:"Living area",sFenStd:"Standard windows",sFenXL:"Extra-large (>3m²)",sFenHST:"Lift-slide doors",sAnbau:"Attached situation",sFasFl:"Facade area",sDaFl:"Roof area",sDaForm:"Roof shape",sLeist:"Power",sKap:"Capacity",sKeFl:"Basement area",sOgFl:"Floor ceiling",sStrPr:"Electricity price",sHkos:"Heating costs",sFqAvg:"Avg. subsidy quota",sJEsp:"Annual savings",sCO2R:"CO₂ reduction",sEnerEsp:"Energy savings",sGesK:"Total renovation cost",sNetK:"Net",sAmoR:"Payback calculation",sAmoSub:"Net cost ÷ annual savings",sMassDet:"Measures in detail",sGesamt:"Total",anbFrei:"Detached",anbDoppel:"Semi-detached",anbMittel:"Mid-terrace",dchSattel:"Gable roof",dchFlach:"Flat roof",dchWalm:"Hip roof",sGebData:"Building data",sEnergie:"Energy prices",sStruktur:"Building structure",sMassnahmen:"Select measures",kennzahlen:"📈 Analysis & Key Metrics",cfOhneSt:"CF/Mo. without Tax Benefit",cfMitSt:"CF/Mo. with Tax Benefit",cfBasis:"Rent − Costs − Payment",eigennutzHinweis:"Planning to use this property yourself? This calculator is optimised for rental investments.",cfMitSub:"incl. depreciation tax saving",brGreen:"Solid gross yield",brYellow:"Acceptable",brRed:"Below market",brGreenTip:"Market standard ≥ 5%. Good starting point for positive net yield.",brYellowTip:"Sufficient, but running costs will noticeably reduce net margin.",brRedTip:"Check purchase price, rent or ancillary costs. Below 4% hard to sustain.",nrGreen:"Attractive after costs",nrYellow:"Running costs covered",nrRed:"Cost risk",nrGreenTip:"All running costs included. Solid return.",nrYellowTip:"Covers costs, but little buffer for vacancy or repairs.",nrRedTip:"Property barely covers running costs. High risk.",cfOGreen:"Property self-sustaining",cfOYellow:"Barely balanced",cfORed:"Monthly top-up needed",cfOGreenTip:"Positive without any tax benefit. Best case.",cfOYellowTip:"Nearly balanced. 1-2 months vacancy can already become a problem.",cfORedTip:"Monthly personal contribution needed. Plan liquid reserves — at least 6 months.",cfMGreen:"Positive with tax benefit",cfMYellow:"Narrowly positive",cfMRed:"Negative even with tax",cfMGreenTip:"Good — but only if sufficient income tax is paid.",cfMYellowTip:"Narrowly positive only with full tax benefit.",cfMRedTip:"Negative even after depreciation and interest deduction.",belGreen:"Conservatively financed",belYellow:"Market standard",belRed:"High leverage",belGreenTip:"Best interest rates. High equity ratio provides buffer against value decline.",belYellowTip:"Typical for investors. Possible interest rate surcharge.",belRedTip:"Creditworthiness and income particularly relevant.",lzGreen:"Short term",lzYellow:"Medium term",lzRed:"Very long term",lzInf:"Never repaid",lzGreenTip:"Debt-free quickly. Good for capital building and future flexibility.",lzYellowTip:"Manageable. Monitor refinancing conditions after fixed-rate period.",lzRedTip:"Long commitment increases interest rate change risk. Increase repayment.",lzInfTip:"Increase repayment — at current rate the loan is never fully repaid.",vermietQ:"Rent out property?",vermietJa:"Yes, rented out",vermietNein:"No / Owner-occupied",immLeerQ:"Currently rented?",immLeerJa:"Yes, currently rented",immLeerNein:"No, currently vacant",chartTitle1:"Remaining Debt, Cashflow & Annual Rent",chartRestschuld:"Remaining debt",chartKumCF:"Cum. cashflow",chartJahresmiete:"Annual rent",chartZinsbind:"Fixed rate end",chartTitle2:"Monthly Cashflow Over Time",chartCFOhne:"CF without tax benefit",chartCFMit:"CF with tax benefit",chartDiff:"Difference = tax benefit",chartHoverKumCF:"Cum. CF",chartHoverJahresmiete:"Annual rent",chartHoverCFOhne:"CF without tax",chartHoverCFMit:"CF with tax",chartHoverSteuervorteil:"Tax benefit",chartDisclamer:"⚠️ Tax benefit requires sufficient income tax. Consult a tax advisor.",tblTitle:"Annual development",tblJahresmiete:"Annual rent",tblCFOhne:"CF w/o tax",tblCFMit:"CF w/ tax",tblSumme:"TOTAL",detTitle:"Sale scenario after",detJahren:"years",detSub:"What remains if the property is sold after the analysis period?",detErtraege:"INCOME",detErloes:"Sale proceeds",detCumCFOhne:"Cum. CF without tax benefit",detCumSteuer:"Cum. tax savings",detSteuerHinweis:"Requires sufficient income tax",detAufwand:"EXPENSES",detSumme:"Total",detSaldoOhne:"Total balance without tax benefit",detSaldoMit:"Total balance with tax benefit",detEKR:"Equity return",detSteuerVoraus:"Requires sufficient income tax",detInfo:"Tax benefit = tax savings from interest deduction, depreciation and non-recoverable costs × tax rate.",saldoOhne:"Balance w/o tax",saldoMit:"Balance w/ tax",sanTip1:"Order: Envelope first (windows, roof, facade), then heating.",sanTip2:"Hire energy advisor: iSFP bonus +5%. Advisory 50% subsidized.",sanTip3:"BAFA/KfW application BEFORE awarding contracts!",sanTip4:"GEG § 72: Heating >30 yr must be replaced. § 71: 65% renewable.",sanTip5:"§ 35c EStG: 20% deductible over 3 yr (max. €40,000).",sanTip6:"Hydraulic balancing: KfW-required, reduces heating 5–15%.",sanTip7:"PV + Battery: Self-consumption ~70%. Ideal for EV, heat pump.",sBerat:"Advisory",ertraege:"INCOME",aufwend:"EXPENSES",gSaldoOhne:"TOTAL BALANCE WITHOUT TAX BENEFIT",gSaldoMit:"TOTAL BALANCE WITH TAX BENEFIT",merkliste:"Saved",s1b1:"Gross yield: annual rent ({a}) ÷ purchase price ({b}) = {c}",s1b2:"Net yield: after deducting non-recoverable costs",s1b2v:" and vacancy losses",s1b3:"Comparison: savings ~3 %, gov. bonds ~3.5 %, equity ETF ~7 % p.a.",s1b4:"Price-to-rent: {x}× annual rent (20–25× solid, >30× expensive)",s1b5:"Large cost gap — {x} spread: check non-recoverable costs!",s1b6:"⚠ Net yield ({a}) below loan rate ({b}) — borrowing costs more than the property earns",s1t1:"Gross yield is the first quick check: annual rent ÷ total purchase price. At {rent} rent and {price} price that is {bR} gross. Net yield is more honest — it deducts all non-recoverable costs.",s1t2a:"At {nR} you are well above savings and bonds. Strong starting point.",s1t2b:"{nR} yield is acceptable — watch whether running costs rise.",s1t2c:"{nR} yield is weak — barely above savings, without the property risk.",s1t3:"Levers: lower purchase price · raise rent (§558 BGB) · reduce non-recoverable costs.",s2b1:"Cash flow without tax: rent − non-recoverable costs − loan payment = {a}/month",s2b2:"Cash flow with tax benefit: {a}/month (tax saving: {b}/month extra)",s2b3n:"You top up {a}/month — that is {b}/year out of pocket",s2b3p:"The property sustains itself — even without the tax benefit",s2b4:"With tax benefit the cash flow turns positive — but it only arrives with the tax return",s2b5:"Total annuity: {a}/month (interest: {b}, repayment: {c})",s2t1:"Cash flow answers: do I add money each month or does the property generate income? Formula: rent − non-recoverable costs − loan payment. Positive = self-financing.",s2t2:"As landlord you can deduct loan interest and depreciation from tax. This benefit comes with the tax return, not monthly.",s2t3n:"Negative cash flow is not automatically bad — but you must actually have these reserves.",s2t3p:"Positive cash flow without tax benefit is the gold standard.",s2t4:"Levers: lower repayment rate · more equity · higher rent or lower vacancy.",s3b1p:"→ best rates possible",s3b1m:"→ small surcharge typical",s3b1h:"→ significant rate surcharge",s3b1:"Loan-to-value (LTV): {a} — bank finances {a} of the purchase price{suf}",s3b2:"Monthly payment: {a} (interest: {b} + repayment: {c})",s3b3a:"Loan term: approx. {x} years at {p} p.a. repayment",s3b3b:"Loan term: ∞ — at this repayment rate the loan will never be fully repaid!",s3b4:"Loan amount: {a} (equity {b} = {c} equity ratio)",s3b5:"Above 80 % LTV banks charge surcharges — this noticeably increases your loan costs",s3b6:"⚠ At this repayment rate you pay interest forever — increase to at least 2 % p.a.",s3t1:"LTV shows what percentage of the purchase price the bank lends. Below 60 %: best rates; 60–80 %: standard; above 80 %: surcharge.",s3t2a:"At {p} p.a. repayment the loan is paid off in approx. {lz} years.",s3t2b:"Warning: at this repayment rate the loan is never fully repaid.",s3t3:"Levers: more equity lowers both LTV and rate. Higher repayment shortens the term.",s4b1:"Tax saving: {a}/year ≈ {b}/month (at {c} tax rate)",s4b2:"Two deductible items: loan interest ({a}/year) + depreciation ({b}/year)",s4b3:"Depreciation base: {a}% building portion × {b} p.a. = {c}/year",s4b4a:"Purchase costs: {a} — recovered through tax savings by year {b}",s4b4b:"Purchase costs: {a} — break-even not yet reached",s4b5:"Tip: check year built! Before 1925 → 2.5 % depreciation. Extra: {x}/year",s4b6:"Rule: the higher your tax rate, the more you benefit — tax advantage is a tool for high earners",s4t1:"The state subsidises landlords indirectly via two mechanisms: (1) loan interest deductible as business expense; (2) depreciation allowance on the building.",s4t2:"Only the building portion ({p}%) is depreciable. Rate: post-1924 = 2 % p.a., pre-1925 = 2.5 %, from 2023 = 3 %.",s4t3:"Levers: keep building portion realistic. Check depreciation rate by year of construction.",s5b1a:"Remaining debt: starts at {a}, falls through repayment and reaches 0 in year {b}",s5b1b:"Remaining debt: starts at {a}, not fully repaid within {b} years",s5b2:"Cumulative cash flow: total money in or out up to each year",s5b3:"Annual rent: grows over time through rent increases",s5b4:"Fixed rate end: in year {x} your fixed rate expires — market rate applies after",s5b5p:"Cumulative cash flow over the analysis period is positive — the property earned more than it cost",s5b5n:"Cumulative cash flow is negative — you paid in more than you received",s5t1:"The three curves tell the story of your investment:\n\nRemaining debt (falling): early on most of the payment goes to the bank as interest. Renegotiate at the fixed-rate end (year {zb}).\n\nCumulative cash flow: when does it turn positive? That is your cash break-even.\n\nAnnual rent: grows slowly through rent increases.",s6b1:"Total return with tax: {a} over {j} years",s6b2:"Formula: ({vw} sale − {rs} debt) + {cf} cum. CF − {inv} investment",s6b3:"Appreciation: {a} in {j} years ({p} p.a.)",s6b4:"Equity return p.a. (with tax): {a} — comparison: savings ~3 %, ETF ~7 %",s6b5p:"Loan fully repaid!",s6b5n:"Remaining debt on sale: {a} — repaid from sale proceeds",s6b6p:"Cumulative cash flow: {a} — net profit over the period",s6b6n:"Cumulative cash flow: {a} — net capital invested",s6t1:"The total result adds everything up: sale proceeds ({vw}) − remaining debt ({rs}) + cumulative cash flow ({cf}) − total investment.",s6t2p:"Result positive — the investment was worthwhile.",s6t2n:"Result negative — under current assumptions you invested more than you gained.",s6t3a:"Equity return {a} p.a.: excellent — beats historical ETF returns.",s6t3b:"Equity return {a} p.a.: solid. ETF ~7 %, but without leverage.",s6t3c:"Equity return {a} p.a.: acceptable, but thin margin for financing risk.",s6t3d:"Equity return {a} p.a.: weak. Review your assumptions.",s7b1:"Estimated sale value in year {j}: {vw} (appreciation: {p} p.a.)",s7b2a:"Remaining debt on sale: {a} — repaid from sale proceeds",s7b2b:"Remaining debt on sale: {a}",s7b3:"Net proceeds after repayment: {a}",s7b4:"Agent fees not included — in practice 3–7 % of the sale price on top",s7b5p:"10-year speculation period passed: capital gain tax-free!",s7b5n:"Speculation period still running — capital gains taxed at income tax rate",s7t1:"The table shows all components of the sale proceeds. {vw} is an estimate based on {p} p.a. appreciation.",s7t2:"Compare market value ({vw}) with remaining debt ({rs}): if debt is higher you cannot sell without a loss.",s7t3p:"Tax: after 10 years the capital gain is tax-free (§23 EStG).",s7t3n:"Note: currently in the 10-year speculation period. Gains taxed at income tax rate.",s7t4:"Don't forget selling costs: agent (3–7 %), notary, land registry — not included here.",speichernBtn:"Save",pdfExport:"Export as PDF",rechtlGrundlagen:"Legal Basis",sondTilgLabel:"Extra Repayment",vereinbSatz:"Agreed rate",entspricht:"Equals",stdSond:"Standard: 5% of loan amount (freely negotiable at most banks)",neueLaufzeit:"New term",zinsenGespart:"Interest saved",statt:"instead of",effekt:"Effect at",steuerNeutral:"Tax-neutral from year",steuerNeutralSub:"(tax savings cover ancillary costs)",positivSaldo:"Positive total balance",nachJahrenVerk:"after {n} years on sale",zins:"Int.",tilgK:"Rep.",belCond90:"⚠️ >90% - rate surcharge",belCond80:"🟡 80-90% - standard terms",belCondOk:"✅ <80% - best terms",markt:"Market",riskShow:"▼ Show key factors",riskHide:"▲ Hide factors",rechtsHinweis:"No legal advice. Consult a tax advisor or lawyer for specific cases.",analyseZr:"Analysis period",vercomp:"Reference rent ceiling reached",sanMassN1:"Window replacement",sanMassN2:"Facade insulation",sanMassN3:"Heating renewal",sanMassN4:"Roof renewal",sanMassN5:"Front door",sanMassN6:"Photovoltaics",sanMassN7:"Basement ceiling insulation",sanMassN8:"Top floor ceiling",sanMassN9:"Battery storage",sanMassN10:"Ventilation",sHkJahr:"Heating costs/year",sSkJahr:"Electricity costs/year",sPreisstieg:"Energy price increase",sAutoCalc:"Auto",sPS0:"0 %/year (constant)",sPS1:"+1 %/year",sPS2:"+2 %/year (forecast)",sPS3:"+3 %/year",sPS5:"+5 %/year (conservative)",sCapHin:"BAFA/KfW cap applied",sTierFenS:"PVC frame",sTierFenG:"Alu-composite",sTierFenM:"Wood-alu+app",sTierFasS:"10cm insulation",sTierFasG:"16cm premium",sTierFasM:"20cm eco-hemp",sTierHzS:"Heating+pumps",sTierHzG:"+radiators+ctrl",sTierHzM:"+underfloor+app",sTierDaS:"Re-roofing+insul.",sTierDaG:"+underlay+sheet",sTierDaM:"New roof structure",sTierTuS:"Standard security",sTierTuG:"High quality",sTierTuM:"Premium+fingerprint",sTierPvS:"On-roof, feed-in",sTierPvG:"In-roof+energy mgmt",sTierPvM:"Solar roof tiles",sTierLuS:"Basic ventilation",sTierLuG:"Better filters",sTierLuM:"Premium+control",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + heating bonus",sSrcPv:"KfW 270 (low interest, EEG 2023)",sSrcBat:"State subsidy (regional)",sondTilgSub:"Annual extra repayment to shorten the loan term (§ 500 BGB)",adv1:"Gross-net gap > 2 % - Review cost structure: non-recoverable costs or vacancy are reducing net yield significantly.",adv2:"Multiplier > 30 - Purchase price exceeds 30 annual net rents. Amortisation through rent alone takes very long.",adv3:"Net yield below financing rate - Negative leverage effect: debt costs more than it earns.",adv4:"Top tax rate > 42 % - Depreciation and interest deduction have maximum tax impact. Optimise tax structure with advisor.",adv5:"Land portion > 40 % - High land share reduces depreciable base. Purchase price allocation required.",adv6:"Vacancy > 5 % & negative cashflow - Liquidity reserve of at least 6 monthly rents recommended.",adv7:"Refinancing > 60 % of loan - High interest rate risk after fixed period. Consider forward mortgage.",adv8:"Fixed period < 10 years & rate > 3.5 % - Elevated refinancing risk. At least 10-year fixed period recommended.",adv9:"Repayment < 2 % - Very low repayment. Increase to at least 2 % to shorten term.",adv10:"Extra repayment unused - Annual extra repayments would significantly reduce term and total interest.",adv11:"LTV 80-90 % - Better rate conditions possible with more equity.",adv12:"Rent > 15 % below reference rent - Stepwise increase possible. Rent cap not yet exhausted.",adv13:"Last increase > 3 years ago - 3-year cap window fully reset. Maximum room for rent increase available.",adv14:"Rent cap reached, reference rent much higher - Full room again only after next 3-year window expires.",adv15:"Tight market & rent near reference rent - Check § 559 BGB modernisation rent increase as alternative.",adv16:"Payback > 20 years - KfW loan (e.g. 261) with interest benefit can significantly shorten payback.",adv17:"Energy class after renovation still below C - Below class C: EU rental ban risk from 2033 (planned EED implementation).",adv18:"Heating replaced without insulation - Heat pump needs insulated building envelope. Efficiency severely limited without facade/roof insulation.",advTitle:"💡 Analysis",datastand:"Data status",garageKauf:"Garage/parking",sonderUml:"Special levy",renovierung:"Renovation costs",renovSofort:"✅ Under 15% threshold — immediately deductible as operating costs (§ 6 para. 1 no. 1a EStG).",renovAktiv:"⚠️ Over 15% threshold — must be capitalised, no immediate deduction. Depreciated via AfA.",renovEigennutz:"Owner-occupied: not tax-deductible.",renovGrenzHinw:"15% of building purchase price",stCheck:"Self-Sustaining Check",stZielKP:"Target price (CF\u00a0=\u00a00)",stSelbstAb:"Self-sustaining from",stOhneStAkt:"Without tax benefit\u00b7at current price",stSofort:"Immediately",stAusserhalb:"Outside",stCFPositiv:"CF positive from day\u00a01",stMietSteig:"Rent increase",stVerhandlZiel:"Negotiation target",stIstKPPuffer:"below actual price\u00a0—\u00a0buffer",stMitStVor:"With tax benefit",stUnterZiel:"below target",stHero1:"The property sustains itself\u00a0— cashflow is positive without any tax benefit. Perfect starting point.",stHero2:"With tax benefit already self-sustaining ({cf}/mo.). Without tax: {diff}/mo. gap\u00a0— small buffer risk.",stHero3:"Negotiate the price down by {diff} ({pct}) to {kp}\u00a0— then the property sustains itself without any monthly top-up.",stHero4a:"Self-sustaining only from year {j} onwards (rent increases). Immediately self-sustaining at: {kp}.",stHero4b:"Not self-sustaining at current price. Target price: {kp} (−{diff}).",stVerdictJa:"Yes",stVerdictNein:"No",expandAll:"Expand all",collapseAll:"Collapse all",stWhyJa:"Even without tax benefits there's a surplus of +{cf}/mo. Perfect starting point.",stWhyNein:"Without tax benefits you pay {cf}/mo. out of your own pocket.",stTaxPos:"With tax benefits the cash flow would be positive (+{cf}/mo.) — but that does NOT make the property self-sustaining. The benefit isn't real cash flow and requires sufficient tax liability.",stTaxNeg:"Even with tax benefits you're still {cf}/mo. short of self-sustaining.",stTaxBonus:"With tax benefits the surplus rises to +{cf}/mo.",close:"Close",saveBtnLabel:"Save",saveModalTitle:"Save property",savePlaceholder:"e.g. Apartment Berlin · 2nd floor",saveConfirm:"Save",emptyTitle:"No saved properties yet",emptyHint:"Calculate a property and tap “Save” to store it here.",countSingular:"property saved",countPlural:"properties saved",loadBtn:"↩ Load",deleteTitle:"Delete property?",deleteHint:"This calculation will be permanently deleted.",cancelBtn:"Cancel",deleteBtn:"Delete",defaultObjName:"Property",sanIsfpLabel:"iSFP — Individual Energy Renovation Roadmap",sanIsfpSub:"+5% BAFA bonus on all BEG measures (federal subsidy, § 89 GEG)",sanIsfpActive:"iSFP active — +5% BAFA bonus included in all BEG measures",sanIsfpTip:"iSFP active — +5% BAFA bonus already included. Consulting costs 50% subsidised.",sanLandesbankHint:"BAFA subsidy rates apply uniformly nationwide",sanLandDis:"Estimated value, please verify with your Landesbank",rfTitle:"What this means",rfBelT:"High leverage",rfBelD:"Less than 20% equity. Banks often charge higher rates — default risk rises.",rfNrT:"Weak net yield",rfNrD:"Below 3% after all costs. Little buffer for vacancies or unexpected repairs.",rfCfT:"Negative cash flow",rfCfD:"You top up monthly. Plan for at least 6 months of rent as a liquidity reserve.",rfZT:"High interest rate",rfZD:"Above 4% nominal rate — increases the monthly payment and noticeably reduces cash flow.",rfTT:"Low repayment",rfTD:"Under 2% p.a. Debt-free only after a very long time — loan term and rate risk increase.",rfLzT:"Very long loan term",rfLzD:"Over 35 years remaining. High refinancing risk when the fixed-rate period ends.",rfPT:"High price per m²",rfPD:"Above €5,000/m² raises the price relative to rent — yield and payback period suffer.",rfEkT:"Low equity",rfEkD:"Under 20% of the purchase price. More equity means better rates and a bigger safety cushion.",rfLsT:"High vacancy",rfLsD:"Above 5–8% vacancy rate significantly reduces rental income. Check location and reserves.",badgeGut:"Good",badgeOkay:"Okay",badgeKrit:"Critical",badgeNeutral:"Info",jahrN:"Year {n}",monAbb:"/mo.",monLabel:"mo.",steuerErsTip:"Depreciation: {a}/yr | Deductible interest: {b}/yr",nkAmortOk:"✓ NK recovered",nkAmortMid:"~ NK in progress",nkAmortNo:"⚠ NK not recovered",nkAmortTip:"Purchase costs ({nbk}) recovered via tax savings in {beJ} years",
sec1Q:"What return am I getting?",sec1Hint:"Yield",
sec1GreenBR:"Solid gross yield — good starting point.",sec1YellowBR:"Acceptable yield — keep a close eye on costs.",sec1RedBR:"Below-market yield — critically review purchase price or rent.",
sec2Q:"What does my monthly cashflow look like?",sec2Hint:"Cash flow",
sec2GreenCF:"The property pays for itself — no monthly top-up needed.",sec2YellowCF:"Barely break-even — even 1–2 months vacancy can become a problem.",sec2RedCF:"You top up monthly — plan for at least 6 months of rent as a reserve.",
sec3Q:"What do I pay the bank?",sec3Hint:"Financing",
sec3GreenBel:"Conservative financing — best rates.",sec3YellowBel:"Typical financing — rate surcharge possible.",sec3RedBel:"High leverage — creditworthiness and income especially relevant.",
sec4Q:"Purchase costs & tax benefits",sec4Hint:"State & Taxes",
sec4LowTax:"Low tax rate — depreciation effect is smaller. Balance without tax benefit is your realistic figure.",sec4MidTax:"Mid-range tax rate — depreciation and interest deduction help noticeably.",sec4HighTax:"High marginal rate — maximum tax benefit through depreciation and interest deduction.",
sec5Q:"How does the property develop?",sec5Hint:"Over time",sec5Sub:"Cash flow, remaining debt and annual rent over the analysis period.",
sec6Q:"What is left in the end?",sec6Hint:"Overall result",
sec6GreenG:"Positive overall result — the investment paid off.",sec6RedG:"Negative overall result — reconsider purchase price, rent or financing.",
sec6SaldoOhneHint:"For low earners or without tax benefit.",sec6SaldoMitHint:"For high earners who can fully deduct depreciation and interest.",sec7Q:"What remains after selling in {j} years?",sec7Hint:"Exit scenario",sec7Sub:"Shows what is left if the property is sold after {j} years. Adjust the analysis period in the input field above.",selfQ:"Does the property pay for itself?",selfHint:"Self-sustaining check",secOpen:"How is this calculated?",secClose:"Show less",ekRTitle:"Equity Return p.a.",ekRMit:"Equity Return with Tax",ekROhne:"Equity Return without Tax",ekRHorizon:"{j}-yr investment horizon",ekRConserv:"Conservative view",ekRTip1:"Your equity ({ek}) grows at {p} p.a. — comparison: ETF historically ~7%",ekRTip2:"Without tax benefit — for low earners or base scenario"},
tr:{haupt:"Getiri",kredit:"Kredi",miete:"Kira",sanier:"Tadilat",steuer6:"§6 Hile",vfe:"Erken Öd.",merkliste:"Kaydedilenler",bundesland:"Eyalet",kaufpreis:"Satın Alma Fiyatı",flaeche:"Yaşam Alanı",preisQm:"Fiyat/m²",kaltmiete:"Soğuk Kira (aylık)",nichtUml:"Aktarılamayan",leerstand:"Boşluk",eigenkapital:"Öz Sermaye",zinssatz:"Faiz Oranı",tilgung:"Anapara Ödemesi",zinsbindung:"Sabit Faiz Süresi",grEst:"Tapu Vergisi",notar:"Noter",makler:"Komisyon",steuersatz:"Vergi Oranı",afa:"Amortisman",grundAnteil:"Arsa Payı",gebAnteil:"Bina Payı",wertP:"Değer Artışı",jahre:"Analiz Süresi",sonder:"Garaj/Otopark",plz:"Posta Kodu",ort:"Şehir",eingabe:"Giriş",ergebnis:"Sonuç",bruttoR:"Brüt Getiri",nettoR:"Net Getiri",rate:"Taksit/Ay",cashflow:"Nakit Akışı/Ay",laufzeit:"Kredi Vadesi",nbk:"Satın Alma Giderleri",nbkSub:"Devir vergisi, noter, tapu",darlehen:"Kredi",steuerErs:"Vergi Tasarrufu",risk:"Risk Seviyesi",niedrig:"Düşük",mittel:"Orta",hoch:"Yüksek",check:"Hızlı Kontrol",jPl:"yıl sonra",pJ:"Ort./Yıl",iwert:"Gayrimenkul Değeri",gut:"İyi",ok:"Kabul Edilebilir",krit:"Kritik",nK:"giderler sonrası",pos:"Pozitif",zus:"Destek gerekli",oL:"Nesne & Konum",fin:"Finansman",stNk:"Giderler & Vergi",wZ:"Değer Artışı & Süre",vgl:"Karşılaştırma Kirası",lDat:"Son Artış",lMiet:"O zamanki Kira",mietbeginn:"Kira başlangıcı",kapp:"Kira Tavanı",ang:"Gergin Piyasa",std:"Standart Piyasa",nE:"Sonraki Kira Artışı",mxE:"Maks. Artış",nM:"Maks. Yeni Kira",jM:"Şimdi mümkün",ab:"İtibaren",keE:"Artış yok",mPl:"Kira Artış Planı",dat:"Tarih",akt:"Mevcut",erh:"Artış",sta:"Durum",foe:"Teşvik",amo:"Amortisman",eKl:"Enerji Sınıfı",vor:"Önce",nac:"Sonra",esp:"Tasarruf",co2:"CO₂ Azaltma",tPl:"Ödeme Planı",bel:"Kredi/Değer Oranı",rest:"Kalan Borç",gZin:"Toplam Faiz",gAuf:"Toplam Gider",gas:"Doğalgaz",oel:"Fuel Oil",wp:"Isı Pompası",pel:"Pelet",fw:"Uzaktan Isıtma",koh:"Kömür",str:"Elektrik",alt:"20 yıl üstü",mitt:"10–20 yıl",neu:"10 yıl altı",mR:"Kira Hukuku",sBJ:"İnşaat yılı",sHTyp:"Isıtma tipi",sHAlt:"Isıtma yaşı",sPers:"Kişi",sWfl:"Yaşam alanı",sFenStd:"Standart pencereler",sFenXL:"Ekstra büyük (>3m²)",sFenHST:"Kaldır-kaydır kapılar",sAnbau:"Bitişik durum",sFasFl:"Cephe alanı",sDaFl:"Çatı alanı",sDaForm:"Çatı şekli",sLeist:"Güç",sKap:"Kapasite",sKeFl:"Bodrum alanı",sOgFl:"Kat tavanı",sStrPr:"Elektrik fiyatı",sHkos:"Isıtma maliyeti",sFqAvg:"Ort. teşvik kotası",sJEsp:"Yıllık tasarruf",sCO2R:"CO₂ azaltma",sEnerEsp:"Enerji tasarrufu",sGesK:"Toplam tadilat maliyeti",sNetK:"Net",sAmoR:"Geri ödeme hesabı",sAmoSub:"Net maliyet ÷ yıllık tasarruf",sMassDet:"Önlemler detayda",sGesamt:"Toplam",anbFrei:"Müstakil",anbDoppel:"İkiz ev",anbMittel:"Sıra evi",dchSattel:"Beşik çatı",dchFlach:"Düz çatı",dchWalm:"Kırma çatı",sGebData:"Bina verileri",sEnergie:"Enerji fiyatları",sStruktur:"Bina yapısı",sMassnahmen:"Önlem seçin",kennzahlen:"📈 Analiz & Temel Göstergeler",cfOhneSt:"CF/Ay. Vergi Avantajı Hariç",cfMitSt:"CF/Ay. Vergi Avantajı Dahil",cfBasis:"Kira − Maliyetler − Taksit",eigennutzHinweis:"Kendiniz mi kullanacaksınız? Bu hesaplayıcı kira yatırımları için optimize edilmiştir.",cfMitSub:"AfA vergi tasarrufu dahil",brGreen:"Sağlam brüt verim",brYellow:"Kabul edilebilir",brRed:"Piyasanın altında",brGreenTip:"Piyasa standardı ≥ %5. Net verim için iyi başlangıç.",brYellowTip:"Yeterli, ancak işletme giderleri net marjı azaltır.",brRedTip:"Fiyat, kira veya yan maliyetleri kontrol edin.",nrGreen:"Maliyetler sonrası cazip",nrYellow:"İşletme maliyetleri karşılandı",nrRed:"Maliyet riski",nrGreenTip:"Tüm işletme maliyetleri dahil. Sağlam getiri.",nrYellowTip:"Maliyetleri karşılar, ancak boşluk için az tampon.",nrRedTip:"Mülk işletme maliyetlerini zar zor karşılıyor.",cfOGreen:"Mülk kendi kendine yeterli",cfOYellow:"Neredeyse dengeli",cfORed:"Aylık ek katkı gerekli",cfOGreenTip:"Vergi avantajı olmaksızın pozitif. En iyi başlangıç.",cfOYellowTip:"Neredeyse dengeli. 1-2 aylık boşluk sorun yaratabilir.",cfORedTip:"Aylık kişisel katkı gerekli. En az 6 aylık likit rezerv planlayın.",cfMGreen:"Vergi avantajıyla pozitif",cfMYellow:"Dar pozitif",cfMRed:"Vergiyle de negatif",cfMGreenTip:"İyi — ama yeterli gelir vergisi ödenmesi şartıyla.",cfMYellowTip:"Yalnızca tam vergi avantajıyla dar pozitif.",cfMRedTip:"AfA ve faiz indirimi sonrası bile negatif.",belGreen:"Muhafazakar finansman",belYellow:"Piyasa standardı",belRed:"Yüksek dış finansman",belGreenTip:"En iyi faiz koşulları. Değer düşüşüne karşı tampon.",belYellowTip:"Yatırımcılar için tipik. Faiz zammı mümkün.",belRedTip:"Kredi notu ve gelir özellikle önemli.",lzGreen:"Kısa vade",lzYellow:"Orta vade",lzRed:"Çok uzun vade",lzInf:"Hiç ödenmedi",lzGreenTip:"Hızlı borçsuz. Sermaye birikimi için iyi.",lzYellowTip:"Yönetilebilir. Sabit oran sonrası koşulları izleyin.",lzRedTip:"Uzun bağlılık faiz riskini artırır. Geri ödemeyi artırın.",lzInfTip:"Geri ödemeyi artırın — mevcut oranda kredi hiç ödenmez.",vermietQ:"Kiralık mı?",vermietJa:"Evet, kirada",vermietNein:"Hayır / Kendi kullanım",immLeerQ:"Şu an kirada mı?",immLeerJa:"Evet, şu an kirada",immLeerNein:"Hayır, boş",chartTitle1:"Kalan Borç, Nakit Akışı & Yıllık Kira",chartRestschuld:"Kalan borç",chartKumCF:"Kümülatif nakit akışı",chartJahresmiete:"Yıllık kira",chartZinsbind:"Sabit faiz sonu",chartTitle2:"Aylık Nakit Akışı Seyri",chartCFOhne:"Vergi avantajı hariç",chartCFMit:"Vergi avantajı dahil",chartDiff:"Fark = vergi avantajı",chartHoverKumCF:"Kümülatif nakit",chartHoverJahresmiete:"Yıllık kira",chartHoverCFOhne:"Vergi hariç nakit",chartHoverCFMit:"Vergi dahil nakit",chartHoverSteuervorteil:"Vergi avantajı",chartDisclamer:"⚠️ Vergi avantajı yeterli gelir vergisi gerektirir. Vergi danışmanına başvurun.",tblTitle:"Yıllık gelişim",tblJahresmiete:"Yıllık kira",tblCFOhne:"Vergi hariç",tblCFMit:"Vergi dahil",tblSumme:"TOPLAM",detTitle:"Satış senaryosu:",detJahren:"yıl sonra",detSub:"Analiz süresi sonunda mülk satılsaydı ne kalırdı?",detErtraege:"GELİRLER",detErloes:"Satış geliri",detCumCFOhne:"Kümülatif nakit (vergi hariç)",detCumSteuer:"Kümülatif vergi tasarrufu",detSteuerHinweis:"Yeterli gelir vergisi ödenmesi gerekir",detAufwand:"GİDERLER",detSumme:"Toplam",detSaldoOhne:"Toplam bakiye (vergi hariç)",detSaldoMit:"Toplam bakiye (vergi dahil)",detEKR:"Özkaynak getirisi",detSteuerVoraus:"Yeterli gelir vergisi gerektirir",detInfo:"Vergi avantajı = faiz indirimi, amortisman ve aktarılamayan maliyetler × vergi oranı.",saldoOhne:"Vergi hariç bakiye",saldoMit:"Vergi dahil bakiye",sanTip1:"Sıra: Önce bina kabuğu (pencere, çatı, cephe), sonra ısıtma.",sanTip2:"Enerji danışmanı: iSFP bonusu +%5. Danışmanlık %50 sübvanse.",sanTip3:"BAFA/KfW başvurusu sözleşmeden ÖNCE yapılmalı!",sanTip4:"GEG § 72: >30 yıllık ısıtmalar değiştirilmeli. § 71: %65 yenilenebilir.",sanTip5:"§ 35c EStG: 3 yılda %20 düşülebilir (maks. 40.000€).",sanTip6:"Hidrolik dengeleme: KfW zorunluluğu, ısıtmayı %5–15 düşürür.",sanTip7:"PV + Batarya: Öz tüketim ~%70. EV ve ısı pompası için ideal.",sBerat:"Danışmanlık",ertraege:"GELİRLER",aufwend:"GİDERLER",gSaldoOhne:"VERGİ AVANTAJI HARİÇ TOPLAM BAKİYE",gSaldoMit:"VERGİ AVANTAJI DAHİL TOPLAM BAKİYE",pdfExport:"PDF olarak dışa aktar",rechtlGrundlagen:"Yasal Dayanak",sondTilgLabel:"Ek Ödeme",vereinbSatz:"Sözleşmeli oran",entspricht:"Karşılık gelir",stdSond:"Standart: kredi tutarının %5'i (çoğu bankada serbestçe kararlaştırılabilir)",neueLaufzeit:"Yeni vade",zinsenGespart:"Faiz tasarrufu",statt:"yerine",effekt:"Etki",steuerNeutral:"Yıldan itibaren vergi nötr",steuerNeutralSub:"(vergi tasarrufu yan maliyetleri karşılar)",positivSaldo:"Pozitif toplam bakiye",nachJahrenVerk:"{n} yıl sonra satışta",zins:"Faiz",tilgK:"Geri öd.",belCond90:"⚠️ >%90 - faiz zammı",belCond80:"🟡 %80-90 - normal koşullar",belCondOk:"✅ <%80 - en iyi koşullar",markt:"Piyasa",riskShow:"▼ Etki faktörlerini göster",riskHide:"▲ Faktörleri gizle",rechtsHinweis:"Bu bilgiler hukuki tavsiye değildir. Somut durumlar için vergi danışmanı veya avukata başvurun.",analyseZr:"Analiz dönemi",vercomp:"Referans kira tavanına ulaşıldı",sanMassN1:"Pencere değişimi",sanMassN2:"Cephe yalıtımı",sanMassN3:"Isıtma yenileme",sanMassN4:"Çatı yenileme",sanMassN5:"Giriş kapısı",sanMassN6:"Fotovoltaik",sanMassN7:"Bodrum tavan yalıtımı",sanMassN8:"Üst kat tavanı",sanMassN9:"Batarya deposu",sanMassN10:"Havalandırma",sHkJahr:"Isıtma maliyeti/yıl",sSkJahr:"Elektrik maliyeti/yıl",sPreisstieg:"Enerji fiyat artışı",sAutoCalc:"Otomatik",sPS0:"%0/yıl (sabit)",sPS1:"+%1/yıl",sPS2:"+%2/yıl (tahmin)",sPS3:"+%3/yıl",sPS5:"+%5/yıl (muhafazakâr)",sCapHin:"BAFA/KfW sınırı uygulandı",tierS:"Standart",tierG:"Gelişmiş",tierM:"Premium",sTierFenS:"PVC çerçeve",sTierFenG:"Alu-kompozit",sTierFenM:"Ahşap-alu+uygulama",sTierFasS:"10cm yalıtım",sTierFasG:"16cm premium",sTierFasM:"20cm eko-kenevir",sTierHzS:"Isıtma+pompalar",sTierHzG:"+radyatörler+kontrol",sTierHzM:"+yerden ısıtma+uygulama",sTierDaS:"Yeniden çatı+yalıtım",sTierDaG:"+alt tabaka+sac",sTierDaM:"Yeni çatı taşıyıcısı",sTierTuS:"Standart güvenlik",sTierTuG:"Yüksek kalite",sTierTuM:"Premium+parmak izi",sTierPvS:"Çatı üstü, besleme",sTierPvG:"Çatı içi+enerji yönt.",sTierPvM:"Güneş çatı kiremidi",sTierLuS:"Temel havalandırma",sTierLuG:"Daha iyi filtreler",sTierLuM:"Premium+kontrol",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + ısıtma bonusu",sSrcPv:"KfW 270 (düşük faiz, EEG 2023)",sSrcBat:"Eyalet desteği (bölgesel)",sondTilgSub:"Kredi vadesini kısaltmak için yıllık ek ödeme (§ 500 BGB)",adv1:"Brüt-net fark > %2 - Maliyet yapısını inceleyin.",adv2:"Çarpan > 30 - Satın alma fiyatı 30 yıllık net kiradan fazla.",adv3:"Net verim finansman faizinin altında - Negatif kaldıraç etkisi.",adv4:"En yüksek vergi oranı > %42 - Amortisman ve faiz indirimi maksimum vergi etkisi yaratır.",adv5:"Arsa payı > %40 - Yüksek arsa payı amortismana tabi tabanı azaltır.",adv6:"Boşluk > %5 & negatif nakit akışı - En az 6 aylık kira tutarında likit rezerv önerilir.",adv7:"Yeniden finansman > Kredinin %60 - Sabit faiz döneminden sonra yüksek faiz riski. Forward kredi inceleyin.",adv8:"Sabit dönem < 10 yıl & faiz > %3,5 - Yeniden finansman riski yüksek. En az 10 yıl sabit dönem önerilir.",adv9:"Geri ödeme < %2 - Çok düşük geri ödeme. Vadeyi kısaltmak için en az %2 ye çıkarın.",adv10:"Ek ödeme kullanılmamış - Yıllık ek ödemeler vadeyi ve toplam faizi önemli ölçüde azaltır.",adv11:"LTV %80-90 - Daha fazla öz sermayeyle daha iyi faiz koşulları mümkün.",adv12:"Kira referans kirasının > %15 altında - Kademeli artış mümkün. Kira tavanı henüz dolmamış.",adv13:"Son artıştan > 3 yıl geçti - 3 yıllık pencere tamamen sıfırlandı. Maksimum artış alanı mevcut.",adv14:"Kira tavanına ulaşıldı, referans kira çok daha yüksek - Bir sonraki 3 yıllık pencere dolana kadar tam alan yok.",adv15:"Gergin piyasa & kira referansa yakın - § 559 BGB modernizasyon kira artışını alternatif olarak inceleyin.",adv16:"Geri ödeme > 20 yıl - KfW kredisi faiz avantajıyla geri ödeme süresini kısaltabilir.",adv17:"Sanasyon sonrası enerji sınıfı hala C nin altında - 2033 ten itibaren AB kiralama yasağı riski.",adv18:"Isıtma değişimi yalıtım olmadan - Isı pompası yalıtımlı bina kabuğu gerektirir.",advTitle:"💡 Analiz",datastand:"Veri tarihi",garageKauf:"Garaj/Otopark",sonderUml:"Özel aidat",renovierung:"Tadilat maliyetleri",renovSofort:"✅ %15 sınırın altında — gider olarak anında düşülebilir.",renovAktiv:"⚠️ %15 sınırın üzerinde — aktifleştirme zorunlu, anında indirim yok.",renovEigennutz:"Kendi kullanımda vergisel indirim yok.",renovGrenzHinw:"Bina KF %15 sınırı",stCheck:"Öz-Yeterlik Kontrolü",stZielKP:"Hedef fiyat (CF\u00a0=\u00a00)",stSelbstAb:"Öz-yeterli itibaren",stOhneStAkt:"Vergisiz\u00b7mevcut fiyata göre",stSofort:"Hemen",stAusserhalb:"Dışında",stCFPositiv:"Gün\u00a01'den itibaren CF pozitif",stMietSteig:"Kira artışı",stVerhandlZiel:"Pazarlık hedefi",stIstKPPuffer:"mevcut fiyatın altında\u00a0—\u00a0tampon",stMitStVor:"Vergi avantajıyla",stUnterZiel:"hedefin altında",stHero1:"Mülk kendi kendini finanse ediyor\u00a0— herhangi bir vergi avantajı olmadan nakit akışı pozitif. Mükemmel başlangıç.",stHero2:"Vergi avantajıyla öz-yeterli ({cf}/ay). Vergisiz {diff}/ay açık\u00a0— küçük tampon riski.",stHero3:"Fiyatı {diff} ({pct}) indirebilirsen {kp}'a düşer\u00a0— mülk aylık katkı olmadan kendini finanse eder.",stHero4a:"Mevcut fiyatta ancak {j}. yıldan itibaren öz-yeterli (kira artışları). Hemen öz-yeterli: {kp}.",stHero4b:"Mevcut fiyatta mülk kendini finanse etmiyor. Hedef fiyat: {kp} (−{diff}).",stVerdictJa:"Evet",stVerdictNein:"Hayır",expandAll:"Tümünü aç",collapseAll:"Tümünü kapat",stWhyJa:"Vergi avantajı olmadan bile +{cf}/ay artı kalıyor. Mükemmel başlangıç.",stWhyNein:"Vergi avantajı olmadan her ay cebinizden {cf} ödüyorsunuz.",stTaxPos:"Vergi avantajıyla nakit akışı pozitif olurdu (+{cf}/ay) — ancak bu mülkü kendini finanse eder hâle GETİRMEZ. Avantaj gerçek nakit akışı değildir ve yeterli vergi yükü gerektirir.",stTaxNeg:"Vergi avantajıyla bile kendini finanse etmek için {cf}/ay eksik.",stTaxBonus:"Vergi avantajıyla fazla +{cf}/ay'a çıkıyor.",close:"Kapat",saveBtnLabel:"Kaydet",saveModalTitle:"Nesneyi kaydet",savePlaceholder:"Örn. Daire Berlin · 2. kat",saveConfirm:"Kaydet",emptyTitle:"Henüz kaydedilmiş nesne yok",emptyHint:"Bir nesne hesaplayın ve burada saklamak için „Kaydet“ e dokunun.",countSingular:"nesne kaydedildi",countPlural:"nesne kaydedildi",loadBtn:"↩ Yükle",deleteTitle:"Nesne silinsin mi?",deleteHint:"Bu hesaplama kalıcı olarak silinecek.",cancelBtn:"İptal",deleteBtn:"Sil",defaultObjName:"Nesne",sanIsfpLabel:"iSFP — Bireysel Enerji Yenileme Planı",sanIsfpSub:"+%5 BAFA bonusu tüm BEG önlemlerine (federal teşvik, § 89 GEG)",sanIsfpActive:"iSFP aktif — +%5 BAFA bonusu tüm BEG önlemlerine dahil edildi",sanIsfpTip:"iSFP aktif — +%5 BAFA bonusu zaten hesaba katıldı. Danışmanlık %50 sübvanse edildi.",sanLandesbankHint:"BAFA teşvik oranları ülke genelinde tek tip uygulanır",sanLandDis:"Tahmini değer, lütfen Landesbank ile doğrulayın",rfTitle:"Bu ne anlama geliyor",rfBelT:"Yüksek borçlanma oranı",rfBelD:"Özsermaye %20'nin altında. Bankalar genellikle faiz artırımı uygular — temerrüt riski yükselir.",rfNrT:"Düşük net getiri",rfNrD:"Tüm maliyetler sonrası %3'ün altında. Boş dönemler veya beklenmedik onarımlar için yeterli tampon yok.",rfCfT:"Negatif nakit akışı",rfCfD:"Her ay cepten para harcıyorsun. En az 6 aylık kira tutarında likit rezerv planlamalısın.",rfZT:"Yüksek faiz oranı",rfZD:"%4'ün üzerinde nominal faiz aylık taksiti artırır ve nakit akışını belirgin şekilde azaltır.",rfTT:"Düşük anapara ödemesi",rfTD:"Yıllık %2'nin altında. Borcun bitmesi çok uzun sürer — vade ve faiz riski artar.",rfLzT:"Çok uzun vade",rfLzD:"35 yılın üzerinde kalan vade. Faiz sabitinin bitmesinden sonra yeniden finansman riski yüksek.",rfPT:"Yüksek m² fiyatı",rfPD:"5.000 €/m² üzeri, fiyatı kira gelirine oranla yükseltir — getiri ve amortisman süresi olumsuz etkilenir.",rfEkT:"Düşük özsermaye",rfEkD:"Satın alma fiyatının %20'sinin altında. Daha fazla özsermaye daha iyi faiz koşulları sağlar.",rfLsT:"Yüksek boşluk oranı",rfLsD:"%5–8 üzerinde boşluk oranı kira gelirini ciddi şekilde azaltır. Konum ve rezervleri incele.",badgeGut:"İyi",badgeOkay:"Tamam",badgeKrit:"Kritik",badgeNeutral:"Bilgi",jahrN:"Yıl {n}",monAbb:"/ay",monLabel:"ay",steuerErsTip:"Amortisman: {a}/yıl | İndirilebilir faiz: {b}/yıl",nkAmortOk:"✓ NK amorti edildi",nkAmortMid:"~ NK amorti süreci",nkAmortNo:"⚠ NK amorti edilmedi",nkAmortTip:"Satın alma maliyetleri ({nbk}) vergi tasarrufuyla {beJ} yılda geri alındı",
sec1Q:"Ne kadar getiri elde ediyorum?",sec1Hint:"Getiri",
sec1GreenBR:"Sağlam brüt getiri — iyi bir başlangıç noktası.",sec1YellowBR:"Kabul edilebilir getiri — maliyetleri yakından takip et.",sec1RedBR:"Piyasanın altında getiri — satın alma fiyatını veya kira gelirini kritik olarak gözden geçir.",
sec2Q:"Aylık nakit akışım nasıl?",sec2Hint:"Nakit akışı",
sec2GreenCF:"Mülk kendini amorti ediyor — aylık ek ödeme gerekmiyor.",sec2YellowCF:"Neredeyse başabaş — 1–2 aylık boşluk bile sorun yaratabilir.",sec2RedCF:"Her ay cepten ödeme yapıyorsun — en az 6 aylık kira rezervi planla.",
sec3Q:"Bankaya ne ödüyorum?",sec3Hint:"Finansman",
sec3GreenBel:"Muhafazakâr finansman — en iyi koşullar.",sec3YellowBel:"Piyasada yaygın finansman — faiz artışı mümkün.",sec3RedBel:"Yüksek borçlanma — kredi notu ve gelir özellikle önemli.",
sec4Q:"Satın alma giderleri & vergi avantajı",sec4Hint:"Devlet & Vergi",
sec4LowTax:"Vergi oranın düşük — amortisman etkisi daha az. Vergisiz bakiye gerçekçi rakamın.",sec4MidTax:"Orta vergi oranı — amortisman ve faiz indirimi kayda değer yardım sağlıyor.",sec4HighTax:"Yüksek marjinal oran — amortisman ve faiz indirimiyle maksimum vergi avantajı.",
sec5Q:"Mülk nasıl gelişiyor?",sec5Hint:"Zaman içinde",sec5Sub:"Analiz dönemi boyunca nakit akışı, kalan borç ve yıllık kira.",
sec6Q:"Sonunda ne kalıyor?",sec6Hint:"Genel sonuç",
sec6GreenG:"Olumlu genel sonuç — yatırım meyvesini verdi.",sec6RedG:"Olumsuz genel sonuç — satın alma fiyatını, kira gelirini veya finansmanı yeniden değerlendir.",
sec6SaldoOhneHint:"Düşük gelirli veya vergi avantajı olmayanlar için.",sec6SaldoMitHint:"Amortisman ve faizi tam olarak indirebilen yüksek gelirli yatırımcılar için.",sec7Q:"{j} yıl sonra satışta ne kalır?",sec7Hint:"Satış senaryosu",sec7Sub:"Mülkü {j} yıl sonra sattığınızda ne kalacağını gösterir. Analiz süresini yukarıdaki alandan ayarlayın.",selfQ:"Mülk kendini finanse ediyor mu?",selfHint:"Öz finansman kontrolü",s1b1:"Brüt verim: yıllık kira ({a}) ÷ satın alma fiyatı ({b}) = {c}",s1b2:"Net verim: devredilemez maliyetler düşüldükten sonra",s1b2v:" ve boşluk kayıpları",s1b3:"Karşılaştırma: mevduat ~%3, devlet tahvili ~%3,5, hisse ETF ~%7 p.a.",s1b4:"Fiyat-kira oranı: yıllık kiranın {x} katı (20–25 katı sağlam, >30 katı pahalı)",s1b5:"Büyük maliyet farkı — {x} fark: devredilemez maliyetleri kontrol edin!",s1b6:"⚠ Net verim ({a}) kredi faizinin ({b}) altında — borçlanma maliyeti mülk getirisinden fazla",s1t1:"Brüt verim ilk hızlı kontroldür: yıllık kira ÷ toplam alım fiyatı. {rent} kira, {price} fiyat = {bR} brüt. Net verim daha dürüst — tüm devredilemez maliyetleri düşer.",s1t2a:"{nR} verimle mevduat ve tahvilerin üzerindesiniz. Güçlü başlangıç.",s1t2b:"{nR} verim kabul edilebilir — işletme maliyetlerinin artıp artmayacağını takip edin.",s1t2c:"{nR} verim zayıf — mevduattan az üstün, mülk riski olmadan.",s1t3:"Kaldıraçlar: alım fiyatını düşürün · kirayı artırın (§558 BGB) · devredilemez maliyetleri azaltın.",s2b1:"Vergisiz nakit akışı: kira − devredilemez maliyetler − kredi ödemesi = {a}/ay",s2b2:"Vergi avantajıyla nakit akışı: {a}/ay (vergi tasarrufu: aylık {b} ekstra)",s2b3n:"Her ay {a} cebinizden ödüyorsunuz — yıllık {b}",s2b3p:"Mülk kendini taşıyor — vergi avantajı olmadan bile",s2b4:"Vergi avantajıyla nakit akışı pozitife dönüyor — ancak vergi beyannamesiyle geliyor",s2b5:"Toplam anüite: {a}/ay (faiz: {b}, anapara: {c})",s2t1:"Nakit akışı soruyor: her ay katkı mı yapıyorum yoksa mülk gelir mi getiriyor? Formül: kira − devredilemez maliyetler − kredi ödemesi. Pozitif = kendi kendini finanse eder.",s2t2:"Ev sahibi olarak kredi faizi ve amortismanı vergiden düşebilirsiniz. Bu avantaj beyanname ile gelir, aylık değil.",s2t3n:"Negatif nakit akışı mutlaka kötü değil — ama bu rezervlere gerçekten sahip olmalısınız.",s2t3p:"Vergi avantajı olmadan pozitif nakit akışı altın standarttır.",s2t4:"Kaldıraçlar: geri ödeme oranını düşürün · daha fazla özsermaye · daha yüksek kira veya daha az boşluk.",s3b1p:"→ en iyi faizler mümkün",s3b1m:"→ küçük prim normal",s3b1h:"→ belirgin faiz primi",s3b1:"Kredi değer oranı (LTV): {a} — banka alım fiyatının {a} kısmını finanse ediyor{suf}",s3b2:"Aylık ödeme: {a} (faiz: {b} + anapara: {c})",s3b3a:"Kredi süresi: yaklaşık {x} yıl ({p} yıllık geri ödeme ile)",s3b3b:"Kredi süresi: ∞ — bu geri ödeme oranıyla kredi hiçbir zaman kapanmaz!",s3b4:"Kredi tutarı: {a} (özsermaye {b} = {c} özsermaye oranı)",s3b5:"%80 LTV üzerinde bankalar faiz primi talep eder — kredinizi belirgin biçimde pahalılaştırır",s3b6:"⚠ Bu geri ödeme oranıyla sonsuza kadar faiz ödersiniz — en az %2 p.a. ya çıkarın",s3t1:"LTV, bankanın alım fiyatının yüzde kaçını finanse ettiğini gösterir. %60 altı: en iyi faizler; %60–80: standart; %80 üzeri: prim.",s3t2a:"{p} p.a. geri ödemeyle kredi yaklaşık {lz} yılda kapanır.",s3t2b:"Uyarı: bu geri ödeme oranıyla kredi hiçbir zaman tamamen kapanmaz.",s3t3:"Kaldıraçlar: daha fazla özsermaye hem LTV yi hem faizi düşürür. Daha yüksek geri ödeme süreyi kısaltır.",s4b1:"Vergi tasarrufu: {a}/yıl ≈ {b}/ay ({c} vergi oranında)",s4b2:"İki düşülebilir kalem: kredi faizi ({a}/yıl) + amortisman ({b}/yıl)",s4b3:"Amortisman tabanı: %{a} bina payı × {b} p.a. = {c}/yıl",s4b4a:"Alım yan maliyetleri: {a} — {b}. yılda vergi tasarrufuyla geri kazanılır",s4b4b:"Alım yan maliyetleri: {a} — başabaş noktasına henüz ulaşılmadı",s4b5:"İpucu: yapım yılını kontrol edin! 1925 öncesi → %2,5 amortisman. Ekstra: {x}/yıl",s4b6:"Kural: vergi oranı ne kadar yüksekse, fayda o kadar fazla — vergi avantajı yüksek gelirli yatırımcıların aracıdır",s4t1:"Devlet iki mekanizmayla ev sahiplerine dolaylı destek sağlar: (1) kredi faizi gider olarak düşülebilir; (2) bina amortisman ödeneği.",s4t2:"Yalnızca bina payı (%{p}) amortismana tabidir. Oran: 1924 sonrası = %2 p.a., 1925 öncesi = %2,5, 2023 ten itibaren = %3.",s4t3:"Kaldıraçlar: bina payını gerçekçi tutun. Yapım yılına göre amortisman oranını kontrol edin.",s5b1a:"Kalan borç: {a} dan başlayıp geri ödemelerle azalarak {b}. yılda sıfıra ulaşır",s5b1b:"Kalan borç: {a} dan başlar, {b} yıl içinde tamamen kapanmaz",s5b2:"Kümülatif nakit akışı: her yıla kadar toplam para girişi veya çıkışı",s5b3:"Yıllık kira: kira artışlarıyla zaman içinde büyür",s5b4:"Sabit faiz sonu: {x}. yılda sabit faiz bitiyor — sonrasında piyasa faizi geçerli",s5b5p:"Analiz dönemi boyunca kümülatif nakit akışı pozitif — mülk maliyetinden fazla kazandırdı",s5b5n:"Kümülatif nakit akışı negatif — aldığınızdan fazla ödediler",s5t1:"Üç eğri yatırımınızın hikayesini anlatır:\n\nKalan borç (düşen): başlangıçta ödemenin büyük kısmı faiz olarak bankaya gider. Sabit faiz bitişinde ({zb}. yıl) yeniden müzakere edin.\n\nKümülatif nakit akışı: ne zaman pozitife döner? Bu sizin nakit başabaş noktanızdır.\n\nYıllık kira: kira artışlarıyla yavaş yavaş büyür.",s6b1:"Vergi dahil toplam getiri: {j} yılda {a}",s6b2:"Formül: ({vw} satış − {rs} borç) + {cf} küm. nakit akışı − {inv} yatırım",s6b3:"Değer artışı: {j} yılda {a} ({p} p.a.)",s6b4:"Özsermaye getirisi p.a. (vergi dahil): {a} — karşılaştırma: mevduat ~%3, ETF ~%7",s6b5p:"Kredi tamamen ödendi!",s6b5n:"Satışta kalan borç: {a} — satış gelirinden ödenecek",s6b6p:"Kümülatif nakit akışı: {a} — dönem içinde net kâr",s6b6n:"Kümülatif nakit akışı: {a} — net yatırılan sermaye",s6t1:"Toplam sonuç her şeyi toplar: satış geliri ({vw}) − kalan borç ({rs}) + kümülatif nakit akışı ({cf}) − toplam yatırım.",s6t2p:"Sonuç pozitif — yatırım değerliydi.",s6t2n:"Sonuç negatif — mevcut tahminlere göre kazandığınızdan fazla yatırdınız.",s6t3a:"Özsermaye getirisi {a} p.a.: mükemmel — tarihsel ETF getirisini geçiyor.",s6t3b:"Özsermaye getirisi {a} p.a.: sağlam. ETF ~%7, ancak kaldıraçsız.",s6t3c:"Özsermaye getirisi {a} p.a.: kabul edilebilir, ancak finansman riski için ince tampon.",s6t3d:"Özsermaye getirisi {a} p.a.: zayıf. Varsayımlarınızı gözden geçirin.",s7b1:"{j}. yılda tahmini satış değeri: {vw} (değer artışı: {p} p.a.)",s7b2a:"Satışta kalan borç: {a} — satış gelirinden ödenir",s7b2b:"Satışta kalan borç: {a}",s7b3:"Ödeme sonrası net gelir: {a}",s7b4:"Komisyoncu ücreti dahil değil — uygulamada satış fiyatının %3–7 si ekstra",s7b5p:"10 yıllık spekülasyon süresi geçti: sermaye kazancı vergisiz!",s7b5n:"Spekülasyon süresi hâlâ devam ediyor — sermaye kazancı gelir vergisi oranında vergilendirilir",s7t1:"Tablo satış gelirinin tüm bileşenlerini gösterir. {vw}, {p} p.a. değer artışına dayalı bir tahmindir.",s7t2:"Piyasa değerini ({vw}) kalan borçla ({rs}) karşılaştırın: borç daha yüksekse zarar etmeden satamazsınız.",s7t3p:"Vergi: 10 yıldan sonra sermaye kazancı vergisiz (§23 EStG).",s7t3n:"Not: şu anda 10 yıllık spekülasyon dönemindeysiniz. Kazançlar gelir vergisi oranında vergilendirilir.",s7t4:"Satış maliyetlerini unutmayın: komisyoncu (%3–7), noter, tapu sicili — burada dahil değil.",secOpen:"Bu nasıl hesaplanır?",secClose:"Daha az göster",ekRTitle:"Özsermaye Getirisi p.a.",ekRMit:"Vergi Dahil EK Getirisi",ekROhne:"Vergisiz EK Getirisi",ekRHorizon:"{j} Yıl Yatırım Ufku",ekRConserv:"Muhafazakâr görünüm",ekRTip1:"Özsermayeniz ({ek}) yıllık {p} büyüyor — karşılaştırma: ETF tarihi ~%7",ekRTip2:"Vergi avantajı olmadan — düşük gelirli veya temel senaryo"},
zh:{haupt:"收益",kredit:"贷款",miete:"租金",sanier:"翻新",steuer6:"§6技巧",vfe:"提前还款",merkliste:"收藏夹",bundesland:"联邦州",kaufpreis:"购买价格",flaeche:"居住面积",preisQm:"每平米价格",kaltmiete:"冷租金(月)",nichtUml:"不可转嫁费用",leerstand:"空置期",eigenkapital:"自有资金",zinssatz:"利率",tilgung:"还款率",zinsbindung:"固定利率期限",grEst:"房产交易税",notar:"公证费",makler:"中介费",steuersatz:"税率",afa:"折旧率",grundAnteil:"土地份额",gebAnteil:"建筑份额",wertP:"增值率",jahre:"分析期限",sonder:"车库/车位",plz:"邮编",ort:"城市",eingabe:"输入",ergebnis:"结果",bruttoR:"毛收益率",nettoR:"净收益率",rate:"月供",cashflow:"月现金流",laufzeit:"贷款期限",nbk:"购买附加费",nbkSub:"购置税、公证费、土地登记费",darlehen:"贷款额",steuerErs:"节税额",risk:"风险等级",niedrig:"低",mittel:"中",hoch:"高",check:"快速检查",jPl:"年后",pJ:"年均",iwert:"房产价值",gut:"良好",ok:"一般",krit:"需关注",nK:"扣除费用后",pos:"正现金流",zus:"需补贴",oL:"房产与位置",fin:"融资",stNk:"附加费与税务",wZ:"增值与期限",vgl:"参考租金",lDat:"上次调整",lMiet:"当时租金",mietbeginn:"租赁开始",kapp:"租金上限",ang:"紧张市场",std:"标准市场",nE:"下次租金调整",mxE:"最大涨幅",nM:"最高新租金",jM:"现在可调",ab:"从",keE:"无调整",mPl:"租金调整计划",dat:"日期",akt:"当前",erh:"涨幅",sta:"状态",foe:"补贴",amo:"回收期",eKl:"能效等级",vor:"之前",nac:"之后",esp:"节能",co2:"碳减排",tPl:"还款计划",bel:"贷款价值比",rest:"剩余贷款",gZin:"总利息",gAuf:"总支出",gas:"天然气",oel:"燃油",wp:"热泵",pel:"颗粒",fw:"集中供暖",koh:"煤炭",str:"电力",alt:"超过20年",mitt:"10–20年",neu:"10年以下",mR:"租赁法",sBJ:"建筑年份",sHTyp:"供暖类型",sHAlt:"供暖年龄",sPers:"人数",sWfl:"居住面积",sFenStd:"标准窗户",sFenXL:"特大窗户 (>3m²)",sFenHST:"提升滑动门",sAnbau:"附属情况",sFasFl:"外墙面积",sDaFl:"屋顶面积",sDaForm:"屋顶形状",sLeist:"功率",sKap:"容量",sKeFl:"地下室面积",sOgFl:"楼层天花板",sStrPr:"电价",sHkos:"供暖成本",sFqAvg:"平均补贴率",sJEsp:"年节省",sCO2R:"CO₂ 减排",sEnerEsp:"节能",sGesK:"装修总成本",sNetK:"净额",sAmoR:"回本计算",sAmoSub:"净成本 ÷ 年节省",sMassDet:"详细措施",sGesamt:"总计",anbFrei:"独立式",anbDoppel:"双拼",anbMittel:"联排中间",dchSattel:"双坡顶",dchFlach:"平顶",dchWalm:"四坡顶",sGebData:"建筑数据",sEnergie:"能源价格",sStruktur:"建筑结构",sMassnahmen:"选择措施",kennzahlen:"📈 分析与关键指标",cfOhneSt:"月均现金流（不含税收优惠）",cfMitSt:"月均现金流（含税收优惠）",cfBasis:"租金 − 费用 − 还款",eigennutzHinweis:"计划自住？本计算器专为出租投资优化。",cfMitSub:"含折旧税收节省",brGreen:"稳健的毛收益率",brYellow:"可接受",brRed:"低于市场水平",brGreenTip:"市场标准 ≥ 5%。净收益率的良好起点。",brYellowTip:"足够，但运营成本会明显压缩净利润率。",brRedTip:"检查购买价格、租金或附加费用。",nrGreen:"扣除费用后具有吸引力",nrYellow:"运营成本已覆盖",nrRed:"成本风险",nrGreenTip:"包含所有运营成本。稳健回报。",nrYellowTip:"覆盖成本，但空置或维修缓冲不足。",nrRedTip:"房产几乎无法覆盖运营成本。",cfOGreen:"房产自给自足",cfOYellow:"勉强平衡",cfORed:"需要月度补贴",cfOGreenTip:"无任何税收优惠仍为正值。最佳起点。",cfOYellowTip:"几乎平衡。1-2个月空置即可能成为问题。",cfORedTip:"需要个人月度补贴。计划至少6个月的流动储备。",cfMGreen:"含税收优惠后为正",cfMYellow:"勉强为正",cfMRed:"含税也为负",cfMGreenTip:"好——但前提是缴纳足够的所得税。",cfMYellowTip:"仅在全额税收优惠下勉强为正。",cfMRedTip:"即使AfA和利息扣除后仍为负。",belGreen:"保守融资",belYellow:"市场标准",belRed:"高杠杆",belGreenTip:"最佳利率。高股权比例提供价值下跌缓冲。",belYellowTip:"投资者典型水平。可能有利率加成。",belRedTip:"信用评级和收入尤为重要。",lzGreen:"短期",lzYellow:"中期",lzRed:"超长期",lzInf:"永不还清",lzGreenTip:"快速还清债务。有利于资本积累。",lzYellowTip:"可管理。关注再融资条件。",lzRedTip:"长期承诺显著增加利率变动风险。",lzInfTip:"增加还款额——按当前利率贷款永远无法还清。",vermietQ:"出租房产？",vermietJa:"是，已出租",vermietNein:"否 / 自用",immLeerQ:"目前出租中？",immLeerJa:"是，目前出租",immLeerNein:"否，目前空置",chartTitle1:"剩余债务、现金流与年租金",chartRestschuld:"剩余债务",chartKumCF:"累计现金流",chartJahresmiete:"年租金",chartZinsbind:"固定利率结束",chartTitle2:"月度现金流走势",chartCFOhne:"不含税收优惠",chartCFMit:"含税收优惠",chartDiff:"差额 = 税收优惠",chartHoverKumCF:"累计现金流",chartHoverJahresmiete:"年租金",chartHoverCFOhne:"不含税现金流",chartHoverCFMit:"含税现金流",chartHoverSteuervorteil:"税收优惠",chartDisclamer:"⚠️ 税收优惠需缴纳足够所得税。请咨询税务顾问。",tblTitle:"年度发展",tblJahresmiete:"年租金",tblCFOhne:"不含税CF",tblCFMit:"含税CF",tblSumme:"合计",detTitle:"出售方案（",detJahren:"年后）",detSub:"如果在分析期结束后出售房产，会剩余多少？",detErtraege:"收入",detErloes:"出售收益",detCumCFOhne:"累计现金流（不含税）",detCumSteuer:"累计税收节省",detSteuerHinweis:"需缴纳足够所得税",detAufwand:"支出",detSumme:"合计",detSaldoOhne:"总余额（不含税）",detSaldoMit:"总余额（含税）",detEKR:"权益回报",detSteuerVoraus:"需缴纳足够所得税",detInfo:"税收优惠 = 利息扣除、折旧和不可转嫁费用 × 税率。",saldoOhne:"不含税余额",saldoMit:"含税余额",sanTip1:"顺序：先围护结构（窗、屋顶、外墙），再供暖。",sanTip2:"聘请能源顾问：iSFP奖励+5%补贴，咨询本身补贴50%。",sanTip3:"BAFA/KfW申请必须在签合同前提交！",sanTip4:"GEG § 72：>30年供暖必须更换。§ 71：65%可再生能源。",sanTip5:"§ 35c EStG：3年内可抵扣20%费用（最多4万欧元）。",sanTip6:"水力平衡：KfW必需，降低供暖5–15%。",sanTip7:"PV+电池：自用率~70%，适合EV和热泵。",sBerat:"咨询",ertraege:"收入",aufwend:"支出",gSaldoOhne:"不含税收优惠的总余额",gSaldoMit:"含税收优惠的总余额",pdfExport:"导出为 PDF",rechtlGrundlagen:"法律依据",sondTilgLabel:"额外还款",vereinbSatz:"约定比率",entspricht:"相当于",stdSond:"标准：贷款额的5%（大多数银行可自由约定）",neueLaufzeit:"新期限",zinsenGespart:"节省利息",statt:"而非",effekt:"效果",steuerNeutral:"从第",steuerNeutralSub:"年起税收中性（税收节省覆盖附加费用）",positivSaldo:"正总余额",nachJahrenVerk:"{n}年后出售",zins:"利息",tilgK:"还款",belCond90:"⚠️ >90% - 利率附加",belCond80:"🟡 80-90% - 正常条件",belCondOk:"✅ <80% - 最佳条件",markt:"市场",riskShow:"▼ 显示影响因素",riskHide:"▲ 隐藏因素",rechtsHinweis:"此信息不构成法律建议。具体情况请咨询税务顾问或律师。",analyseZr:"分析期限",vercomp:"已达参考租金上限",sanMassN1:"换窗",sanMassN2:"外墙隔热",sanMassN3:"供暖更新",sanMassN4:"屋顶更新",sanMassN5:"入口门",sanMassN6:"光伏",sanMassN7:"地下室天花板隔热",sanMassN8:"顶层楼板",sanMassN9:"电池储能",sanMassN10:"通风",sHkJahr:"供暖费/年",sSkJahr:"电费/年",sPreisstieg:"能源价格涨幅",sAutoCalc:"自动",sPS0:"0%/年（固定）",sPS1:"+1%/年",sPS2:"+2%/年（预测）",sPS3:"+3%/年",sPS5:"+5%/年（保守）",sCapHin:"已应用BAFA/KfW上限",tierS:"标准",tierG:"高档",tierM:"高级",sTierFenS:"PVC框架",sTierFenG:"铝复合",sTierFenM:"木铝+APP",sTierFasS:"10cm保温",sTierFasG:"16cm高档",sTierFasM:"20cm生态麻",sTierHzS:"供暖+泵",sTierHzG:"+散热器+控制",sTierHzM:"+地暖+APP",sTierDaS:"重新铺瓦+保温",sTierDaG:"+防水层+钣金",sTierDaM:"新屋架",sTierTuS:"标准安全",sTierTuG:"高品质",sTierTuM:"高级+指纹",sTierPvS:"屋顶安装，并网",sTierPvG:"屋顶集成+能源管理",sTierPvM:"太阳能瓦",sTierLuS:"基础通风",sTierLuG:"更好过滤",sTierLuM:"高级+控制",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + 供暖更换奖励",sSrcPv:"KfW 270 (低息, EEG 2023)",sSrcBat:"州级补贴（地区性）",sondTilgSub:"缩短贷款期限的年度额外还款 (§ 500 BGB)",adv1:"毛净差 > 2% - 审查成本结构：不可转嫁费用或空置率正显著压低净收益率。",adv2:"乘数 > 30 - 购买价格超过30年净租金。仅靠租金收入回本需要很长时间。",adv3:"净收益率低于融资利率 - 负杠杆效应：债务成本超过其带来的收益。",adv4:"最高税率 > 42% - 折旧和利息抵扣具有最大税务效应。建议与税务顾问优化税务结构。",adv5:"土地份额 > 40% - 高土地份额降低可折旧基数。需要进行购买价格分配。",adv6:"空置率 > 5% 且现金流为负 - 建议保留至少6个月租金的流动储备。",adv7:"再融资 > 贷款的60% - 固定期结束后利率风险高。考虑远期抵押贷款。",adv8:"固定期 < 10年且利率 > 3.5% - 再融资风险较高。建议至少10年固定期。",adv9:"还款率 < 2% - 还款率极低。建议提高至至少2%以缩短贷款期限。",adv10:"未使用额外还款 - 年度额外还款将大幅减少期限和总利息。",adv11:"贷款价值比80-90% - 增加更多自有资金可获得更优惠的利率条件。",adv12:"租金比参考租金低 > 15% - 可逐步调整。租金上限尚未用尽。",adv13:"上次调整 > 3年前 - 3年窗口期已完全重置。可获得最大调整空间。",adv14:"已达租金上限，参考租金远高于当前 - 需等待下一个3年窗口期结束后才能再次获得完整空间。",adv15:"紧张市场且租金接近参考租金 - 可考虑§ 559 BGB现代化租金上涨作为替代方案。",adv16:"回本期 > 20年 - KfW贷款的利率优势可显著缩短回本期。",adv17:"装修后能效等级仍低于C级 - 2033年起面临欧盟出租禁令风险。",adv18:"更换供暖但未保温 - 热泵需要隔热的建筑围护结构。没有外墙/屋顶保温，效率会大幅降低。",advTitle:"💡 分析",datastand:"数据截至",garageKauf:"车库/车位",sonderUml:"特别摊款",renovierung:"装修费用",renovSofort:"✅ 低于15%阈值 — 可立即作为费用扣除。",renovAktiv:"⚠️ 超过15%阈值 — 必须资本化，不可立即扣除。",renovEigennutz:"自用房产：不可税前扣除。",renovGrenzHinw:"建筑购价15%上限",stCheck:"自持测试",stZielKP:"目标房价 (CF\u00a0=\u00a00)",stSelbstAb:"自持起始",stOhneStAkt:"无税收优惠\u00b7当前价格",stSofort:"立即",stAusserhalb:"超出范围",stCFPositiv:"第\u00a01天起CF为正",stMietSteig:"租金涨价",stVerhandlZiel:"谈判目标",stIstKPPuffer:"低于当前价格\u00a0—\u00a0缓冲",stMitStVor:"含税收优惠",stUnterZiel:"低于目标",stHero1:"该房产可自持\u00a0— 无需任何税收优惠即现金流为正。完美起点。",stHero2:"含税收优惠已可自持（{cf}/月）。不含税还差{diff}/月\u00a0— 小缓冲风险。",stHero3:"将房价砍价{diff}（{pct}）至{kp}\u00a0— 房产无需每月补贴即自持。",stHero4a:"当前价格下直到第{j}年才能自持（租金涨价）。立即自持的目标价：{kp}。",stHero4b:"当前价格无法自持。自持目标房价：{kp}（−{diff}）。",stVerdictJa:"是",stVerdictNein:"否",expandAll:"全部展开",collapseAll:"全部收起",stWhyJa:"即使没有税收优惠，每月仍有 +{cf} 盈余。绝佳起点。",stWhyNein:"没有税收优惠时，你每月需自掏 {cf}。",stTaxPos:"有税收优惠时现金流为正（+{cf}/月）——但这并不意味着房产能自持。该优惠不是真实现金流，且需要足够的应纳税额。",stTaxNeg:"即使有税收优惠，距离自持每月仍差 {cf}。",stTaxBonus:"有税收优惠时盈余升至 +{cf}/月。",close:"关闭",saveBtnLabel:"保存",saveModalTitle:"保存房产",savePlaceholder:"例：柏林公寕2楼",saveConfirm:"保存",emptyTitle:"暂无已保存的房产",emptyHint:"计算一个房产，然后点击“保存”将其存储在此处。",countSingular:"个房产已保存",countPlural:"个房产已保存",loadBtn:"↩ 加载",deleteTitle:"删除房产？",deleteHint:"此计算将被永久删除。",cancelBtn:"取消",deleteBtn:"删除",defaultObjName:"房产",sanIsfpLabel:"iSFP — 个人能源改造路线图",sanIsfpSub:"+5% BAFA补贴适用于所有BEG措施（联邦补贴，§ 89 GEG）",sanIsfpActive:"iSFP已激活 — 所有BEG措施已含+5% BAFA补贴",sanIsfpTip:"iSFP已激活 — +5% BAFA补贴已计入。咨询费用50%受补贴。",sanLandesbankHint:"BAFA补贴率全国统一适用",sanLandDis:"估算值，请向州立银行核实",rfTitle:"这意味着什么",rfBelT:"高杠杆比率",rfBelD:"自有资金不足20%。银行通常会加收利率——违约风险上升。",rfNrT:"净收益率偏低",rfNrD:"扣除所有费用后低于3%。应对空置或意外维修的缓冲空间很小。",rfCfT:"负现金流",rfCfD:"每月需要自掏腰包补贴。应准备至少6个月租金作为流动性储备。",rfZT:"利率偏高",rfZD:"名义利率超过4%，会提高月供，明显压缩现金流。",rfTT:"还款比例过低",rfTD:"年还款率低于2%。还清债务需要很长时间——贷款期限和利率风险增加。",rfLzT:"贷款期限过长",rfLzD:"剩余期限超过35年。固定利率期结束后再融资风险很高。",rfPT:"每平米价格偏高",rfPD:"超过5,000欧元/平米使房价相对租金偏高——收益率和回报周期受影响。",rfEkT:"自有资金不足",rfEkD:"低于购买价格的20%。更多自有资金可争取更好的贷款条件和更大的安全边际。",rfLsT:"空置率偏高",rfLsD:"空置率超过5–8%会大幅减少租金收入。请检查地段条件和流动性储备。",badgeGut:"良好",badgeOkay:"一般",badgeKrit:"风险",badgeNeutral:"参考",jahrN:"第{n}年",monAbb:"/月",monLabel:"月",steuerErsTip:"折旧: {a}/年 | 可抵扣利息: {b}/年",nkAmortOk:"✓ 附加费已收回",nkAmortMid:"~ 附加费回收中",nkAmortNo:"⚠ 附加费未收回",nkAmortTip:"购房附加费用（{nbk}）通过节税在{beJ}年内收回",
sec1Q:"我能获得什么回报？",sec1Hint:"收益率",
sec1GreenBR:"毛收益率稳健 — 良好的起点。",sec1YellowBR:"收益率尚可 — 需密切关注成本。",sec1RedBR:"收益率低于市场水平 — 请仔细审查购买价格或租金。",
sec2Q:"我的月现金流如何？",sec2Hint:"现金流",
sec2GreenCF:"房产自给自足 — 无需每月额外补贴。",sec2YellowCF:"勉强收支平衡 — 哪怕1–2个月空置也可能成问题。",sec2RedCF:"每月需要自掏腰包 — 至少准备6个月租金作为储备。",
sec3Q:"我要向银行支付多少？",sec3Hint:"融资",
sec3GreenBel:"保守融资 — 最优贷款条件。",sec3YellowBel:"常规融资 — 可能有利率附加费。",sec3RedBel:"高杠杆融资 — 信用状况和收入尤为关键。",
sec4Q:"购置费用 & 税收优惠",sec4Hint:"国家 & 税收",
sec4LowTax:"税率较低 — 折旧效果较小。不含税收优惠的余额是你的现实数字。",sec4MidTax:"中等税率 — 折旧和利息抵扣帮助明显。",sec4HighTax:"高边际税率 — 通过折旧和利息抵扣获得最大税收优惠。",
sec5Q:"房产如何发展变化？",sec5Hint:"时间走势",sec5Sub:"分析期内的现金流、剩余债务和年租金走势。",
sec6Q:"最终剩下什么？",sec6Hint:"总体结果",
sec6GreenG:"总体结果为正 — 投资已获得回报。",sec6RedG:"总体结果为负 — 请重新考虑购买价格、租金或融资方案。",
sec6SaldoOhneHint:"适用于低收入者或无税收优惠的情况。",sec6SaldoMitHint:"适用于能够充分抵扣折旧和利息的高收入投资者。",sec7Q:"{j}年后出售剩余多少？",sec7Hint:"出售方案",sec7Sub:"显示{j}年后出售房产时的剩余收益。可在上方输入框调整分析年限。",selfQ:"房产能自给自足吗？",selfHint:"自负盈亏检查",s1b1:"毛收益率：年租金（{a}）÷ 购买价格（{b}）= {c}",s1b2:"净收益率：扣除不可转嫁费用后",s1b2v:"及空置损失",s1b3:"对比：活期存款约3%，国债约3.5%，股票ETF历史约7%/年",s1b4:"价租比：年租金的{x}倍（20–25倍为合理，>30倍偏贵）",s1b5:"成本差距过大 — 毛净利差{x}：请检查不可转嫁费用！",s1b6:"⚠ 净收益率（{a}）低于贷款利率（{b}）— 融资成本超过房产收益",s1t1:"毛收益率是房产投资的第一道快速检验：年租金 ÷ 总购价。您的年租金{rent}，购价{price}，毛收益率{bR}。净收益率更真实——需扣除所有不可转嫁成本。",s1t2a:"{nR}收益率高于存款和国债，起点良好。",s1t2b:"{nR}收益率尚可——需关注运营成本是否可能上涨。",s1t2c:"{nR}收益率偏低——仅略高于存款，却承担了房产风险。",s1t3:"调节手段：降低购价·提高租金（§558 BGB）·减少不可转嫁费用。",s2b1:"税前现金流：租金 − 不可转嫁费用 − 贷款还款 = {a}/月",s2b2:"含税收优惠现金流：{a}/月（税收节省：每月额外{b}）",s2b3n:"您每月需自付{a}——每年共{b}",s2b3p:"房产自给自足——无需税收优惠即可覆盖成本",s2b4:"含税收优惠后现金流转正——但须等税务申报后才能到账",s2b5:"月供合计：{a}/月（利息：{b}，本金：{c}）",s2t1:"现金流回答：我每月需补贴还是房产能产生收益？公式：租金 − 不可转嫁费用 − 还款额。正数=自给自足。",s2t2:"作为房东，贷款利息和折旧可抵税。该优惠随税务申报到账，非月度到账。",s2t3n:"负现金流未必是坏事——但您必须实际储备相应资金。",s2t3p:"无税收优惠仍正现金流是最佳状态。",s2t4:"调节手段：降低还款比例·增加首付·提高租金或降低空置率。",s3b1p:"→ 可获最优利率",s3b1m:"→ 小幅加息属正常",s3b1h:"→ 明显利率加成",s3b1:"贷款价值比（LTV）：{a}——银行资助购价的{a}{suf}",s3b2:"月还款额：{a}（利息：{b} + 本金：{c}）",s3b3a:"贷款期限：约{x}年（年还款率{p}）",s3b3b:"贷款期限：∞——按此还款率，贷款将永远无法还清！",s3b4:"贷款金额：{a}（首付{b} = 首付比例{c}）",s3b5:"LTV超过80%银行将加收利率——明显增加贷款成本",s3b6:"⚠ 按此还款率您将永远支付利息——请提高至至少2% p.a.",s3t1:"LTV显示银行贷出购价的百分比。低于60%：最优利率；60–80%：标准；超过80%：加息。",s3t2a:"以{p}年还款率，贷款约{lz}年还清。",s3t2b:"警告：按此还款率贷款永远无法还清。",s3t3:"调节手段：增加首付可同时降低LTV和利率；提高还款率可缩短期限。",s4b1:"节税金额：{a}/年 ≈ {b}/月（税率{c}）",s4b2:"两项可抵扣项目：贷款利息（{a}/年）+ 折旧（{b}/年）",s4b3:"折旧基数：{a}%建筑比例 × {b} p.a. = {c}/年",s4b4a:"购房附加费用：{a}——通过节税于第{b}年收回",s4b4b:"购房附加费用：{a}——尚未达到盈亏平衡点",s4b5:"提示：核查建造年份！1925年前 → 折旧率2.5%，每年多{x}",s4b6:"规律：税率越高，获益越多——税收优惠是高收入者的工具",s4t1:"国家通过两种机制间接补贴房东：（1）贷款利息可作为经营费用抵扣；（2）建筑折旧补贴。",s4t2:"仅建筑部分（{p}%）可折旧。折旧率：1924年后=2% p.a.，1925年前=2.5%，2023年起新建=3%。",s4t3:"调节手段：保持建筑比例合理；根据建造年份核查折旧率。",s5b1a:"剩余债务：从{a}开始，随还款递减，于第{b}年归零",s5b1b:"剩余债务：从{a}开始，{b}年内无法完全还清",s5b2:"累计现金流：显示截至各年的资金净流入或流出总额",s5b3:"年租金：随时间通过涨租逐步增长",s5b4:"固定利率到期：第{x}年固定利率到期——此后按市场利率",s5b5p:"分析期内累计现金流为正——房产收益超过成本",s5b5n:"累计现金流为负——您支出多于收入",s5t1:"三条曲线讲述您的投资故事：\n\n剩余债务（下降）：初期大部分还款作为利息流向银行。固定利率到期（第{zb}年）时重新谈判。\n\n累计现金流：何时转正？这是您的现金盈亏平衡点。\n\n年租金：随涨租缓慢增长。",s6b1:"含税总收益：{j}年内{a}",s6b2:"公式：（{vw}售价 − {rs}债务）+ {cf}累计现金流 − {inv}投资",s6b3:"增值：{j}年内{a}（{p} p.a.）",s6b4:"权益回报率 p.a.（含税）：{a}——对比：存款约3%，ETF约7%",s6b5p:"贷款已全部还清！",s6b5n:"出售时剩余债务：{a}——从售款中偿还",s6b6p:"累计现金流：{a}——期内净盈利",s6b6n:"累计现金流：{a}——净投入资金",s6t1:"总结汇总一切：售价（{vw}）− 剩余债务（{rs}）+ 累计现金流（{cf}）− 总投资额。",s6t2p:"结果为正——投资是值得的。",s6t2n:"结果为负——按当前估算，您投入多于所得。",s6t3a:"权益回报率{a} p.a.：卓越——超过历史ETF收益。",s6t3b:"权益回报率{a} p.a.：稳健。ETF约7%，但无杠杆。",s6t3c:"权益回报率{a} p.a.：尚可，但融资风险缓冲薄。",s6t3d:"权益回报率{a} p.a.：偏低，请检查您的假设。",s7b1:"第{j}年预估售价：{vw}（增值率：{p} p.a.）",s7b2a:"出售时剩余债务：{a}——从售款中偿还",s7b2b:"出售时剩余债务：{a}",s7b3:"还清后净收益：{a}",s7b4:"未含中介费——实际上还需售价的3–7%",s7b5p:"10年投机期已过：资本利得免税！",s7b5n:"投机期仍在进行——资本利得按所得税税率征税",s7t1:"该表详细列示售款的各个组成部分。{vw}为基于{p} p.a.增值率的估算值。",s7t2:"将市场价值（{vw}）与剩余债务（{rs}）比较：若债务更高，则无法不亏损出售。",s7t3p:"税务：10年后资本利得免税（§23 EStG）。",s7t3n:"注意：当前处于10年投机期内，利润将按所得税税率征税。",s7t4:"勿忘出售成本：中介（3–7%）、公证、土地注册——未含于此。",secOpen:"如何计算？",secClose:"收起",ekRTitle:"权益回报率 p.a.",ekRMit:"含税权益回报",ekROhne:"不含税权益回报",ekRHorizon:"{j}年投资期限",ekRConserv:"保守估算",ekRTip1:"您的首付（{ek}）以{p} p.a.增值——对比：ETF历史约7%",ekRTip2:"不含税收优惠——适用于低收入者或基础情景"},
hi:{haupt:"रिटर्न",kredit:"ऋण",miete:"किराया",sanier:"नवीनीकरण",steuer6:"§6 टिप",vfe:"अग्रिम भुग.",merkliste:"सहेजे गए",bundesland:"राज्य",kaufpreis:"खरीद मूल्य",flaeche:"रहने का क्षेत्र",preisQm:"मूल्य/वर्ग मी.",kaltmiete:"ठंडा किराया (मासिक)",nichtUml:"गैर-वसूली योग्य",leerstand:"रिक्ति",eigenkapital:"स्वपूंजी",zinssatz:"ब्याज दर",tilgung:"चुकौती",zinsbindung:"निश्चित दर अवधि",grEst:"हस्तांतरण कर",notar:"नोटरी",makler:"दलाली",steuersatz:"कर दर",afa:"मूल्यह्रास",grundAnteil:"भूमि हिस्सा",gebAnteil:"भवन हिस्सा",wertP:"मूल्य वृद्धि",jahre:"विश्लेषण अवधि",sonder:"गैराज/पार्किंग",plz:"पिन कोड",ort:"शहर",eingabe:"इनपुट",ergebnis:"परिणाम",bruttoR:"सकल प्रतिफल",nettoR:"शुद्ध प्रतिफल",rate:"किस्त/माह",cashflow:"नकदी प्रवाह/माह",laufzeit:"ऋण अवधि",nbk:"खरीद लागत",nbkSub:"हस्तांतरण कर, नोटरी, भूमि रजिस्ट्री",darlehen:"ऋण",steuerErs:"कर बचत",risk:"जोखिम स्तर",niedrig:"कम",mittel:"मध्यम",hoch:"उच्च",check:"त्वरित जांच",jPl:"वर्ष बाद",pJ:"औसत/वर्ष",iwert:"संपत्ति मूल्य",gut:"अच्छा",ok:"ठीक",krit:"गंभीर",nK:"लागत के बाद",pos:"सकारात्मक",zus:"सब्सिडी आवश्यक",oL:"संपत्ति और स्थान",fin:"वित्तपोषण",stNk:"लागत और कर",wZ:"मूल्य वृद्धि और अवधि",vgl:"तुलनात्मक किराया",lDat:"अंतिम वृद्धि",lMiet:"पिछला किराया",mietbeginn:"किराये की शुरुआत",kapp:"किराया सीमा",ang:"तनावपूर्ण बाज़ार",std:"सामान्य बाज़ार",nE:"अगली वृद्धि",mxE:"अधिकतम वृद्धि",nM:"अधिकतम नया किराया",jM:"अभी संभव",ab:"से",keE:"कोई वृद्धि नहीं",mPl:"किराया वृद्धि योजना",dat:"तिथि",akt:"वर्तमान",erh:"वृद्धि",sta:"स्थिति",foe:"सब्सिडी",amo:"वापसी अवधि",eKl:"ऊर्जा वर्ग",vor:"पहले",nac:"बाद",esp:"बचत",co2:"CO₂ कमी",tPl:"भुगतान योजना",bel:"ऋण-मूल्य अनुपात",rest:"शेष ऋण",gZin:"कुल ब्याज",gAuf:"कुल व्यय",gas:"प्राकृतिक गैस",oel:"हीटिंग तेल",wp:"ताप पंप",pel:"पेलेट",fw:"दूरस्थ ताप",koh:"कोयला",str:"बिजली",alt:"20 वर्ष से अधिक",mitt:"10–20 वर्ष",neu:"10 वर्ष से कम",mR:"किराया कानून",sBJ:"निर्माण वर्ष",sHTyp:"हीटिंग प्रकार",sHAlt:"हीटिंग आयु",sPers:"व्यक्ति",sWfl:"रहने का क्षेत्र",sFenStd:"मानक खिड़कियां",sFenXL:"अतिरिक्त बड़ी (>3m²)",sFenHST:"लिफ्ट-स्लाइड दरवाजे",sAnbau:"संलग्न स्थिति",sFasFl:"मुखौटा क्षेत्र",sDaFl:"छत क्षेत्र",sDaForm:"छत आकार",sLeist:"शक्ति",sKap:"क्षमता",sKeFl:"तहखाना क्षेत्र",sOgFl:"मंजिल की छत",sStrPr:"बिजली मूल्य",sHkos:"हीटिंग लागत",sFqAvg:"औसत सब्सिडी कोटा",sJEsp:"वार्षिक बचत",sCO2R:"CO₂ कमी",sEnerEsp:"ऊर्जा बचत",sGesK:"कुल नवीनीकरण लागत",sNetK:"शुद्ध",sAmoR:"वापसी गणना",sAmoSub:"शुद्ध लागत ÷ वार्षिक बचत",sMassDet:"विस्तृत उपाय",sGesamt:"कुल",anbFrei:"स्वतंत्र",anbDoppel:"दोहरा घर",anbMittel:"मध्य-पंक्ति",dchSattel:"ढलान छत",dchFlach:"समतल छत",dchWalm:"कूल्हे की छत",sGebData:"भवन डेटा",sEnergie:"ऊर्जा मूल्य",sStruktur:"भवन संरचना",sMassnahmen:"उपाय चुनें",kennzahlen:"📈 विश्लेषण और प्रमुख संकेतक",cfOhneSt:"CF/माह कर लाभ के बिना",cfMitSt:"CF/माह कर लाभ सहित",cfBasis:"किराया − लागत − किस्त",eigennutzHinweis:"स्वयं उपयोग की योजना है? यह कैलकुलेटर किराया निवेश के लिए अनुकूलित है।",cfMitSub:"AfA कर बचत सहित",brGreen:"ठोस सकल प्रतिफल",brYellow:"स्वीकार्य",brRed:"बाजार से कम",brGreenTip:"बाजार मानक ≥ 5%। सकारात्मक शुद्ध प्रतिफल के लिए अच्छा बिंदु।",brYellowTip:"पर्याप्त, लेकिन परिचालन लागत शुद्ध मार्जिन कम करती है।",brRedTip:"खरीद मूल्य, किराया या लागत जांचें।",nrGreen:"लागत के बाद आकर्षक",nrYellow:"परिचालन लागत कवर",nrRed:"लागत जोखिम",nrGreenTip:"सभी परिचालन लागत शामिल। ठोस प्रतिफल।",nrYellowTip:"लागत कवर करती है, लेकिन रिक्ति के लिए कम बफर।",nrRedTip:"संपत्ति परिचालन लागत मुश्किल से कवर करती है।",cfOGreen:"संपत्ति स्वावलंबी",cfOYellow:"बमुश्किल संतुलित",cfORed:"मासिक अतिरिक्त आवश्यक",cfOGreenTip:"किसी कर लाभ के बिना सकारात्मक। सर्वोत्तम स्थिति।",cfOYellowTip:"लगभग संतुलित। 1-2 महीने की रिक्ति समस्या बन सकती है।",cfORedTip:"मासिक कर्तव्य आवश्यक। कम से कम 6 महीने का भंडार योजना बनाएं।",cfMGreen:"कर लाभ के साथ सकारात्मक",cfMYellow:"बमुश्किल सकारात्मक",cfMRed:"कर के साथ भी नकारात्मक",cfMGreenTip:"अच्छा — लेकिन पर्याप्त आयकर भुगतान आवश्यक।",cfMYellowTip:"केवल पूर्ण कर लाभ के साथ बमुश्किल सकारात्मक।",cfMRedTip:"AfA और ब्याज कटौती के बाद भी नकारात्मक।",belGreen:"रूढ़िवादी वित्तपोषण",belYellow:"बाजार मानक",belRed:"उच्च बाहरी वित्तपोषण",belGreenTip:"सर्वोत्तम ब्याज दरें। मूल्य गिरावट के खिलाफ बफर।",belYellowTip:"निवेशकों के लिए विशिष्ट। ब्याज अधिभार संभव।",belRedTip:"क्रेडिट रेटिंग और आय विशेष रूप से महत्वपूर्ण।",lzGreen:"कम अवधि",lzYellow:"मध्यम अवधि",lzRed:"बहुत लंबी अवधि",lzInf:"कभी नहीं चुकाया",lzGreenTip:"जल्दी कर्जमुक्त। पूंजी निर्माण के लिए अनुकूल।",lzYellowTip:"प्रबंधनीय। निश्चित दर के बाद शर्तों पर ध्यान दें।",lzRedTip:"लंबी प्रतिबद्धता ब्याज दर जोखिम बढ़ाती है।",lzInfTip:"पुनर्भुगतान बढ़ाएं — वर्तमान दर पर ऋण कभी नहीं चुकाया जाएगा।",vermietQ:"किराए पर दें?",vermietJa:"हां, किराए पर",vermietNein:"नहीं / स्वयं उपयोग",immLeerQ:"वर्तमान में किराए पर?",immLeerJa:"हां, वर्तमान में किराए पर",immLeerNein:"नहीं, खाली है",chartTitle1:"शेष ऋण, नकदी प्रवाह और वार्षिक किराया",chartRestschuld:"शेष ऋण",chartKumCF:"संचयी नकदी प्रवाह",chartJahresmiete:"वार्षिक किराया",chartZinsbind:"निश्चित दर समाप्त",chartTitle2:"मासिक नकदी प्रवाह समय के साथ",chartCFOhne:"कर लाभ के बिना",chartCFMit:"कर लाभ सहित",chartDiff:"अंतर = कर लाभ",chartHoverKumCF:"संचयी CF",chartHoverJahresmiete:"वार्षिक किराया",chartHoverCFOhne:"कर बिना CF",chartHoverCFMit:"कर सहित CF",chartHoverSteuervorteil:"कर लाभ",chartDisclamer:"⚠️ कर लाभ के लिए पर्याप्त आयकर आवश्यक। कर सलाहकार से परामर्श करें।",tblTitle:"वार्षिक विकास",tblJahresmiete:"वार्षिक किराया",tblCFOhne:"कर बिना CF",tblCFMit:"कर सहित CF",tblSumme:"कुल",detTitle:"विक्रय परिदृश्य:",detJahren:"वर्ष बाद",detSub:"यदि विश्लेषण अवधि के बाद संपत्ति बेची जाए तो क्या बचेगा?",detErtraege:"आय",detErloes:"बिक्री आय",detCumCFOhne:"संचयी CF (कर बिना)",detCumSteuer:"संचयी कर बचत",detSteuerHinweis:"पर्याप्त आयकर आवश्यक",detAufwand:"व्यय",detSumme:"कुल",detSaldoOhne:"कुल शेष (कर बिना)",detSaldoMit:"कुल शेष (कर सहित)",detEKR:"इक्विटी रिटर्न",detSteuerVoraus:"पर्याप्त आयकर आवश्यक",detInfo:"कर लाभ = ब्याज कटौती, मूल्यह्रास और गैर-वसूली योग्य लागत × कर दर।",saldoOhne:"कर बिना शेष",saldoMit:"कर सहित शेष",sanTip1:"क्रम: पहले भवन आवरण (खिड़की, छत, अग्रभाग), फिर हीटिंग।",sanTip2:"ऊर्जा सलाहकार: iSFP बोनस +5%। सलाह स्वयं 50% सब्सिडाइज्ड।",sanTip3:"BAFA/KfW आवेदन अनुबंध से पहले करें!",sanTip4:"GEG § 72: >30 साल पुरानी हीटिंग बदलें। § 71: 65% नवीकरणीय।",sanTip5:"§ 35c EStG: 3 वर्षों में 20% लागत कटौती (अधिकतम 40,000€)।",sanTip6:"हाइड्रोलिक बैलेंसिंग: KfW अनिवार्य, हीटिंग 5–15% कम।",sanTip7:"PV + बैटरी: स्व-उपभोग ~70%। EV और ताप पंप के लिए आदर्श।",sBerat:"सलाह",ertraege:"आय",aufwend:"व्यय",gSaldoOhne:"कर लाभ के बिना कुल शेष",gSaldoMit:"कर लाभ सहित कुल शेष",pdfExport:"PDF के रूप में निर्यात",rechtlGrundlagen:"कानूनी आधार",sondTilgLabel:"अतिरिक्त भुगतान",vereinbSatz:"सहमत दर",entspricht:"बराबर है",stdSond:"मानक: ऋण राशि का 5% (अधिकांश बैंकों में स्वतंत्र रूप से सहमत)",neueLaufzeit:"नई अवधि",zinsenGespart:"ब्याज बचत",statt:"की बजाय",effekt:"प्रभाव",steuerNeutral:"वर्ष से कर-तटस्थ",steuerNeutralSub:"(कर बचत सहायक लागत को कवर करती है)",positivSaldo:"सकारात्मक कुल शेष",nachJahrenVerk:"{n} वर्ष बाद बिक्री पर",zins:"ब्याज",tilgK:"चुकौती",belCond90:"⚠️ >90% - ब्याज अधिभार",belCond80:"🟡 80-90% - सामान्य शर्तें",belCondOk:"✅ <80% - सर्वोत्तम शर्तें",markt:"बाज़ार",riskShow:"▼ प्रभाव कारक दिखाएं",riskHide:"▲ कारक छुपाएं",rechtsHinweis:"यह जानकारी कानूनी सलाह नहीं है। विशिष्ट मामलों के लिए कर सलाहकार या वकील से परामर्श करें।",analyseZr:"विश्लेषण अवधि",vercomp:"संदर्भ किराया सीमा पहुँची",sanMassN1:"खिड़की बदलाव",sanMassN2:"अग्रभाग इन्सुलेशन",sanMassN3:"हीटिंग नवीनीकरण",sanMassN4:"छत नवीनीकरण",sanMassN5:"प्रवेश द्वार",sanMassN6:"फोटोवोल्टेइक",sanMassN7:"तहखाना छत इन्सुलेशन",sanMassN8:"शीर्ष मंजिल छत",sanMassN9:"बैटरी भंडारण",sanMassN10:"वेंटिलेशन",sHkJahr:"हीटिंग लागत/वर्ष",sSkJahr:"बिजली लागत/वर्ष",sPreisstieg:"ऊर्जा मूल्य वृद्धि",sAutoCalc:"स्वचालित",sPS0:"0%/वर्ष (स्थिर)",sPS1:"+1%/वर्ष",sPS2:"+2%/वर्ष (पूर्वानुमान)",sPS3:"+3%/वर्ष",sPS5:"+5%/वर्ष (रूढ़िवादी)",sCapHin:"BAFA/KfW सीमा लागू",tierS:"मानक",tierG:"उन्नत",tierM:"प्रीमियम",sTierFenS:"PVC फ्रेम",sTierFenG:"एल्यू-कम्पोजिट",sTierFenM:"लकड़ी-एल्यू+ऐप",sTierFasS:"10सेमी इन्सुलेशन",sTierFasG:"16सेमी प्रीमियम",sTierFasM:"20सेमी इको-हेम्प",sTierHzS:"हीटिंग+पंप",sTierHzG:"+रेडिएटर+नियंत्रण",sTierHzM:"+फर्श हीटिंग+ऐप",sTierDaS:"पुनः छत+इन्सुलेशन",sTierDaG:"+अंडरले+शीट",sTierDaM:"नई छत संरचना",sTierTuS:"मानक सुरक्षा",sTierTuG:"उच्च गुणवत्ता",sTierTuM:"प्रीमियम+फिंगरप्रिंट",sTierPvS:"छत पर, फीड-इन",sTierPvG:"छत में+ऊर्जा प्रबंधन",sTierPvM:"सौर छत टाइल",sTierLuS:"बुनियादी वेंटिलेशन",sTierLuG:"बेहतर फिल्टर",sTierLuM:"प्रीमियम+नियंत्रण",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + हीटिंग बोनस",sSrcPv:"KfW 270 (कम ब्याज, EEG 2023)",sSrcBat:"राज्य सब्सिडी (क्षेत्रीय)",sondTilgSub:"ऋण अवधि कम करने के लिए वार्षिक अतिरिक्त भुगतान (§ 500 BGB)",adv1:"सकल-शुद्ध अंतर > 2% - लागत संरचना की जांच करें।",adv2:"गुणक > 30 - खरीद मूल्य 30 वार्षिक किराए से अधिक है।",adv3:"शुद्ध प्रतिफल वित्तपोषण दर से कम - नकारात्मक लीवरेज प्रभाव।",adv4:"शीर्ष कर दर > 42% - AfA और ब्याज कटौती का अधिकतम कर प्रभाव।",adv5:"भूमि हिस्सा > 40% - उच्च भूमि हिस्सा मूल्यह्रास आधार कम करता है।",adv6:"रिक्ति > 5% और नकारात्मक नकदी प्रवाह - कम से कम 6 मासिक किराए की तरल आरक्षित अनुशंसित।",adv7:"पुनर्वित्त > ऋण का 60% - निश्चित अवधि के बाद उच्च ब्याज दर जोखिम।",adv8:"निश्चित अवधि < 10 वर्ष और ब्याज > 3.5% - पुनर्वित्त जोखिम बढ़ा हुआ।",adv9:"चुकौती < 2% - बहुत कम चुकौती। कम से कम 2% तक बढ़ाएं।",adv10:"अतिरिक्त भुगतान उपयोग नहीं - वार्षिक अतिरिक्त भुगतान अवधि और कुल ब्याज काफी कम करेगा।",adv11:"LTV 80-90% - अधिक इक्विटी के साथ बेहतर ब्याज शर्तें संभव।",adv12:"किराया संदर्भ किराए से > 15% कम - क्रमिक वृद्धि संभव।",adv13:"अंतिम वृद्धि > 3 वर्ष पहले - 3-वर्षीय खिड़की पूरी तरह रीसेट।",adv14:"किराया सीमा पहुंची, संदर्भ किराया काफी अधिक - अगली 3-वर्षीय खिड़की तक पूर्ण स्थान नहीं।",adv15:"तनावपूर्ण बाजार और किराया संदर्भ के पास - § 559 BGB आधुनिकीकरण किराया वृद्धि विकल्प।",adv16:"वापसी > 20 वर्ष - KfW ऋण की ब्याज सुविधा वापसी अवधि काफी कम कर सकती है।",adv17:"नवीनीकरण के बाद ऊर्जा वर्ग अभी C से नीचे - 2033 से EU किराए पर प्रतिबंध जोखिम।",adv18:"बिना इन्सुलेशन के हीटिंग बदला - ताप पंप को इन्सुलेटेड भवन आवरण की आवश्यकता है।",advTitle:"💡 विश्लेषण",datastand:"डेटा स्थिति",garageKauf:"गैराज/पार्किंग",sonderUml:"विशेष अंशदान",renovierung:"नवीनीकरण लागत",renovSofort:"✅ 15% सीमा के नीचे — तत्काल व्यय के रूप में कटौती योग्य।",renovAktiv:"⚠️ 15% सीमा से ऊपर — पूंजीकरण आवश्यक।",renovEigennutz:"स्व-उपयोग: कर कटौती योग्य नहीं।",renovGrenzHinw:"भवन क्रय मूल्य की 15% सीमा",stCheck:"स्व-वित्तपोषण जांच",stZielKP:"लक्ष्य मूल्य (CF\u00a0=\u00a00)",stSelbstAb:"स्व-वित्तपोषण से",stOhneStAkt:"कर लाभ के बिना\u00b7वर्तमान मूल्य पर",stSofort:"तुरंत",stAusserhalb:"सीमा से बाहर",stCFPositiv:"पहले\u00a0दिन से CF सकारात्मक",stMietSteig:"किराया वृद्धि",stVerhandlZiel:"बातचीत का लक्ष्य",stIstKPPuffer:"वास्तविक मूल्य से कम\u00a0—\u00a0बफर",stMitStVor:"कर लाभ के साथ",stUnterZiel:"लक्ष्य से कम",stHero1:"यह संपत्ति स्व-वित्तपोषित है\u00a0— बिना किसी कर लाभ के नकदी प्रवाह सकारात्मक। सही शुरुआत।",stHero2:"कर लाभ के साथ स्व-वित्तपोषित ({cf}/माह)। कर के बिना {diff}/माह का अंतर\u00a0— छोटा जोखिम।",stHero3:"कीमत {diff} ({pct}) कम करके {kp} पर लाएं\u00a0— संपत्ति बिना मासिक भुगतान के स्व-वित्तपोषित।",stHero4a:"वर्तमान मूल्य पर वर्ष {j} से स्व-वित्तपोषित (किराया वृद्धि)। तुरंत स्व-वित्तपोषित के लिए: {kp}।",stHero4b:"वर्तमान मूल्य पर स्व-वित्तपोषित नहीं। लक्ष्य मूल्य: {kp} (−{diff})।",stVerdictJa:"हाँ",stVerdictNein:"नहीं",expandAll:"सभी खोलें",collapseAll:"सभी बंद करें",stWhyJa:"कर लाभ के बिना भी +{cf}/माह अधिशेष बचता है। बेहतरीन शुरुआत।",stWhyNein:"कर लाभ के बिना आप हर माह {cf} अपनी जेब से देते हैं।",stTaxPos:"कर लाभ के साथ नकदी प्रवाह सकारात्मक होगा (+{cf}/माह) — पर इससे संपत्ति स्व-वित्तपोषित नहीं हो जाती। यह लाभ वास्तविक नकदी प्रवाह नहीं है और पर्याप्त कर देयता आवश्यक है।",stTaxNeg:"कर लाभ के साथ भी स्व-वित्तपोषण से {cf}/माह कम है।",stTaxBonus:"कर लाभ के साथ अधिशेष +{cf}/माह तक बढ़ जाता है।",close:"बंद करें",saveBtnLabel:"सहेजें",saveModalTitle:"संपत्ति सहेजें",savePlaceholder:"जैसे: बर्लिन अपार्टमेंट · दूसरी मंज़िल",saveConfirm:"सहेजें",emptyTitle:"अभी तक कोई सहेजी गई संपत्ति नहीं",emptyHint:"एक संपत्ति की गणना करें और “सहेजें” पर टैप करें।",countSingular:"संपत्ति सहेजी गई",countPlural:"संपत्तियां सहेजी गईं",loadBtn:"↩ लोड करें",deleteTitle:"संपत्ति हटाएं?",deleteHint:"यह गणना स्थायी रूप से हटा दी जाएगी।",cancelBtn:"रद्द करें",deleteBtn:"हटाएं",defaultObjName:"संपत्ति",sanIsfpLabel:"iSFP — व्यक्तिगत ऊर्जा नवीनीकरण रोडमैप",sanIsfpSub:"+5% BAFA बोनस सभी BEG उपायों पर (संघीय सब्सिडी, § 89 GEG)",sanIsfpActive:"iSFP सक्रिय — सभी BEG उपायों में +5% BAFA बोनस शामिल",sanIsfpTip:"iSFP सक्रिय — +5% BAFA बोनस पहले से शामिल। परामर्श लागत 50% अनुदानित।",sanLandesbankHint:"BAFA सब्सिडी दरें राष्ट्रव्यापी एकसमान लागू होती हैं",sanLandDis:"अनुमानित मूल्य, कृपया Landesbank से जाँचें",rfTitle:"इसका क्या मतलब है",rfBelT:"उच्च ऋण अनुपात",rfBelD:"इक्विटी 20% से कम। बैंक अक्सर ब्याज प्रीमियम लगाते हैं — डिफ़ॉल्ट जोखिम बढ़ता है।",rfNrT:"कमज़ोर नेट यील्ड",rfNrD:"सभी लागतों के बाद 3% से कम। रिक्ति या अप्रत्याशित मरम्मत के लिए बहुत कम बफर।",rfCfT:"नकारात्मक कैश फ्लो",rfCfD:"आपको हर महीने अतिरिक्त भुगतान करना पड़ता है। कम से कम 6 महीने के किराए की लिक्विडिटी रिज़र्व रखें।",rfZT:"उच्च ब्याज दर",rfZD:"4% से ऊपर नाममात्र ब्याज मासिक किस्त बढ़ाता है और कैश फ्लो को काफी कम करता है।",rfTT:"कम मूलधन भुगतान",rfTD:"सालाना 2% से कम। कर्ज़मुक्त होने में बहुत लंबा समय — अवधि और ब्याज जोखिम बढ़ता है।",rfLzT:"बहुत लंबी ऋण अवधि",rfLzD:"35 वर्ष से अधिक शेष अवधि। फ़िक्स्ड रेट खत्म होने के बाद पुनर्वित्त जोखिम बहुत अधिक।",rfPT:"प्रति वर्गमीटर उच्च मूल्य",rfPD:"5,000 €/m² से ऊपर किराये की तुलना में कीमत बढ़ाता है — यील्ड और पेबैक अवधि प्रभावित होती है।",rfEkT:"कम इक्विटी",rfEkD:"खरीद मूल्य के 20% से कम। अधिक इक्विटी बेहतर ब्याज दर और सुरक्षा मार्जिन देती है।",rfLsT:"उच्च रिक्ति दर",rfLsD:"5–8% से ऊपर रिक्ति दर किराया आय को काफी कम करती है। स्थान और रिज़र्व की जाँच करें।",badgeGut:"अच्छा",badgeOkay:"ठीक",badgeKrit:"जोखिम",badgeNeutral:"जानकारी",jahrN:"वर्ष {n}",monAbb:"/माह",monLabel:"माह",steuerErsTip:"मूल्यह्रास: {a}/वर्ष | कटौती योग्य ब्याज: {b}/वर्ष",nkAmortOk:"✓ NK वसूल",nkAmortMid:"~ NK प्रगति में",nkAmortNo:"⚠ NK नहीं वसूला",nkAmortTip:"खरीद लागत ({nbk}) कर बचत से {beJ} वर्षों में वसूल",
sec1Q:"मुझे कितना रिटर्न मिल रहा है?",sec1Hint:"यील्ड",
sec1GreenBR:"मज़बूत सकल यील्ड — अच्छा शुरुआती बिंदु।",sec1YellowBR:"स्वीकार्य यील्ड — लागतों पर नज़र रखें।",sec1RedBR:"बाज़ार से कम यील्ड — खरीद मूल्य या किराया ध्यान से जाँचें।",
sec2Q:"मेरा मासिक कैश फ्लो कैसा है?",sec2Hint:"कैश फ्लो",
sec2GreenCF:"संपत्ति खुद को वहन करती है — कोई मासिक अतिरिक्त भुगतान नहीं।",sec2YellowCF:"मुश्किल से संतुलन — 1–2 महीने की रिक्ति भी समस्या बन सकती है।",sec2RedCF:"हर महीने अतिरिक्त भुगतान — कम से कम 6 महीने का किराया रिज़र्व रखें।",
sec3Q:"मैं बैंक को क्या देता हूँ?",sec3Hint:"वित्तपोषण",
sec3GreenBel:"रूढ़िवादी वित्तपोषण — सर्वोत्तम ब्याज दरें।",sec3YellowBel:"सामान्य वित्तपोषण — ब्याज प्रीमियम संभव।",sec3RedBel:"उच्च उत्तोलन — क्रेडिट और आय विशेष रूप से महत्वपूर्ण।",
sec4Q:"खरीद लागत & कर लाभ",sec4Hint:"सरकार & कर",
sec4LowTax:"कम कर दर — मूल्यह्रास प्रभाव कम। बिना कर लाभ का बैलेंस आपकी वास्तविक संख्या है।",sec4MidTax:"मध्यम कर दर — मूल्यह्रास और ब्याज कटौती उल्लेखनीय रूप से मदद करती है।",sec4HighTax:"उच्च सीमांत दर — मूल्यह्रास और ब्याज कटौती से अधिकतम कर लाभ।",
sec5Q:"संपत्ति कैसे विकसित होती है?",sec5Hint:"समय रेखा",sec5Sub:"विश्लेषण अवधि में कैश फ्लो, शेष ऋण और वार्षिक किराया।",
sec6Q:"अंत में क्या बचता है?",sec6Hint:"समग्र परिणाम",
sec6GreenG:"सकारात्मक समग्र परिणाम — निवेश सार्थक रहा।",sec6RedG:"नकारात्मक परिणाम — खरीद मूल्य, किराया या वित्तपोषण पर पुनर्विचार करें।",
sec6SaldoOhneHint:"कम आय वालों या कर लाभ के बिना।",sec6SaldoMitHint:"उन उच्च आय वालों के लिए जो मूल्यह्रास और ब्याज पूरी तरह काट सकते हैं।",sec7Q:"{j} वर्षों के बाद बेचने पर क्या बचता है?",sec7Hint:"बिक्री परिदृश्य",sec7Sub:"{j} वर्षों के बाद संपत्ति बेचने पर शेष राशि दिखाता है। ऊपर फ़ील्ड में अवधि बदलें।",selfQ:"क्या संपत्ति खुद को वहन करती है?",selfHint:"स्व-वाहक जांच",s1b1:"सकल उपज: वार्षिक किराया ({a}) ÷ खरीद मूल्य ({b}) = {c}",s1b2:"शुद्ध उपज: गैर-हस्तांतरणीय लागत घटाने के बाद",s1b2v:" और रिक्तता हानि",s1b3:"तुलना: बचत ~3%, सरकारी बॉन्ड ~3.5%, इक्विटी ETF ~7% p.a.",s1b4:"मूल्य-किराया: वार्षिक किराये का {x}× (20–25× ठोस, >30× महंगा)",s1b5:"बड़ा लागत अंतर — {x} का अंतर: गैर-हस्तांतरणीय लागत जांचें!",s1b6:"⚠ शुद्ध उपज ({a}) ऋण दर ({b}) से कम — उधारी लागत संपत्ति आय से अधिक",s1t1:"सकल उपज = वार्षिक किराया ÷ कुल खरीद मूल्य। {rent} किराया, {price} मूल्य = {bR} सकल। शुद्ध उपज अधिक ईमानदार आंकड़ा है।",s1t2a:"{nR} पर आप बचत खाते और सरकारी बॉन्ड से ऊपर हैं। मजबूत शुरुआत।",s1t2b:"{nR} उपज स्वीकार्य है — जांचें कि लागत बढ़ सकती है या नहीं।",s1t2c:"{nR} उपज कमजोर है — बचत खाते से थोड़ी अधिक, संपत्ति के जोखिम के बिना।",s1t3:"समायोजन: खरीद मूल्य कम करें। किराया बढ़ाएं (§558 BGB)। गैर-हस्तांतरणीय लागत घटाएं।",s2b1:"कर-रहित नकद प्रवाह: किराया − गैर-हस्तांतरणीय लागत − ऋण भुगतान = {a}/माह",s2b2:"कर लाभ के साथ नकद प्रवाह: {a}/माह (कर बचत: {b}/माह अतिरिक्त)",s2b3n:"आप हर महीने अपनी जेब से {a} देते हैं — सालाना {b}",s2b3p:"संपत्ति स्वयं को बनाए रखती है — कर लाभ के बिना भी",s2b4:"कर लाभ के साथ नकद प्रवाह सकारात्मक हो जाता है — लेकिन यह कर रिटर्न के साथ आता है",s2b5:"कुल वार्षिकी: {a}/माह (ब्याज: {b}, मूलधन: {c})",s2t1:"नकद प्रवाह उत्तर देता है: क्या मैं मासिक पैसे जोड़ता हूं या संपत्ति आय देती है? सूत्र: किराया − गैर-हस्तांतरणीय लागत − ऋण भुगतान। सकारात्मक = स्व-वित्तपोषण।",s2t2:"मकान मालिक के रूप में आप ऋण ब्याज और AfA कर से घटा सकते हैं। यह लाभ कर रिटर्न के साथ आता है, मासिक नहीं।",s2t3n:"नकारात्मक नकद प्रवाह जरूरी बुरा नहीं है — लेकिन आपके पास वास्तव में ये भंडार होने चाहिए।",s2t3p:"कर लाभ के बिना सकारात्मक नकद प्रवाह स्वर्ण मानक है।",s2t4:"समायोजन: कम पुनर्भुगतान दर। अधिक इक्विटी। अधिक किराया या कम रिक्तता।",s3b1p:"→ सर्वश्रेष्ठ दरें संभव",s3b1m:"→ छोटा प्रीमियम सामान्य",s3b1h:"→ महत्वपूर्ण जोखिम प्रीमियम",s3b1:"ऋण-मूल्य अनुपात (LTV): {a} — बैंक खरीद मूल्य का {a} वित्तपोषण करता है{suf}",s3b2:"मासिक भुगतान: {a} (ब्याज: {b} + मूलधन: {c})",s3b3a:"ऋण अवधि: लगभग {x} वर्ष ({p} वार्षिक पुनर्भुगतान)",s3b3b:"ऋण अवधि: ∞ — इस दर पर ऋण कभी पूरा नहीं चुकेगा!",s3b4:"ऋण राशि: {a} (इक्विटी {b} = {c} इक्विटी अनुपात)",s3b5:"80% LTV से ऊपर बैंक जोखिम प्रीमियम लेते हैं — ऋण लागत उल्लेखनीय रूप से बढ़ती है",s3b6:"⚠ इस पुनर्भुगतान दर पर आप हमेशा ब्याज देते रहेंगे — कम से कम 2% p.a. तक बढ़ाएं",s3t1:"LTV दिखाता है बैंक खरीद मूल्य का कितना प्रतिशत वित्तपोषण करता है। 60% से कम: सर्वश्रेष्ठ दरें; 60–80%: सामान्य; 80% से अधिक: जोखिम प्रीमियम।",s3t2a:"{p} p.a. पुनर्भुगतान पर ऋण चुकाने में लगभग {lz} वर्ष लगते हैं।",s3t2b:"सावधान: इस पुनर्भुगतान दर पर ऋण कभी पूरा नहीं चुकेगा।",s3t3:"समायोजन: अधिक इक्विटी LTV और ब्याज दर दोनों घटाती है। उच्च पुनर्भुगतान अवधि कम करता है।",s4b1:"कर बचत: {a}/वर्ष ≈ {b}/माह ({c} कर दर पर)",s4b2:"दो कटौती योग्य मदें: ऋण ब्याज ({a}/वर्ष) + मूल्यह्रास AfA ({b}/वर्ष)",s4b3:"मूल्यह्रास आधार: {a}% भवन हिस्सा × {b} p.a. = {c}/वर्ष",s4b4a:"खरीद लागत: {a} — वर्ष {b} तक कर बचत से वसूल",s4b4b:"खरीद लागत: {a} — अभी ब्रेक-ईवन नहीं हुआ",s4b5:"सुझाव: निर्माण वर्ष जांचें! 1925 से पहले → 2.5% AfA। अतिरिक्त: {x}/वर्ष",s4b6:"नियम: कर दर जितनी अधिक, उतना अधिक लाभ — कर लाभ उच्च आय वालों का उपकरण है",s4t1:"सरकार दो तंत्रों से मकान मालिकों को सब्सिडी देती है: (1) ऋण ब्याज व्यय के रूप में कटौती योग्य; (2) AfA — भवन मूल्यह्रास भत्ता।",s4t2:"केवल भवन हिस्सा ({p}%) मूल्यह्रास योग्य है। AfA दर: 1924 के बाद = 2% p.a., 1925 से पहले = 2.5%, 2023 से नई = 3%।",s4t3:"समायोजन: भवन हिस्सा यथार्थवादी रखें। निर्माण वर्ष के अनुसार AfA दर जांचें।",s5b1a:"शेष ऋण: {a} से शुरू, पुनर्भुगतान से घटता है और वर्ष {b} में शून्य पहुंचता है",s5b1b:"शेष ऋण: {a} से शुरू, {b} वर्षों में पूरा नहीं चुकेगा",s5b2:"संचयी नकद प्रवाह: प्रत्येक वर्ष तक कुल धन अंदर या बाहर",s5b3:"वार्षिक किराया: समय के साथ किराया वृद्धि से बढ़ता है",s5b4:"फिक्स्ड-रेट समाप्ति: वर्ष {x} में फिक्स्ड दर समाप्त — बाद में बाजार दर",s5b5p:"विश्लेषण अवधि में संचयी नकद प्रवाह सकारात्मक — संपत्ति ने लागत से अधिक कमाया",s5b5n:"विश्लेषण अवधि में संचयी नकद प्रवाह नकारात्मक — आपने प्राप्त से अधिक भुगतान किया",s5t1:"तीन वक्र आपके निवेश की कहानी बताते हैं:\n\nशेष ऋण (घटता): शुरुआत में अधिकांश भुगतान ब्याज के रूप में जाता है। फिक्स्ड-रेट समाप्ति (वर्ष {zb}) पर पुनः वार्ता।\n\nसंचयी नकद प्रवाह: यह कब सकारात्मक होता है? यह आपका नकद ब्रेक-ईवन है।\n\nवार्षिक किराया: किराया वृद्धि से धीरे-धीरे बढ़ता है।",s6b1:"कर सहित कुल रिटर्न: {j} वर्षों में {a}",s6b2:"सूत्र: ({vw} बिक्री − {rs} ऋण) + {cf} संचयी NP − {inv} निवेश",s6b3:"मूल्य वृद्धि: {j} वर्षों में {a} ({p} p.a.)",s6b4:"इक्विटी रिटर्न p.a. (कर सहित): {a} — तुलना: बचत ~3%, ETF ~7%",s6b5p:"ऋण पूरी तरह चुका दिया!",s6b5n:"बिक्री पर शेष ऋण: {a} — बिक्री आय से चुकाया जाएगा",s6b6p:"संचयी नकद प्रवाह: {a} — अवधि में शुद्ध लाभ",s6b6n:"संचयी नकद प्रवाह: {a} — शुद्ध निवेश किया",s6t1:"कुल परिणाम सब कुछ जोड़ता है: बिक्री आय ({vw}) − शेष ऋण ({rs}) + संचयी नकद प्रवाह ({cf}) − कुल निवेश।",s6t2p:"परिणाम सकारात्मक — निवेश सार्थक रहा।",s6t2n:"परिणाम नकारात्मक — वर्तमान अनुमान के अनुसार आपने अधिक निवेश किया।",s6t3a:"इक्विटी रिटर्न {a} p.a.: उत्कृष्ट — ऐतिहासिक ETF को भी मात देता है।",s6t3b:"इक्विटी रिटर्न {a} p.a.: ठोस। ETF ~7%, लेकिन लीवरेज के बिना।",s6t3c:"इक्विटी रिटर्न {a} p.a.: ठीक है, लेकिन वित्तपोषण जोखिम के लिए कमजोर।",s6t3d:"इक्विटी रिटर्न {a} p.a.: कमजोर। अपनी मान्यताओं की जांच करें।",s7b1:"वर्ष {j} में अनुमानित बिक्री मूल्य: {vw} (मूल्य वृद्धि: {p} p.a.)",s7b2a:"बिक्री पर शेष ऋण: {a} — बिक्री आय से चुकाया जाएगा",s7b2b:"बिक्री पर शेष ऋण: {a}",s7b3:"पुनर्भुगतान के बाद शुद्ध आय: {a}",s7b4:"बिक्री एजेंट शुल्क शामिल नहीं — व्यवहार में बिक्री मूल्य का 3–7% अतिरिक्त",s7b5p:"10-वर्षीय सट्टा अवधि समाप्त: बिक्री लाभ कर-मुक्त!",s7b5n:"सट्टा अवधि चल रही है — बिक्री लाभ आयकर दर पर कर लगाया जाएगा",s7t1:"तालिका बिक्री आय के सभी घटकों को दिखाती है। {vw} {p} p.a. मूल्य वृद्धि पर आधारित अनुमान है।",s7t2:"बाजार मूल्य ({vw}) की शेष ऋण ({rs}) से तुलना करें: ऋण अधिक होने पर बिना नुकसान नहीं बेच सकते।",s7t3p:"कर: 10 वर्षों के बाद बिक्री लाभ कर-मुक्त (§23 EStG)।",s7t3n:"ध्यान दें: अभी 10-वर्षीय सट्टा अवधि में। लाभ आयकर दर पर कर लगाया जाएगा।",s7t4:"बिक्री लागत न भूलें: एजेंट (3–7%), नोटरी, भूमि रजिस्ट्री — यहां शामिल नहीं।",secOpen:"यह कैसे गणना की जाती है?",secClose:"कम दिखाएं",ekRTitle:"इक्विटी रिटर्न p.a.",ekRMit:"कर सहित इक्विटी रिटर्न",ekROhne:"कर रहित इक्विटी रिटर्न",ekRHorizon:"{j} वर्ष निवेश अवधि",ekRConserv:"रूढ़िवादी दृष्टिकोण",ekRTip1:"आपकी इक्विटी ({ek}) {p} p.a. पर बढ़ती है — तुलना: ETF ऐतिहासिक ~7%",ekRTip2:"कर लाभ के बिना — कम कमाने वालों या बेस स्केनेरियो के लिए"}};

// ═══ Landing Page Translations ═══
const TL={
  de:{h1a:"Immobilien ",h1b:"clever analysieren.",h1c:" Rendite kennen. Richtig entscheiden.",sub:"Professionelle Rechner für Kapitalanleger und Vermieter in Deutschland. Rendite, Finanzierung, Mietrecht und Sanierung – sofort, in Echtzeit, gratis.",mockKauf:"KAUFPREIS",mockMiete:"MONATLICHE MIETE",mockZins:"ZINSSATZ",mockEK:"EIGENKAPITAL",mockBrutto:"BRUTTORENDITE",mockNetto:"NETTORENDITE",mockRate:"Monatliche Rate",mockRateSub:"inkl. 2 % Tilgung",mockCF:"Monatlicher Cashflow",mockCFSub:"nach Kosten & Rate",mockChart:"CASHFLOW-VERLAUF",ratesTitle:"Tagesaktuelle Bauzinsen",ratesDisclaim:"Alle Angaben ohne Gewähr. Individuelle Konditionen können abweichen.",ratesStand:"Stand",ratesIntro1:"Die 10-jährige Bundesanleihe (BBK01.WT1010) liegt aktuell bei",ratesIntro2:"Bauzinsen für 10 Jahre Zinsbindung im Marktüberblick:",ratesSoll:"Sollzins",ratesAb:"ab ca.",ratesSources:"Quellen",cardsTitle:"Wählen Sie Ihren Rechner",uspTitle:"Was macht Immofuchs besonders",uspSub:"Mehr als nur ein Rechner",usp1H:"Tagesaktuelle Marktdaten",usp1P:"Bundesbank-Renditen, Bauzinsen und BEG-Förderquoten automatisch eingebunden — kein manuelles Nachschauen nötig.",usp3H:"Bundesland-spezifisch",usp3P:"Grunderwerbsteuer, Kappungsgrenzen (15 %/20 %) und Landesförderbanken werden je nach Ort automatisch angewendet.",howTitle:"So funktioniert's",step1H:"Rechner wählen",step1P:"Wählen Sie den passenden Rechner — Rendite, Kredit, Mieterhöhung oder Sanierung.",step2H:"Daten eingeben",step2P:"Kaufpreis, Miete, Zinsatz — alle Felder sind mit realistischen Werten vorbelegt.",step3H:"Sofort Ergebnisse",step3P:"Alle Ergebnisse updaten in Echtzeit. Keine Anmeldung, kein Warten, keine Kosten.",fullTitle:"Renditerechner",fullBadge:"Rendite",fullDesc:"Der umfassendste Rechner: Rendite, Cashflow, Steuervorteile, Mietrecht und Risikoanalyse in einem.",fullF1:"Brutto- & Netto-Mietrendite",fullF2:"Verkaufsszenario nach X Jahren",fullF3:"AfA & Steuervorteile (§ 7 EStG)",fullF4:"Mieterhöhungsplan (§ 558 BGB)",fullF5:"Risikoanalyse & Schnellcheck",fullF6:"PLZ-Autovervollständigung",fullCta:"Renditerechner öffnen",finTitle:"Kreditrechner",finBadge:"Finanzierung",finDesc:"Monatliche Rate, vollständiger Tilgungsplan und Restschuld nach Zinsbindung – schnell und präzise.",finF1:"Monatliche Annuität",finF2:"Sondertilgung & Laufzeit",finF3:"Beleihungsauslauf (LTV)",finF4:"Restschuld nach Zinsbindung",finF5:"Tilgungsvergleich",finF6:"Kaufnebenkosten",finCta:"Kreditrechner öffnen",rentTitle:"Mieterhöhung",rentBadge:"Mietrecht",rentDesc:"Wann ist die nächste Mieterhöhung möglich, wie viel darf erhöht werden und wie entwickelt sich die Miete?",rentF1:"Nächster Termin (§ 558 BGB)",rentF2:"Kappungsgrenze 15/20 % auto",rentF3:"Vergleichsmiete als Obergrenze",rentF4:"Prognose bis 20 Jahre",rentF5:"Über 200 Städte erkannt",rentF6:"Rechtliche Grundlagen",rentCta:"Mieterhöhung öffnen",sanTitle:"Sanierungsrechner",sanBadge:"Sanierung",sanDesc:"Kosten, BEG-Förderung, CO₂-Einsparung und Amortisationsdauer für energetische Sanierung berechnen.",sanF1:"Fenster, Hülle, Dach, Heizung",sanF2:"Bis zu 70 % BEG-Förderung",sanF3:"Energieklasse vorher/nachher",sanF4:"CO₂-Reduktion",sanF5:"Amortisationsberechnung",sanF6:"PV, Speicher & Wallbox",sanCta:"Sanierungsrechner öffnen",st6Title:"Steueroptimierung §6",st6Badge:"Steuer",st6Desc:"Rückwärts rechnen: Welche Sanierungskosten und welchen Kaufpreis brauchen Sie, um Ihre Einkommensteuer auf null zu senken?",st6F1:"Steuerersparnis rückwärts berechnen",st6F2:"§ 6 Abs. 1 Nr. 1a EStG-konform",st6F3:"Gebäudewert & Gesamtkaufpreis",st6F4:"15 %-Grenze automatisch",st6F5:"Sicherheitspuffer 3 %",st6F6:"Alle Grenzsteuersätze inkl. SolZ",st6Cta:"§6-Trick berechnen",vfe:"VFE",vfeTitle:"Vorfälligkeitsrechner",vfeBadge:"VORFÄLLIGKEITSRECHNER",vfeDesc:"Wie teuer wird es, deinen Kredit vorzeitig abzulösen? Der Rechner zeigt dir den genauen Betrag — BGH-konform, mit tagesaktuellem Pfandbrief-Wiederanlagezins (automatisch aktuell) und vollständigem Tilgungsplan.",vfeF1:"Exakte VFE-Berechnung nach BGH-Methode (Aktiv-Passiv)",vfeF2:"§ 489 BGB: kostenlose Kündigung nach 10 Jahren automatisch geprüft",vfeF3:"Tilgungsplan ab Kündigungstermin",vfeF4:"Sondertilgung berücksichtigt",vfeF5:"Wiederanlagezins (Pfandbrief) immer tagesaktuell",vfeF6:"Daten direkt aus Kreditrechner übernehmen",vfeCta:"Vorfälligkeit jetzt berechnen",footerNote:"Immofuchs ist ein unabhängiges, kostenloses Tool für private Immobilieninvestoren in Deutschland. Alle Berechnungen basieren auf aktuellen Gesetzen und Marktdaten. Keine Rechts- oder Steuerberatung.",footerCr:"© 2026 immofuchs.info",imp:"Impressum",dse:"Datenschutz",ratesCompact:"Bauzinsen Ø",ratesTip:"Marktindikation für 10 Jahre Zinsbindung. Quellen: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank. Stand Mai 2026.",ratesShort:"Topzins",ratesShort3:"BBank 10J",tagFull:"Kostenlos · Ohne Anmeldung · Aktuell",ctaPrimary:"Rechner öffnen",ctaSecondary:"Wie es funktioniert",heroEyebrow:"KOSTENLOS · LIVE-BAUZINSEN · KEINE ANMELDUNG",heroSubShort:"Professionelle Rechner. Sofort. Ohne Anmeldung.",navRechner:"Rechner",navBauzinsen:"Bauzinsen",navFaq:"So funktioniert's",trustHead:"Warum Immofuchs?",trust1H:"Rechtskonform",trust1P:"§ 558 BGB, GEG, GrEStG — alle Berechnungen nach geltendem deutschem Recht.",trust2H:"Datenschutz DE",trust2P:"Hosting in Deutschland. Keine Tracker, keine Cookies, kein Login.",trust3H:"Keine Anmeldung",trust3P:"Sofort starten. Daten bleiben im Browser, nichts wird gespeichert.",trust4H:"Aktuelle Daten",trust4P:"Bauzinsen monatlich aktualisiert, alle Werte aus offiziellen Quellen.",howShort:"In 3 Schritten zum Ergebnis",navHow:"So funktioniert's",navZinsen:"Bauzinsen",subShort:"Kostenlose Rechner für Kapitalanleger und Vermieter in Deutschland — Rendite, Finanzierung, Mietrecht, Sanierung. Sofort, in Echtzeit, ohne Anmeldung.",heroCtaPrimary:"Jetzt rechnen",heroCtaSecondary:"Wie funktioniert's?",heroBadgeLive:"Live-Daten",trust1:"100% kostenlos",trust2:"Keine Anmeldung",trust3:"DSGVO-konform",trust4:"Aktuelle Marktdaten",cardsSub:"Spezialisierte Rechner für jede Situation",dataEyebrow:"Keine Schätzungen",dataTitle:"Echte Marktdaten. Durchdachte Rechner.",dataSub:"Während andere Rechner mit fixen Beispielwerten arbeiten, zieht Immofuchs aktuelle Marktdaten automatisch ein — ohne dass du etwas eingeben musst.",dataStand:"Alle Werte monatlich geprüft — Datenstand:",usp2H:"Rechtsbezug eingebaut",usp2P:"§ 558 BGB, § 7 EStG, GEG 2024 — alle relevanten Gesetze direkt in jeder Berechnung.",usp4H:"Sofort starten",usp4P:"Kein Download, kein Login. Einfach öffnen und rechnen — alle Felder sind mit realistischen Werten vorbelegt.",usp5H:"100 % privat",usp5P:"Alle Berechnungen laufen im Browser. Keine Server, kein Tracking, keine Werbung, keine Anmeldung.",usp6H:"5 Sprachen · PDF-Export",usp6P:"DE, EN, TR, ZH, HI verfügbar. Alle Ergebnisse als PDF speicherbar.",dc1L:"Bauzinsen Ø",dc1S:"10 Jahre Zinsbindung",dc2L:"Mietpreisprognose",dc2S:"Stat. Bundesamt",dc3L:"Wertsteigerung",dc3S:"Marktprognose",dc4L:"Grunderwerbsteuer",dc4S:"3,5 % – 6,5 %",dc4V:"je Bundesland",dc5L:"Kappungsgrenzen",dc5S:"15 % / 20 % auto",dc5V:"500+ Städte",dc6L:"KfW BEG Förderung",dc6S:"der Investitionskosten",dc6V:"bis 70 %",dc7L:"CO₂-Preis",dc7S:"Umweltbundesamt",dc7V:"55 €/Tonne",dc8L:"AfA-Satz",dc8S:"§ 7 EStG",dc8V:"2 %",dc9L:"BAFA Förderung",dc9S:"BEG Einzelmaßnahmen",dc9V:"aktiv",alarmTitle:"Zinsalarm",alarmSub:"Push-Alarm wenn Zinsen fallen",alarmThreshold:"Schwellenwert",alarmBtn:"Alarm aktivieren",alarmBtnOff:"Alarm deaktivieren",alarmTriggered:"Schwellenwert unterschritten!",alarmPermission:"Benachrichtigungen erlauben",alarmGranted:"✓ Benachrichtigungen aktiv",alarmDenied:"Benachrichtigungen blockiert",alarmSaved:"Gespeichert",alarmHint:"ImmoFuchs zeigt Durchschnittszinsen anhand öffentlicher Quellen (Bundesbank, Interhyp, Dr. Klein u.a.). Keine Gewähr. Keine Anlageberatung.",notifTitle:"ImmoFuchs Zinsalarm",notifBody:"Zinsen bei {avg}% – unter Schwellenwert {threshold}%"},
  en:{h1a:"Analyze real estate ",h1b:"smartly.",h1c:" Know the yield. Decide right.",sub:"Professional calculators for investors and landlords in Germany. Yield, financing, rent law and renovation – instant, real-time, free.",mockKauf:"PURCHASE PRICE",mockMiete:"MONTHLY RENT",mockZins:"INTEREST RATE",mockEK:"OWN CAPITAL",mockBrutto:"GROSS YIELD",mockNetto:"NET YIELD",mockRate:"Monthly Payment",mockRateSub:"incl. 2 % repayment",mockCF:"Monthly Cashflow",mockCFSub:"after costs & rate",mockChart:"CASHFLOW CHART",ratesTitle:"Current Mortgage Rates",ratesDisclaim:"All data without warranty. Individual terms may vary.",ratesStand:"As of",ratesIntro1:"The 10-year German government bond (BBK01.WT1010) currently stands at",ratesIntro2:"Mortgage rates for 10-year fixed periods, market overview:",ratesSoll:"nominal",ratesAb:"from approx.",ratesSources:"Sources",cardsTitle:"Choose your calculator",uspTitle:"What makes Immofuchs special",uspSub:"More than just a calculator",usp1H:"Daily market data",usp1P:"Bundesbank yields, mortgage rates and BEG subsidy quotas integrated automatically — no manual lookup needed.",usp3H:"State-specific",usp3P:"Real estate transfer tax, rent caps (15 %/20 %) and state development banks applied automatically by location.",howTitle:"How it works",step1H:"Choose calculator",step1P:"Choose the right calculator — yield, loan, rent or renovation.",step2H:"Enter data",step2P:"Purchase price, rent, interest rate — all fields are pre-filled with realistic values.",step3H:"Instant results",step3P:"All results update in real time. No signup, no waiting, no cost.",fullTitle:"Yield Calculator",fullBadge:"Yield",fullDesc:"The most comprehensive calculator: yield, cashflow, tax benefits, rent law and risk analysis in one.",fullF1:"Gross & net rental yield",fullF2:"Sale scenario after X years",fullF3:"AfA & tax benefits (§ 7 EStG)",fullF4:"Rent increase plan (§ 558 BGB)",fullF5:"Risk analysis & quick check",fullF6:"ZIP code autocomplete",fullCta:"Open yield calculator",finTitle:"Loan Calculator",finBadge:"Financing",finDesc:"Monthly payment, full amortization schedule and remaining debt after fixed rate period – fast and precise.",finF1:"Monthly annuity",finF2:"Extra payments & duration",finF3:"Loan-to-value ratio (LTV)",finF4:"Remaining debt after fixed period",finF5:"Repayment comparison",finF6:"Purchase side costs",finCta:"Open loan calculator",rentTitle:"Rent Increase",rentBadge:"Rent law",rentDesc:"When is the next rent increase possible, how much may it be and how does the rent develop?",rentF1:"Next date (§ 558 BGB)",rentF2:"Rent cap 15/20 % auto",rentF3:"Reference rent as ceiling",rentF4:"Forecast up to 20 years",rentF5:"Over 200 cities recognized",rentF6:"Legal foundations",rentCta:"Open rent increase",sanTitle:"Renovation Calculator",sanBadge:"Renovation",sanDesc:"Calculate costs, BEG subsidies, CO₂ savings and payback period for energy-efficient renovation.",sanF1:"Windows, facade, roof, heating",sanF2:"Up to 70 % BEG subsidy",sanF3:"Energy class before/after",sanF4:"CO₂ reduction",sanF5:"Payback calculation",sanF6:"PV, battery & wallbox",sanCta:"Open renovation calculator",st6Title:"Tax Optimisation §6",st6Badge:"Tax",st6Desc:"Reverse calculation: What renovation costs and purchase price do you need to reduce your income tax to zero?",st6F1:"Reverse tax saving calculation",st6F2:"§ 6 Para. 1 No. 1a EStG-compliant",st6F3:"Building value & total purchase price",st6F4:"15 % threshold automatic",st6F5:"3 % safety buffer",st6F6:"All marginal tax rates incl. SolZ",st6Cta:"Calculate §6 trick",vfe:"VFE",vfeTitle:"Prepayment Penalty",vfeBadge:"PREPAYMENT PENALTY",vfeDesc:"What does early loan repayment cost? BGH-compliant calculation including § 489 check and amortization plan.",vfeF1:"Interest loss calculation",vfeF2:"§ 489 BGB – free cancellation after 10 years",vfeF3:"Amortization plan from cancellation date",vfeF4:"Extra repayments included",vfeF5:"Auto-fill from loan calculator",vfeF6:"BGH ruling AZ: XI ZR 285/03",vfeCta:"Calculate prepayment",footerNote:"Immofuchs is an independent, free tool for private real estate investors in Germany. All calculations are based on current laws and market data. No legal or tax advice.",footerCr:"© 2026 immofuchs.info",imp:"Legal Notice",dse:"Privacy",ratesCompact:"Avg. mortgage rate",ratesTip:"Market indication for 10-year fixed periods. Sources: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank. As of May 2026.",ratesShort:"Top rate",ratesShort3:"BBank 10Y",tagFull:"Free · No Signup · Live data",ctaPrimary:"Open calculator",ctaSecondary:"How it works",heroEyebrow:"FREE · LIVE RATES · NO SIGNUP",heroSubShort:"Professional calculators. Instant. No signup.",navRechner:"Calculators",navBauzinsen:"Mortgage rates",navFaq:"How it works",trustHead:"Why Immofuchs?",trust1H:"Legally compliant",trust1P:"§ 558 BGB, GEG, GrEStG — all calculations follow German law.",trust2H:"German data protection",trust2P:"German hosting. No trackers, no cookies, no login.",trust3H:"No signup",trust3P:"Start immediately. Data stays in your browser, nothing is stored.",trust4H:"Up-to-date data",trust4P:"Mortgage rates updated monthly, all values from official sources.",howShort:"3 steps to your result",navHow:"How it works",navZinsen:"Mortgage rates",subShort:"Free calculators for investors and landlords in Germany — yield, financing, tenancy law, renovation. Instant, real-time, no signup.",heroCtaPrimary:"Start calculating",heroCtaSecondary:"How does it work?",heroBadgeLive:"Live data",trust1:"100% free",trust2:"No signup",trust3:"GDPR-compliant",trust4:"Live market data",cardsSub:"Specialized calculators for every situation",dataEyebrow:"No estimates",dataTitle:"Real market data. Thoughtful calculators.",dataSub:"While other calculators use fixed example values, Immofuchs automatically pulls in current market data — without you having to enter anything.",dataStand:"All values checked monthly — data as of:",usp2H:"Legal reference built-in",usp2P:"§ 558 BGB, § 7 EStG, GEG 2024 — all relevant laws directly in every calculation.",usp4H:"Start instantly",usp4P:"No download, no login. Just open and calculate — all fields are pre-filled with realistic values.",usp5H:"100 % private",usp5P:"All calculations run in the browser. No server, no tracking, no ads, no signup.",usp6H:"5 languages · PDF export",usp6P:"DE, EN, TR, ZH, HI available. All results saveable as PDF.",dc1L:"Avg. mortgage rate",dc1S:"10-year fixed period",dc2L:"Rent price forecast",dc2S:"Federal Stat. Office",dc3L:"Appreciation",dc3S:"Market forecast",dc4L:"Transfer tax",dc4S:"3.5 % – 6.5 %",dc4V:"by federal state",dc5L:"Rent caps",dc5S:"15 % / 20 % auto",dc5V:"500+ cities",dc6L:"KfW BEG subsidy",dc6S:"of investment costs",dc6V:"up to 70 %",dc7L:"CO₂ price",dc7S:"Fed. Environment Agency",dc7V:"€55/tonne",dc8L:"Depreciation rate",dc8S:"§ 7 EStG",dc8V:"2 %",dc9L:"BAFA subsidy",dc9S:"BEG single measures",dc9V:"active",alarmTitle:"Rate Alert",alarmSub:"Push alert when interest rates drop",alarmThreshold:"Threshold",alarmBtn:"Activate alert",alarmBtnOff:"Deactivate alert",alarmTriggered:"Threshold reached!",alarmPermission:"Allow notifications",alarmGranted:"✓ Notifications active",alarmDenied:"Notifications blocked",alarmSaved:"Saved",alarmHint:"ImmoFuchs shows average mortgage rates from public sources (Bundesbank, Interhyp, Dr. Klein, etc.). No guarantee of accuracy. Not financial advice.",notifTitle:"ImmoFuchs Rate Alert",notifBody:"Rates at {avg}% – below your threshold of {threshold}%"},
  tr:{h1a:"Gayrimenkulü ",h1b:"akıllıca analiz edin.",h1c:" Getiriyi bilin. Doğru karar verin.",sub:"Almanya'daki yatırımcılar ve ev sahipleri için profesyonel hesaplayıcılar. Getiri, finansman, kira hukuku ve yenileme – anında, gerçek zamanlı, ücretsiz.",mockKauf:"ALIM FİYATI",mockMiete:"AYLIK KİRA",mockZins:"FAİZ ORANI",mockEK:"ÖZ SERMAYE",mockBrutto:"BRÜT GETİRİ",mockNetto:"NET GETİRİ",mockRate:"Aylık Ödeme",mockRateSub:"% 2 itfa dahil",mockCF:"Aylık Nakit Akışı",mockCFSub:"masraflar ve taksit sonrası",mockChart:"NAKİT AKIŞI GRAFİĞİ",ratesTitle:"Güncel İpotek Faizleri",ratesDisclaim:"Tüm bilgiler garantisizdir. Bireysel koşullar değişebilir.",ratesStand:"Tarih",ratesIntro1:"10 yıllık Alman tahvili (BBK01.WT1010) şu anda",ratesIntro2:"10 yıllık sabit faiz dönemi için ipotek faizleri pazar genel görünümü:",ratesSoll:"nominal",ratesAb:"yaklaşık",ratesSources:"Kaynaklar",cardsTitle:"Hesaplayıcınızı seçin",uspTitle:"Immofuchs'u özel kılan nedir",uspSub:"Sadece bir hesaplayıcıdan fazlası",usp1H:"Günlük piyasa verileri",usp1P:"Bundesbank getirileri, ipotek oranları ve BEG sübvansiyon kotaları otomatik entegre edilmiştir.",usp3H:"Eyalete özel",usp3P:"Emlak vergisi, kira sınırları (%15/%20) ve eyalet bankaları konuma göre otomatik uygulanır.",howTitle:"Nasıl çalışır",step1H:"Hesaplayıcı seçin",step1P:"Uygun hesaplayıcıyı seçin — getiri, kredi, kira veya yenileme.",step2H:"Veri girin",step2P:"Alım fiyatı, kira, faiz — tüm alanlar gerçekçi değerlerle önceden doldurulmuştur.",step3H:"Anında sonuçlar",step3P:"Tüm sonuçlar gerçek zamanlı güncellenir. Kayıt, bekleme veya maliyet yoktur.",fullTitle:"Getiri Hesaplayıcı",fullBadge:"Getiri",fullDesc:"En kapsamlı hesaplayıcı: getiri, nakit akışı, vergi avantajları, kira hukuku ve risk analizi.",fullF1:"Brüt ve net kira getirisi",fullF2:"X yıl sonra satış senaryosu",fullF3:"AfA ve vergi avantajları",fullF4:"Kira artış planı",fullF5:"Risk analizi ve hızlı kontrol",fullF6:"PLZ otomatik tamamlama",fullCta:"Getiri hesaplayıcıyı aç",finTitle:"Kredi Hesaplayıcı",finBadge:"Finansman",finDesc:"Aylık ödeme, tam itfa planı ve sabit faiz dönemi sonrası kalan borç.",finF1:"Aylık yıllık gelir",finF2:"Ek ödemeler ve süre",finF3:"Kredi-değer oranı (LTV)",finF4:"Sabit dönem sonrası kalan borç",finF5:"Geri ödeme karşılaştırması",finF6:"Alım yan maliyetleri",finCta:"Kredi hesaplayıcıyı aç",rentTitle:"Kira Artışı",rentBadge:"Kira hukuku",rentDesc:"Bir sonraki kira artışı ne zaman mümkün, ne kadar yapılabilir ve kira nasıl gelişir?",rentF1:"Sonraki tarih (§ 558 BGB)",rentF2:"Kira sınırı %15/%20 otomatik",rentF3:"Referans kira tavan olarak",rentF4:"20 yıla kadar tahmin",rentF5:"200'den fazla şehir",rentF6:"Yasal temeller",rentCta:"Kira artışını aç",sanTitle:"Yenileme Hesaplayıcı",sanBadge:"Yenileme",sanDesc:"Enerji verimli yenileme için maliyetler, BEG sübvansiyonu, CO₂ tasarrufu ve geri ödeme süresi hesaplayın.",sanF1:"Pencere, cephe, çatı, ısıtma",sanF2:"% 70'e kadar BEG sübvansiyonu",sanF3:"Önce/sonra enerji sınıfı",sanF4:"CO₂ azaltımı",sanF5:"Geri ödeme hesaplaması",sanF6:"PV, batarya ve wallbox",sanCta:"Yenileme hesaplayıcıyı aç",st6Title:"Vergi Optimizasyonu §6",st6Badge:"Vergi",st6Desc:"Geriye doğru hesaplama: Gelir vergisini sıfıra indirmek için hangi yenileme maliyetleri ve alım fiyatı gerekir?",st6F1:"Vergi tasarrufu geriye doğru hesaplama",st6F2:"§ 6 Fıkra 1 No. 1a EStG uyumlu",st6F3:"Bina değeri ve toplam alım fiyatı",st6F4:"% 15 eşiği otomatik",st6F5:"% 3 güvenlik tamponu",st6F6:"Tüm marjinal vergi oranları SolZ dahil",st6Cta:"§6 hilesini hesapla",vfe:"VFE",vfeTitle:"Erken Ödeme Hesaplayıcı",vfeBadge:"ERKEN ÖDEME CEZASI",vfeDesc:"Kredinizin erken kapatılması ne kadara mal olur? BGH uyumlu hesaplama.",vfeF1:"Faiz kaybı hesaplaması",vfeF2:"§ 489 BGB – 10 yıl sonra ücretsiz iptal",vfeF3:"İptal tarihinden itibaren amortisman planı",vfeF4:"Ek ödemeler dahil",vfeF5:"Kredi hesaplayıcıdan otomatik doldurma",vfeF6:"BGH kararı AZ: XI ZR 285/03",vfeCta:"Erken ödemeyi hesapla",footerNote:"Immofuchs Almanya'daki özel gayrimenkul yatırımcıları için bağımsız, ücretsiz bir araçtır. Hukuki veya vergi danışmanlığı değildir.",footerCr:"© 2026 immofuchs.info",imp:"Künye",dse:"Gizlilik",ratesCompact:"Ort. ipotek faizi",ratesTip:"10 yıllık sabit faiz dönemi piyasa göstergesi. Kaynaklar: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank. Mayıs 2026.",ratesShort:"En iyi",ratesShort3:"BBank 10Y",tagFull:"Ücretsiz · Kayıtsız · Güncel",ctaPrimary:"Hesaplayıcıyı aç",ctaSecondary:"Nasıl çalışır",heroEyebrow:"ÜCRETSİZ · CANLI FAİZLER · KAYIT YOK",heroSubShort:"Profesyonel hesaplayıcılar. Anında. Kayıt yok.",navRechner:"Hesaplayıcılar",navBauzinsen:"İpotek faizi",navFaq:"Nasıl çalışır",trustHead:"Neden Immofuchs?",trust1H:"Hukuka uygun",trust1P:"§ 558 BGB, GEG, GrEStG — tüm hesaplamalar Alman hukukuna göre.",trust2H:"Alman veri koruma",trust2P:"Almanya'da barındırma. İzleyici, çerez veya giriş yok.",trust3H:"Kayıt yok",trust3P:"Hemen başlayın. Veriler tarayıcınızda kalır, hiçbir şey saklanmaz.",trust4H:"Güncel veriler",trust4P:"İpotek faizleri aylık güncellenir, resmi kaynaklardan.",howShort:"3 adımda sonuç",navHow:"Nasıl çalışır",navZinsen:"İpotek faizleri",subShort:"Almanya'daki yatırımcılar ve ev sahipleri için ücretsiz hesaplayıcılar.",heroCtaPrimary:"Hesaplamaya başla",heroCtaSecondary:"Nasıl çalışır?",heroBadgeLive:"Canlı veri",trust1:"100% ücretsiz",trust2:"Kayıt yok",trust3:"GDPR uyumlu",trust4:"Canlı piyasa verileri",cardsSub:"Her durum için uzman hesaplayıcılar",dataEyebrow:"Tahmin yok",dataTitle:"Gerçek piyasa verileri. Akıllı hesaplayıcılar.",dataSub:"Diğer hesaplayıcılar sabit örnek değerler kullanırken Immofuchs güncel piyasa verilerini otomatik olarak çeker — hiçbir şey girmene gerek yok.",dataStand:"Tüm değerler aylık kontrol edilir — veri tarihi:",usp2H:"Hukuki referans yerleşik",usp2P:"§ 558 BGB, § 7 EStG, GEG 2024 — tüm ilgili yasalar her hesaplamada doğrudan.",usp4H:"Hemen başla",usp4P:"İndirme veya giriş gerekmez. Sadece aç ve hesapla — tüm alanlar gerçekçi değerlerle dolu.",usp5H:"%100 özel",usp5P:"Tüm hesaplamalar tarayıcıda çalışır. Sunucu, takip, reklam veya kayıt yok.",usp6H:"5 dil · PDF dışa aktarma",usp6P:"DE, EN, TR, ZH, HI mevcut. Tüm sonuçlar PDF olarak kaydedilebilir.",dc1L:"Ort. ipotek faizi",dc1S:"10 yıl sabit dönem",dc2L:"Kira fiyat tahmini",dc2S:"Federal İst. Ofisi",dc3L:"Değer artışı",dc3S:"Piyasa tahmini",dc4L:"Tapu vergisi",dc4S:"%3,5 – %6,5",dc4V:"eyalete göre",dc5L:"Kira tavanları",dc5S:"%15 / %20 otomatik",dc5V:"500+ şehir",dc6L:"KfW BEG teşvik",dc6S:"yatırım maliyetinin",dc6V:"%70'e kadar",dc7L:"CO₂ fiyatı",dc7S:"Federal Çevre Ajansı",dc7V:"55 €/ton",dc8L:"Amortisman oranı",dc8S:"§ 7 EStG",dc8V:"%2",dc9L:"BAFA teşvik",dc9S:"BEG tekil önlemler",dc9V:"aktif",alarmTitle:"Faiz Alarmı",alarmSub:"Faizler düştüğünde bildirim",alarmThreshold:"Eşik değer",alarmBtn:"Alarmı etkinleştir",alarmBtnOff:"Alarmı devre dışı bırak",alarmTriggered:"Eşik değer aşıldı!",alarmPermission:"Bildirimlere izin ver",alarmGranted:"✓ Bildirimler aktif",alarmDenied:"Bildirimler engellendi",alarmSaved:"Kaydedildi",alarmHint:"ImmoFuchs, kamuya açık kaynaklara dayanarak ortalama faiz oranlarını gösterir. Garanti verilmez. Yatırım tavsiyesi değildir.",notifTitle:"ImmoFuchs Faiz Alarmı",notifBody:"Faiz {avg}% – eşik değeriniz {threshold}% altında"},
  zh:{h1a:"智能",h1b:"分析房地产。",h1c:" 了解收益。正确决策。",sub:"德国投资者和房东的专业计算器。收益、融资、租赁法和装修 – 即时、实时、免费。",mockKauf:"购买价格",mockMiete:"月租金",mockZins:"利率",mockEK:"自有资金",mockBrutto:"毛收益",mockNetto:"净收益",mockRate:"月供",mockRateSub:"含 2% 还款",mockCF:"月现金流",mockCFSub:"扣除成本和月供后",mockChart:"现金流图表",ratesTitle:"当前抵押贷款利率",ratesDisclaim:"所有数据无担保。个人条件可能有所不同。",ratesStand:"截至",ratesIntro1:"10年期德国国债（BBK01.WT1010）目前为",ratesIntro2:"10年固定利率期间的抵押贷款利率市场概况：",ratesSoll:"标定利率",ratesAb:"从约",ratesSources:"来源",cardsTitle:"选择您的计算器",uspTitle:"Immofuchs 的特别之处",uspSub:"不仅仅是一个计算器",usp1H:"每日市场数据",usp1P:"联邦银行收益率、抵押贷款利率和 BEG 补贴配额自动集成。",usp3H:"州专属",usp3P:"房地产转让税、租金上限（15%/20%）和州开发银行按地区自动应用。",howTitle:"工作原理",step1H:"选择计算器",step1P:"选择合适的计算器 — 收益、贷款、租金或装修。",step2H:"输入数据",step2P:"购买价格、租金、利率 — 所有字段都预填了实际值。",step3H:"即时结果",step3P:"所有结果实时更新。无需注册、等待或付费。",fullTitle:"收益计算器",fullBadge:"收益",fullDesc:"最全面的计算器：收益、现金流、税收优惠、租赁法和风险分析。",fullF1:"毛租金收益和净租金收益",fullF2:"X 年后销售场景",fullF3:"AfA 和税收优惠",fullF4:"租金增加计划",fullF5:"风险分析和快速检查",fullF6:"邮编自动完成",fullCta:"打开收益计算器",finTitle:"贷款计算器",finBadge:"融资",finDesc:"月供、完整摊销计划和固定期后剩余债务。",finF1:"月年金",finF2:"额外付款和期限",finF3:"贷款价值比 (LTV)",finF4:"固定期后剩余债务",finF5:"还款比较",finF6:"购买附带成本",finCta:"打开贷款计算器",rentTitle:"租金上涨",rentBadge:"租赁法",rentDesc:"下次租金上涨何时可能，可以上涨多少，租金如何发展？",rentF1:"下次日期（§ 558 BGB）",rentF2:"租金上限 15%/20% 自动",rentF3:"参考租金作为上限",rentF4:"最多 20 年预测",rentF5:"识别 200 多个城市",rentF6:"法律基础",rentCta:"打开租金上涨",sanTitle:"装修计算器",sanBadge:"装修",sanDesc:"计算节能装修的成本、BEG 补贴、CO₂ 节省和回本期。",sanF1:"窗户、外墙、屋顶、供暖",sanF2:"高达 70% BEG 补贴",sanF3:"前/后能源等级",sanF4:"CO₂ 减排",sanF5:"回本计算",sanF6:"PV、电池和壁挂充电器",sanCta:"打开装修计算器",st6Title:"税务优化 §6",st6Badge:"税务",st6Desc:"逆向计算：您需要多少改建费用和购买价格才能将所得税降至零？",st6F1:"逆向计算节税金额",st6F2:"符合§6第1款第1a项EStG",st6F3:"建筑价值与总购价",st6F4:"自动计算15%阈值",st6F5:"3%安全缓冲",st6F6:"含附加税的所有边际税率",st6Cta:"计算§6技巧",vfe:"VFE",vfeTitle:"提前还款计算器",vfeBadge:"提前还款罚金",vfeDesc:"提前偿还贷款的费用是多少？符合BGH标准的计算，包含§489检查和摊销计划。",vfeF1:"利息损失计算",vfeF2:"§ 489 BGB – 10年后免费取消",vfeF3:"从取消日期起的摊销计划",vfeF4:"包含额外还款",vfeF5:"从贷款计算器自动填入",vfeF6:"BGH判决 AZ: XI ZR 285/03",vfeCta:"计算提前还款",footerNote:"Immofuchs 是德国私人房地产投资者的独立免费工具。不提供法律或税务建议。",footerCr:"© 2026 immofuchs.info",imp:"法律声明",dse:"隐私",ratesCompact:"平均抵押利率",ratesTip:"10年固定利率期间市场指示。来源：Dr. Klein、Vergleich.de、Finanztip、Finanzfacts、Interhyp、德国联邦银行。2026 年 4 月。",ratesShort:"最优",ratesShort3:"联邦债券 10年",tagFull:"免费 · 无需注册 · 实时",ctaPrimary:"打开计算器",ctaSecondary:"工作原理",heroEyebrow:"免费 · 实时利率 · 无需注册",heroSubShort:"专业计算器。即时。无需注册。",navRechner:"计算器",navBauzinsen:"贷款利率",navFaq:"工作原理",trustHead:"为什么选择 Immofuchs？",trust1H:"合法合规",trust1P:"§ 558 BGB、GEG、GrEStG — 所有计算遵循德国法律。",trust2H:"德国数据保护",trust2P:"德国托管。无追踪器、无 Cookies、无登录。",trust3H:"无需注册",trust3P:"立即开始。数据保留在浏览器中，不会存储。",trust4H:"最新数据",trust4P:"贷款利率每月更新，所有数据来自官方来源。",howShort:"3 步获得结果",navHow:"工作原理",navZinsen:"抵押利率",subShort:"为德国投资者和房东提供免费计算器——回报、融资、租赁法、装修。即时、实时、无需注册。",heroCtaPrimary:"开始计算",heroCtaSecondary:"如何工作？",heroBadgeLive:"实时数据",trust1:"100% 免费",trust2:"无需注册",trust3:"符合 GDPR",trust4:"实时市场数据",cardsSub:"针对每种情况的专业计算器",dataEyebrow:"无估算",dataTitle:"真实市场数据。精心设计的计算器。",dataSub:"其他计算器使用固定示例值，而Immofuchs自动引入当前市场数据——无需手动输入。",dataStand:"所有数值每月核查——数据截至：",usp2H:"内置法律参考",usp2P:"§ 558 BGB、§ 7 EStG、GEG 2024 — 所有相关法律直接纳入每次计算。",usp4H:"立即开始",usp4P:"无需下载或登录。直接打开并计算——所有字段已预填实际值。",usp5H:"100% 私密",usp5P:"所有计算仅在浏览器中运行。没有服务器、跟踪、广告或注册。",usp6H:"5种语言 · PDF导出",usp6P:"提供DE、EN、TR、ZH、HI。所有结果可保存为PDF。",dc1L:"平均抵押利率",dc1S:"10年固定期",dc2L:"租金价格预测",dc2S:"联邦统计局",dc3L:"增值率",dc3S:"市场预测",dc4L:"房产转让税",dc4S:"3.5% – 6.5%",dc4V:"按联邦州",dc5L:"租金上限",dc5S:"15% / 20% 自动",dc5V:"500+ 城市",dc6L:"KfW BEG 补贴",dc6S:"投资成本的",dc6V:"高达 70%",dc7L:"CO₂价格",dc7S:"联邦环境署",dc7V:"55欧元/吨",dc8L:"折旧率",dc8S:"§ 7 EStG",dc8V:"2%",dc9L:"BAFA补贴",dc9S:"BEG单项措施",dc9V:"有效",alarmTitle:"利率警报",alarmSub:"利率下降时推送通知",alarmThreshold:"阈值",alarmBtn:"启用警报",alarmBtnOff:"停用警报",alarmTriggered:"已触发阈值！",alarmPermission:"允许通知",alarmGranted:"✓ 通知已激活",alarmDenied:"通知已被屏蔽",alarmSaved:"已保存",alarmHint:"ImmoFuchs根据公开来源显示平均利率。不对准确性提供保证。非投资建议。",notifTitle:"ImmoFuchs利率警报",notifBody:"利率{avg}% – 低于阈值{threshold}%"},
  hi:{h1a:"रियल एस्टेट का ",h1b:"बुद्धिमानी से विश्लेषण करें।",h1c:" रिटर्न जानें। सही निर्णय लें।",sub:"जर्मनी में निवेशकों और मकान मालिकों के लिए पेशेवर कैलकुलेटर। रिटर्न, वित्तपोषण, किराया कानून और नवीनीकरण – तुरंत, रीयल-टाइम, मुफ्त।",mockKauf:"खरीद मूल्य",mockMiete:"मासिक किराया",mockZins:"ब्याज दर",mockEK:"स्वपूंजी",mockBrutto:"सकल रिटर्न",mockNetto:"शुद्ध रिटर्न",mockRate:"मासिक किस्त",mockRateSub:"2% चुकौती सहित",mockCF:"मासिक नकदी प्रवाह",mockCFSub:"लागत व किस्त के बाद",mockChart:"नकदी प्रवाह चार्ट",ratesTitle:"वर्तमान होम लोन दरें",ratesDisclaim:"सभी डेटा बिना गारंटी। व्यक्तिगत शर्तें भिन्न हो सकती हैं।",ratesStand:"तिथि",ratesIntro1:"10 वर्ष का जर्मन सरकारी बॉन्ड (BBK01.WT1010) वर्तमान में है",ratesIntro2:"10 वर्ष निश्चित दर अवधि के लिए होम लोन दरें बाज़ार अवलोकन:",ratesSoll:"नाममात्र",ratesAb:"लगभग",ratesSources:"स्रोत",cardsTitle:"अपना कैलकुलेटर चुनें",uspTitle:"Immofuchs को क्या खास बनाता है",uspSub:"केवल एक कैलकुलेटर से अधिक",usp1H:"दैनिक बाजार डेटा",usp1P:"बुंडेसबैंक रिटर्न, होम लोन दरें और BEG सब्सिडी कोटा स्वचालित रूप से एकीकृत।",usp3H:"राज्य-विशिष्ट",usp3P:"रियल एस्टेट हस्तांतरण कर, किराया सीमा और राज्य विकास बैंक स्थान के अनुसार स्वचालित रूप से लागू।",howTitle:"यह कैसे काम करता है",step1H:"कैलकुलेटर चुनें",step1P:"सही कैलकुलेटर चुनें — रिटर्न, ऋण, किराया या नवीनीकरण।",step2H:"डेटा दर्ज करें",step2P:"खरीद मूल्य, किराया, ब्याज — सभी फ़ील्ड यथार्थवादी मानों के साथ पूर्व-भरे हुए हैं।",step3H:"तुरंत परिणाम",step3P:"सभी परिणाम रीयल-टाइम में अपडेट होते हैं। पंजीकरण, प्रतीक्षा या लागत नहीं।",fullTitle:"रिटर्न कैलकुलेटर",fullBadge:"रिटर्न",fullDesc:"सबसे व्यापक कैलकुलेटर: रिटर्न, नकदी प्रवाह, कर लाभ, किराया कानून और जोखिम विश्लेषण।",fullF1:"सकल और शुद्ध किराया रिटर्न",fullF2:"X वर्षों के बाद बिक्री परिदृश्य",fullF3:"AfA और कर लाभ",fullF4:"किराया वृद्धि योजना",fullF5:"जोखिम विश्लेषण और त्वरित जांच",fullF6:"पिन कोड स्वत: पूर्णता",fullCta:"रिटर्न कैलकुलेटर खोलें",finTitle:"ऋण कैलकुलेटर",finBadge:"वित्तपोषण",finDesc:"मासिक भुगतान, पूर्ण परिशोधन योजना और निश्चित अवधि के बाद शेष ऋण।",finF1:"मासिक वार्षिकी",finF2:"अतिरिक्त भुगतान और अवधि",finF3:"ऋण-मूल्य अनुपात (LTV)",finF4:"निश्चित अवधि के बाद शेष ऋण",finF5:"भुगतान तुलना",finF6:"खरीद पक्ष लागत",finCta:"ऋण कैलकुलेटर खोलें",rentTitle:"किराया वृद्धि",rentBadge:"किराया कानून",rentDesc:"अगली किराया वृद्धि कब संभव है, कितना हो सकता है और किराया कैसे विकसित होता है?",rentF1:"अगली तिथि (§ 558 BGB)",rentF2:"किराया सीमा 15/20% ऑटो",rentF3:"संदर्भ किराया छत के रूप में",rentF4:"20 वर्षों तक पूर्वानुमान",rentF5:"200 से अधिक शहर पहचाने",rentF6:"कानूनी आधार",rentCta:"किराया वृद्धि खोलें",sanTitle:"नवीनीकरण कैलकुलेटर",sanBadge:"नवीनीकरण",sanDesc:"ऊर्जा-कुशल नवीनीकरण के लिए लागत, BEG सब्सिडी, CO₂ बचत और वापसी अवधि की गणना करें।",sanF1:"खिड़कियां, मुखौटा, छत, हीटिंग",sanF2:"70% तक BEG सब्सिडी",sanF3:"पहले/बाद ऊर्जा वर्ग",sanF4:"CO₂ कमी",sanF5:"वापसी गणना",sanF6:"PV, बैटरी और वॉलबॉक्स",sanCta:"नवीनीकरण कैलकुलेटर खोलें",st6Title:"कर अनुकूलन §6",st6Badge:"कर",st6Desc:"उल्टी गणना: आयकर शून्य करने के लिए कितना नवीनीकरण खर्च और खरीद मूल्य चाहिए?",st6F1:"कर बचत उल्टी गणना",st6F2:"§ 6 अनुच्छेद 1 नं. 1a EStG अनुपालक",st6F3:"भवन मूल्य और कुल खरीद मूल्य",st6F4:"15% सीमा स्वचालित",st6F5:"3% सुरक्षा बफर",st6F6:"SolZ सहित सभी सीमांत कर दरें",st6Cta:"§6 ट्रिक गणना करें",vfe:"VFE",vfeTitle:"अग्रिम भुगतान कैलकुलेटर",vfeBadge:"अग्रिम भुगतान",vfeDesc:"ऋण की समय-पूर्व अदायगी की लागत क्या है? BGH-अनुपालक गणना।",vfeF1:"ब्याज हानि गणना",vfeF2:"§ 489 BGB – 10 वर्ष बाद मुफ्त रद्दीकरण",vfeF3:"रद्दीकरण तिथि से परिशोधन योजना",vfeF4:"अतिरिक्त भुगतान शामिल",vfeF5:"ऋण कैलकुलेटर से स्वतः भरण",vfeF6:"BGH निर्णय AZ: XI ZR 285/03",vfeCta:"अग्रिम भुगतान गणना करें",footerNote:"Immofuchs जर्मनी में निजी रियल एस्टेट निवेशकों के लिए एक स्वतंत्र, मुफ्त उपकरण है। कानूनी या कर सलाह नहीं।",footerCr:"© 2026 immofuchs.info",imp:"कानूनी सूचना",dse:"गोपनीयता",ratesCompact:"औसत होम लोन दर",ratesTip:"10 वर्ष निश्चित दर अवधि बाज़ार संकेत। स्रोत: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank। मई 2026।",ratesShort:"सर्वोत्तम",ratesShort3:"BBank 10Y",tagFull:"मुफ्त · बिना पंजीकरण · वर्तमान",ctaPrimary:"कैलकुलेटर खोलें",ctaSecondary:"यह कैसे काम करता है",heroEyebrow:"मुफ्त · लाइव दरें · कोई पंजीकरण नहीं",heroSubShort:"पेशेवर कैलकुलेटर। तुरंत। बिना पंजीकरण।",navRechner:"कैलकुलेटर",navBauzinsen:"होम लोन दरें",navFaq:"कैसे काम करता है",trustHead:"Immofuchs क्यों?",trust1H:"कानूनी रूप से अनुपालन",trust1P:"§ 558 BGB, GEG, GrEStG — सभी गणनाएं जर्मन कानून के अनुसार।",trust2H:"जर्मन डेटा सुरक्षा",trust2P:"जर्मन होस्टिंग। कोई ट्रैकर नहीं, कुकीज़ नहीं, लॉगिन नहीं।",trust3H:"कोई पंजीकरण नहीं",trust3P:"तुरंत शुरू करें। डेटा आपके ब्राउज़र में रहता है, कुछ भी संग्रहीत नहीं।",trust4H:"अद्यतन डेटा",trust4P:"होम लोन दरें मासिक अपडेट, सभी मूल्य आधिकारिक स्रोतों से।",howShort:"3 चरणों में परिणाम",navHow:"यह कैसे काम करता है",navZinsen:"बंधक दरें",subShort:"जर्मनी में निवेशकों और मकान मालिकों के लिए मुफ्त कैलकुलेटर।",heroCtaPrimary:"गणना शुरू करें",heroCtaSecondary:"यह कैसे काम करता है?",heroBadgeLive:"लाइव डेटा",trust1:"100% मुफ़्त",trust2:"बिना पंजीकरण",trust3:"GDPR-अनुपालक",trust4:"लाइव बाज़ार डेटा",cardsSub:"हर स्थिति के लिए विशेष कैलकुलेटर",dataEyebrow:"कोई अनुमान नहीं",dataTitle:"वास्तविक बाजार डेटा। सुविचारित कैलकुलेटर।",dataSub:"जबकि अन्य कैलकुलेटर निश्चित उदाहरण मानों का उपयोग करते हैं, Immofuchs स्वचालित रूप से वर्तमान बाजार डेटा खींचता है।",dataStand:"सभी मान मासिक जांचे जाते हैं — डेटा स्थिति:",usp2H:"कानूनी संदर्भ अंतर्निहित",usp2P:"§ 558 BGB, § 7 EStG, GEG 2024 — सभी प्रासंगिक कानून हर गणना में।",usp4H:"तुरंत शुरू करें",usp4P:"कोई डाउनलोड या लॉगिन नहीं। बस खोलें और गणना करें।",usp5H:"100% निजी",usp5P:"सभी गणनाएं ब्राउज़र में चलती हैं। कोई सर्वर, ट्रैकिंग, विज्ञापन या पंजीकरण नहीं।",usp6H:"5 भाषाएं · PDF निर्यात",usp6P:"DE, EN, TR, ZH, HI उपलब्ध। सभी परिणाम PDF के रूप में सहेजे जा सकते हैं।",dc1L:"औसत बंधक दर",dc1S:"10 वर्ष निश्चित अवधि",dc2L:"किराया मूल्य पूर्वानुमान",dc2S:"संघीय सांख्यिकी कार्यालय",dc3L:"मूल्य वृद्धि",dc3S:"बाजार पूर्वानुमान",dc4L:"हस्तांतरण कर",dc4S:"3.5% – 6.5%",dc4V:"प्रत्येक राज्य के अनुसार",dc5L:"किराया सीमाएं",dc5S:"15% / 20% स्वचालित",dc5V:"500+ शहर",dc6L:"KfW BEG सब्सिडी",dc6S:"निवेश लागत का",dc6V:"70% तक",dc7L:"CO₂ मूल्य",dc7S:"संघीय पर्यावरण एजेंसी",dc7V:"55€/टन",dc8L:"मूल्यह्रास दर",dc8S:"§ 7 EStG",dc8V:"2%",dc9L:"BAFA सब्सिडी",dc9S:"BEG एकल उपाय",dc9V:"सक्रिय",alarmTitle:"ब्याज अलार्म",alarmSub:"ब्याज दरें गिरने पर सूचना",alarmThreshold:"सीमा",alarmBtn:"अलार्म सक्रिय करें",alarmBtnOff:"अलार्म निष्क्रिय करें",alarmTriggered:"सीमा पार हो गई!",alarmPermission:"सूचनाओं की अनुमति दें",alarmGranted:"✓ सूचनाएं सक्रिय",alarmDenied:"सूचनाएं अवरुद्ध हैं",alarmSaved:"सहेजा गया",alarmHint:"ImmoFuchs सार्वजनिक स्रोतों के आधार पर औसत ब्याज दरें दिखाता है। कोई गारंटी नहीं। निवेश सलाह नहीं।",notifTitle:"ImmoFuchs ब्याज अलार्म",notifBody:"ब्याज {avg}% – सीमा {threshold}% से नीचे"},
};

// Marktdaten → src/data.js


const Ctx=createContext();
const useApp=()=>useContext(Ctx);
const fmt=(v,d=0)=>(v==null||isNaN(v)||!isFinite(v))?"—":v.toLocaleString("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtE=v=>fmt(v)+" €";const fmtP=(v,d=1)=>fmt(v,d)+" %";
const tf=(tpl,vals)=>Object.entries(vals).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),tpl);
const LANG_LOCALE={de:"de-DE",en:"en-GB",tr:"tr-TR",zh:"zh-CN",hi:"hi-IN"};
const fmtDat=(d,lang="de")=>d instanceof Date?d.toLocaleDateString(LANG_LOCALE[lang]||"de-DE",{year:"numeric",month:"2-digit"}):"—";

// ── Ampelbewertung ───────────────────────────────────────────────────────────
// Gibt {color, dot} zurück. dot = farbiger Punkt-Indikator.
const AMPEL={
  bruttoR:   v=>v>=5?"#22c55e":v>=4?"#f59e0b":"#ef4444",
  nettoR:    v=>v>=3.5?"#22c55e":v>=2.5?"#f59e0b":"#ef4444",
  cfOhne:    v=>v>0?"#22c55e":v>=-100?"#f59e0b":"#ef4444",
  cfMit:     v=>v>0?"#22c55e":v>=-100?"#f59e0b":"#ef4444",
  bel:       v=>v<70?"#22c55e":v<85?"#f59e0b":"#ef4444",
  lz:        v=>!isFinite(v)||v>35?"#ef4444":v>25?"#f59e0b":"#22c55e",
};
function Dot({color}){return <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:color,marginLeft:5,flexShrink:0,verticalAlign:"middle"}} title={color==="#22c55e"?"Gut":color==="#f59e0b"?"Mittelmäßig":"Kritisch"}/>}
const addM=(d,m)=>{const r=new Date(d);r.setMonth(r.getMonth()+m);return r};
const addY=(d,y)=>{const r=new Date(d);r.setFullYear(r.getFullYear()+y);return r};

function F({label,unit,value,onChange,type="number",step,readOnly,hint,tip,placeholder,children}){
  const isNum=type==="number";
  const toDisp=v=>isNum&&!readOnly&&v!=null?String(v).replace(".",","):(v??'');
  const [localVal,setLocalVal]=useState(()=>toDisp(value));
  const focused=useRef(false);
  useEffect(()=>{if(!focused.current)setLocalVal(toDisp(value));},[value]);
  const hFocus=()=>{focused.current=true;};
  const hChange=e=>{
    const v=e.target.value;
    setLocalVal(v);
    onChange?.(isNum&&!readOnly?v.replace(",","."):v);
  };
  const hBlur=()=>{
    focused.current=false;
    if(isNum&&!readOnly&&localVal.trim()===''){
      setLocalVal('0');
      onChange?.('0');
    } else {
      onChange?.(isNum&&!readOnly?localVal.replace(",","."):localVal);
    }
  };
  const dispVal=readOnly?toDisp(value):localVal;
  return <div className="if-field" style={{marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
      <label style={{fontSize:15,color:"var(--cl)",fontWeight:500,marginBottom:5,display:"inline-flex",alignItems:"center"}}>{label}{tip&&<Tip text={tip} label={label}/>}</label>
      {hint&&<span style={{fontSize:12,color:"var(--ch)"}}>{hint}</span>}
    </div>
    {children||<div style={{display:"flex",alignItems:"center",background:readOnly?"var(--cro)":"var(--ci)",border:"1px solid var(--cb)",borderRadius:10,overflow:"hidden",minHeight:46}}>
      <input
        type={isNum?"text":type}
        inputMode={isNum?"decimal":undefined}
        value={dispVal}
        onChange={readOnly?undefined:hChange}
        onFocus={readOnly?undefined:hFocus}
        onBlur={readOnly?undefined:hBlur}
        readOnly={readOnly}
        placeholder={placeholder||""}
        style={{flex:1,minWidth:0,border:"none",outline:"none",padding:"12px 14px",fontSize:18,background:"transparent",color:readOnly?"var(--ch)":"var(--ct)",fontFamily:"inherit",fontVariantNumeric:"tabular-nums"}}/>
      {unit&&<span style={{padding:"0 12px 0 0",fontSize:14,color:"var(--ch)",whiteSpace:"nowrap"}}>{unit}</span>}
    </div>}
  </div>;
}
function Sel({label,value,onChange,options}){return <F label={label}><select value={value} onChange={e=>{const v=e.target.value;if(v!==String(value))onChange(v);}} style={{width:"100%",padding:"12px 14px",fontSize:18,border:"1px solid var(--cb)",borderRadius:10,background:"var(--ci)",color:"var(--ct)",fontFamily:"inherit",minHeight:46}}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></F>}
function Row({children}){return <div className="if-row">{children}</div>}
function Sec({title,icon}){return <div style={{display:"flex",alignItems:"center",gap:8,margin:"24px 0 14px",paddingBottom:8,borderBottom:"1px solid var(--cb)"}}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:16,fontWeight:600,color:"var(--ct)"}}>{title}</span></div>}
function KPI({label,value,sub,accent}){return <div style={{background:accent?"var(--ca-bg)":"var(--cc)",borderRadius:12,padding:"14px",border:`1px solid ${accent?"var(--ca-bd)":"var(--cb)"}`}}><div style={{fontSize:11,color:accent?"var(--ca)":"var(--ch)",fontWeight:500,textTransform:"uppercase",letterSpacing:.8}}>{label}</div><div style={{fontSize:20,fontWeight:700,color:accent?"var(--ca)":"var(--ct)",marginTop:3,fontVariantNumeric:"tabular-nums"}}>{value}</div>{sub&&<div style={{fontSize:11,color:"var(--ch)",marginTop:2}}>{sub}</div>}</div>}
function SelbsttraegerCheck({R}){
  const{t}=useApp();
  if(!R||!R.ann||R.ann===0||!R.da||R.da===0)return null;
  // template-helper: replaces {key} placeholders
  const tpl=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
  // Verhandlungs-KP: gKP bei dem monatl. CF ohne Steuer = 0
  const beqKP=Math.round(R.gKP+R.cf2OhneSt*R.da/R.ann);
  const diffKP=R.gKP-beqKP;
  const pctNeed=R.gKP>0?diffKP/R.gKP*100:0;
  const beqKPMit=Math.round(R.gKP+R.cf2MitSt*R.da/R.ann);
  const diffKPMit=R.gKP-beqKPMit;
  const beqJ=R.cf2OhneSt>=0?1:(R.yearRows||[]).find(r=>(r.cfOhneSt??r.cf-r.steuer)>=0)?.j??null;

  const alreadyOhne=R.cf2OhneSt>=0;
  const alreadyMit=!alreadyOhne&&R.cf2MitSt>=0;
  const smallGap=!alreadyOhne&&pctNeed<=12;
  const hasBeqJ=!alreadyOhne&&beqJ!==null;

  // Verdikt rein auf Basis Cashflow OHNE Steuervorteil — das ist die ehrliche Antwort.
  const isJa=alreadyOhne;
  const vColor=isJa?"#1a7a3a":"#A32D2D";
  const vBg=isJa?"#E8F5EC":"#FCEBEB";
  const vBorder=isJa?"#9FD3AE":"#F09595";
  const vIcon=isJa?"#1a7a3a":"#E24B4A";
  const taxPositive=R.cf2MitSt>=0;
  const reason=isJa
    ?tpl(t.stWhyJa,{cf:fmtE(R.cf2OhneSt)})
    :tpl(t.stWhyNein,{cf:fmtE(Math.abs(R.cf2OhneSt))});
  const taxNote=isJa
    ?tpl(t.stTaxBonus,{cf:fmtE(R.cf2MitSt)})
    :taxPositive
      ?tpl(t.stTaxPos,{cf:fmtE(R.cf2MitSt)})
      :tpl(t.stTaxNeg,{cf:fmtE(Math.abs(R.cf2MitSt))});
  const taxBg=isJa?"#E8F5EC":taxPositive?"#FFF6E6":"#F1EFE8";
  const taxBorder=isJa?"#C4E6CF":taxPositive?"#F5D88A":"#D3D1C7";
  const taxText=isJa?"#1a6b34":taxPositive?"#7a5a10":"#5F5E5A";
  const card2Color=alreadyOhne?"#1a7a3a":beqJ?"#854F0B":"#A32D2D";

  return(
    <div style={{background:"var(--cc)",borderRadius:14,border:"1px solid var(--cb)",padding:"16px 18px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"var(--ch)"}}>{t.stCheck}</span>
      </div>

      <div style={{display:"flex",alignItems:"flex-start",gap:12,background:vBg,border:`1px solid ${vBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
        <span style={{flexShrink:0,width:34,height:34,borderRadius:"50%",background:vIcon,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:800,lineHeight:1}}>{isJa?"✓":"✕"}</span>
        <div style={{minWidth:0}}>
          <div style={{fontSize:21,fontWeight:800,color:vColor,lineHeight:1.1,letterSpacing:-.3}}>{isJa?t.stVerdictJa:t.stVerdictNein}</div>
          <div style={{fontSize:13,fontWeight:600,color:vColor,marginTop:4,lineHeight:1.5}}>{reason}</div>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"flex-start",gap:9,background:taxBg,border:`1px solid ${taxBorder}`,borderRadius:12,padding:"11px 13px",marginBottom:14}}>
        <span style={{flexShrink:0,fontSize:14,lineHeight:1.4}}>{isJa?"➕":taxPositive?"⚠️":"ℹ️"}</span>
        <div style={{fontSize:12,fontWeight:500,color:taxText,lineHeight:1.5}}>{taxNote}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
        <div style={{background:"var(--ci)",borderRadius:10,padding:"12px 14px",border:"1px solid var(--cb)"}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--ch)",marginBottom:4}}>
            {t.stZielKP}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:"#1E3A5F",fontVariantNumeric:"tabular-nums",letterSpacing:-.5}}>
            {fmtE(beqKP)}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:isJa?"#1a7a3a":diffKP>0?"var(--ca)":"#1a7a3a",marginTop:4}}>
            {alreadyOhne
              ?`✓ ${fmtE(diffKP)} ${t.stIstKPPuffer}`
              :diffKP>0
                ?`▼ ${fmtE(diffKP)} (${fmtP(pctNeed,1)}) ${t.stVerhandlZiel}`
                :`✓ ${fmtE(Math.abs(diffKP))} ${t.stUnterZiel}`
            }
          </div>
          {!alreadyOhne&&(
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4,paddingTop:4,borderTop:"1px solid var(--cb)"}}>
              {t.stMitStVor}: {fmtE(beqKPMit)}{diffKPMit>0?` (−${fmtE(diffKPMit)})`:` ✓`}
            </div>
          )}
        </div>
        <div style={{background:"var(--ci)",borderRadius:10,padding:"12px 14px",border:"1px solid var(--cb)"}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--ch)",marginBottom:4}}>
            {t.stSelbstAb}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:card2Color,fontVariantNumeric:"tabular-nums",letterSpacing:-.5}}>
            {alreadyOhne?t.stSofort:beqJ?`Jahr ${beqJ}`:t.stAusserhalb}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:card2Color,marginTop:4}}>
            {alreadyOhne?t.stCFPositiv
              :beqJ?`CF ≥ 0 ab J${beqJ} (${t.stMietSteig})`
              :`${t.stAusserhalb} ${R.j}-J.-Analyse`}
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:4,paddingTop:4,borderTop:"1px solid var(--cb)"}}>
            {t.stOhneStAkt}
          </div>
        </div>
      </div>
    </div>
  );
}
// Legacy-Alias für Rückwärtskompatibilität
const BreakEvenCards=SelbsttraegerCheck;
function Ins({emoji,text,type="info"}){const bg={info:"#EBF5FF",good:"#E8F8EE",warn:"#FFF8E6",bad:"#FFF0F0"}[type];const tc={info:"#1a5fa0",good:"#1a7a3a",warn:"#8a6d10",bad:"#9a2020"}[type];return <div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"10px 12px",background:bg,borderRadius:8,marginBottom:6}}><span style={{fontSize:14,flexShrink:0}}>{emoji}</span><span style={{fontSize:12,color:tc,lineHeight:1.5}}>{text}</span></div>}
function RBar({score,factors}){
  const{t}=useApp();
  const[ex,setEx]=useState(false);
  const[animated,setAnimated]=useState(false);
  useEffect(()=>{const id=setTimeout(()=>setAnimated(true),80);return()=>clearTimeout(id)},[score]);

  // Color zones: 0-24 green, 25-49 yellow, 50-74 red, 75-100 dark red
  const col=score<25?"#22c55e":score<50?"#f59e0b":score<75?"#ef4444":"#b91c1c";
  const lbl=score<25?t.niedrig:score<50?t.mittel:t.hoch;
  const bgGrad=score<25?"#22c55e":score<50?"#f59e0b":score<75?"#ef4444":"#b91c1c";

  // SVG semicircle gauge
  const R=58,cx=70,cy=68,strokeW=14;
  const circumference=Math.PI*R; // half circle arc length
  const dashOffset=animated?circumference*(1-Math.min(score,100)/100):circumference;

  // Factor code → {icon, titleKey, descKey}
  const FACTOR_MAP={
    "bel>95":{icon:"🏦",t:"rfBelT",d:"rfBelD"},
    "bel>90":{icon:"🏦",t:"rfBelT",d:"rfBelD"},
    "bel>80":{icon:"🏦",t:"rfBelT",d:"rfBelD"},
    "nR<1":{icon:"📉",t:"rfNrT",d:"rfNrD"},
    "nR<2":{icon:"📉",t:"rfNrT",d:"rfNrD"},
    "nR<3":{icon:"📉",t:"rfNrT",d:"rfNrD"},
    "cf<-500":{icon:"💸",t:"rfCfT",d:"rfCfD"},
    "cf<0":{icon:"💸",t:"rfCfT",d:"rfCfD"},
    "z≥5":{icon:"📊",t:"rfZT",d:"rfZD"},
    "z≥4":{icon:"📊",t:"rfZT",d:"rfZD"},
    "t<1":{icon:"⏳",t:"rfTT",d:"rfTD"},
    "t<2":{icon:"⏳",t:"rfTT",d:"rfTD"},
    "lz>35":{icon:"📅",t:"rfLzT",d:"rfLzD"},
    "lz>30":{icon:"📅",t:"rfLzT",d:"rfLzD"},
    "lz=∞":{icon:"∞",t:"rfLzT",d:"rfLzD"},
    "p>6k":{icon:"🏷️",t:"rfPT",d:"rfPD"},
    "p>5k":{icon:"🏷️",t:"rfPT",d:"rfPD"},
    "ek<10":{icon:"💰",t:"rfEkT",d:"rfEkD"},
    "ek<20":{icon:"💰",t:"rfEkT",d:"rfEkD"},
    "ls>8":{icon:"🏠",t:"rfLsT",d:"rfLsD"},
    "ls>5":{icon:"🏠",t:"rfLsT",d:"rfLsD"},
  };

  // Deduplicate factors by title key (e.g. bel>80 and bel>90 → one card)
  const seen=new Set();
  const dedupedFactors=(factors||[]).filter(f=>{
    const m=FACTOR_MAP[f];
    if(!m)return true;
    if(seen.has(m.t))return false;
    seen.add(m.t);return true;
  });

  return <div style={{background:"var(--cc)",borderRadius:16,border:`2px solid ${col}`,marginBottom:16,overflow:"hidden",maxWidth:"100%",boxSizing:"border-box"}}>
    {/* Header strip */}
    <div style={{background:col,padding:"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:12,fontWeight:700,color:"#fff",letterSpacing:.5,textTransform:"uppercase"}}>{t.risk}</span>
      <span style={{fontSize:12,fontWeight:700,color:"#fff",opacity:.9}}>{lbl}</span>
    </div>

    {/* Gauge — zentriert, groß, farbige Zonen */}
    {(()=>{
      const Rg=108,cgx=140,cgy=132,sgw=20;
      const Cg=Math.PI*Rg; // ≈339.3
      const zLen=Cg/3;
      const gDash=animated?Cg*(1-Math.min(score,100)/100):Cg;
      return <div style={{padding:"20px 16px 8px"}}>
        <svg width="100%" viewBox="0 0 280 185" style={{display:"block",maxWidth:360,margin:"0 auto",overflow:"visible"}}>
          {/* Zone arcs (background) — green / yellow / red */}
          <path d={`M${cgx-Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx+Rg},${cgy}`}
            fill="none" stroke="#22c55e" strokeWidth={sgw} strokeLinecap="butt" opacity={.22}
            strokeDasharray={`${zLen} ${Cg-zLen}`} strokeDashoffset={0}/>
          <path d={`M${cgx-Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx+Rg},${cgy}`}
            fill="none" stroke="#f59e0b" strokeWidth={sgw} strokeLinecap="butt" opacity={.22}
            strokeDasharray={`${zLen} ${Cg-zLen}`} strokeDashoffset={-zLen}/>
          <path d={`M${cgx-Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx+Rg},${cgy}`}
            fill="none" stroke="#ef4444" strokeWidth={sgw} strokeLinecap="butt" opacity={.22}
            strokeDasharray={`${zLen} ${Cg-zLen}`} strokeDashoffset={-2*zLen}/>
          {/* Score fill arc */}
          <path d={`M${cgx-Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx+Rg},${cgy}`}
            fill="none" stroke={col} strokeWidth={sgw} strokeLinecap="round"
            strokeDasharray={Cg} strokeDashoffset={gDash}
            style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",transformOrigin:`${cgx}px ${cgy}px`,transform:"scaleX(-1)"}}/>
          {/* 0 and 100 endpoint labels */}
          <text x={cgx-Rg-2} y={cgy+20} textAnchor="middle" fontSize={11} fill="#22c55e" fontWeight={700}>0</text>
          <text x={cgx+Rg+2} y={cgy+20} textAnchor="middle" fontSize={11} fill="#b91c1c" fontWeight={700}>100</text>
          {/* Score number — large center */}
          <text x={cgx} y={cgy-14} textAnchor="middle" fontSize={52} fontWeight={900} fill={col}>{score}</text>
          <text x={cgx} y={cgy+8} textAnchor="middle" fontSize={11} fill="var(--ch)" opacity={.7}>/100</text>
          {/* Risk label below arc */}
          <text x={cgx} y={cgy+36} textAnchor="middle" fontSize={16} fontWeight={800} fill={col}>{lbl}</text>
        </svg>
      </div>;
    })()}
    {/* Risikofaktoren — Expand button + Karten */}
    {dedupedFactors.length>0&&<div style={{padding:"0 12px 12px",marginTop:4}}>
      <button onClick={()=>setEx(!ex)} style={{
        width:"100%",background:"none",border:"1px solid var(--cb)",borderRadius:8,
        fontSize:11,color:"var(--ch)",cursor:"pointer",padding:"7px 12px",
        fontFamily:"inherit",textAlign:"left",marginBottom:ex?8:0,
        display:"flex",justifyContent:"space-between",alignItems:"center"
      }}>
        <span>▾ {ex?t.riskHide:t.riskShow}</span>
        <span style={{fontSize:12,background:col,color:"#fff",borderRadius:20,padding:"1px 8px",fontWeight:700}}>{dedupedFactors.length}</span>
      </button>
      {ex&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {dedupedFactors.map((f,i)=>{
          const m=FACTOR_MAP[f];
          if(!m)return <div key={i} style={{fontSize:11,color:"var(--cl)",padding:"6px 10px",background:"var(--cb)",borderRadius:8}}>{f}</div>;
          return <div key={i} style={{borderRadius:10,border:"1px solid var(--cb)",overflow:"hidden"}}>
            <div style={{background:"rgba(232,101,10,.08)",padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>{m.icon}</span>
              <span style={{fontSize:12,fontWeight:700,color:"var(--ct)"}}>{t[m.t]||m.t}</span>
            </div>
            <div style={{padding:"8px 12px",fontSize:11,color:"var(--ch)",lineHeight:1.6}}>{t[m.d]||m.d}</div>
          </div>;
        })}
      </div>}
    </div>}
  </div>}


// ═══ ACCORDION SECTION ═══
function AccordionSection({question,hint,color,children,defaultOpen=false,sync}){
  const[open,setOpen]=useState(defaultOpen);
  useEffect(()=>{if(sync)setOpen(sync.open)},[sync?.key]);
  const borderCol=color||"var(--cb)";
  return <div style={{marginBottom:12,borderRadius:14,border:`1.5px solid ${open?borderCol:"var(--cb)"}`,overflow:"hidden",transition:"border-color .2s"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{
      width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"13px 16px",background:open?"var(--cc)":"var(--cc)",border:"none",cursor:"pointer",
      fontFamily:"inherit",gap:8,textAlign:"left"
    }}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--ct)",lineHeight:1.3}}>{question}</div>
        {hint&&!open&&<div style={{fontSize:11,color:"var(--ch)",marginTop:2}}>{hint}</div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        {color&&<span style={{width:10,height:10,borderRadius:"50%",background:color,flexShrink:0}}/>}
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{transition:"transform .25s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>
          <path d="M4 6l4 4 4-4" stroke="var(--ch)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
    {open&&<div style={{padding:"0 12px 14px",borderTop:"1px solid var(--cb)"}}>{children}</div>}
  </div>;
}

// ═══ AMPEL-KPI CARD (neues Design) ═══
function AmpelKPI({label,value,status,statusLabel,tip,color}){
  const bg=color==="green"?"rgba(34,197,94,.08)":color==="yellow"?"rgba(245,158,11,.08)":"rgba(239,68,68,.08)";
  const borderTop=color==="green"?"#22c55e":color==="yellow"?"#f59e0b":"#ef4444";
  const badgeBg=color==="green"?"rgba(34,197,94,.15)":color==="yellow"?"rgba(245,158,11,.15)":"rgba(239,68,68,.15)";
  const textCol=color==="green"?"#15803d":color==="yellow"?"#b45309":"#b91c1c";
  return <div style={{background:bg,borderRadius:12,border:`0.5px solid ${borderTop}33`,borderTop:`5px solid ${borderTop}`,padding:"10px 10px",minWidth:0,overflow:"hidden"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4,gap:4}}>
      <span style={{fontSize:10,fontWeight:600,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.5,lineHeight:1.3,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span>
      <span style={{background:badgeBg,color:textCol,fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:20,whiteSpace:"nowrap",flexShrink:0}}>{statusLabel}</span>
    </div>
    <div style={{fontSize:"clamp(18px,5.5vw,24px)",fontWeight:700,color:textCol,fontVariantNumeric:"tabular-nums",lineHeight:1.1,margin:"4px 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div>
    {status&&<div style={{fontSize:10,color:textCol,fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{status}</div>}
    {tip&&<div style={{fontSize:9,color:"var(--ch)",lineHeight:1.5}}>{tip}</div>}
  </div>;
}

// ═══ NEUTRAL-KPI CARD ═══
function NeutralKPI({label,value,sub}){
  return <div style={{background:"var(--cc)",borderRadius:12,border:"0.5px solid var(--cb)",padding:"12px 14px"}}>
    <div style={{fontSize:10,fontWeight:600,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>{label}</div>
    <div style={{fontSize:22,fontWeight:700,color:"var(--ct)",fontVariantNumeric:"tabular-nums",lineHeight:1.1,margin:"4px 0"}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:"var(--ch)",marginTop:3}}>{sub}</div>}
  </div>;
}

function tpl(s,v){return s?s.replace(/\{(\w+)\}/g,(_,k)=>v&&v[k]!=null?v[k]:'{'+k+'}'):''}
// ═══ BANDS — zentrale Bewertungs-Config (Single Source of Truth) ═══
const BANDS={
  bruttoR:    {dir:'up',  green:5.0, yellow:4.0, unit:'%'},
  nettoR:     {dir:'up',  green:3.5, yellow:2.5, unit:'%'},
  kpFaktor:   {dir:'down',green:25,  yellow:30,  unit:'x'},
  cfOhne:     {dir:'up',  green:0,   yellow:-150,unit:'eur'},
  cfMit:      {dir:'up',  green:0,   yellow:-150,unit:'eur'},
  bel:        {dir:'down',green:70,  yellow:85,  unit:'%'},
  ekQuote:    {dir:'up',  green:20,  yellow:10,  unit:'%'},
  laufzeit:   {dir:'down',green:25,  yellow:35,  unit:'jahre'},
  steuerErsM: {dir:'up',  green:150, yellow:75,  unit:'eur'},
  nkAmort:    {dir:'down',green:10,  yellow:15,  unit:'jahre'},
  ekRendite:  {dir:'up',  green:6,   yellow:3,   unit:'%'},
  gesamtSaldo:{dir:'up',  green:0,   yellow:null,unit:'eur'},
  wertAnnahme:{dir:'down',green:2.5, yellow:4.0, unit:'%'},
};
function rate(kpi,wert){
  const b=BANDS[kpi];if(!b)return{tier:'green',symbol:'✓',color:'green'};
  let tier;
  if(b.dir==='up')  tier=wert>=b.green?'green':(b.yellow!=null&&wert>=b.yellow)?'yellow':'red';
  else              tier=wert<=b.green?'green':(b.yellow!=null&&wert<=b.yellow)?'yellow':'red';
  const symbol=tier==='green'?'✓':tier==='yellow'?'~':'⚠';
  const color=tier==='green'?'green':tier==='yellow'?'yellow':'red';
  return{tier,symbol,color};
}
const vrd=r=>r.tier==='green'?'gut':r.tier==='yellow'?'grenzwertig':'kritisch';
// ═══ SECTION EXPLAINER — Bullets sichtbar, Erklärtext im Toggle ═══
function SectionExplain({bullets,text}){
  const[open,setOpen]=useState(false);
  const{t}=useApp();
  return <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--cb)"}}>
    {bullets&&bullets.length>0&&<ul style={{margin:"0 0 8px",padding:0,listStyle:"none"}}>
      {bullets.map((b,i)=><li key={i} style={{fontSize:11,color:"var(--ch)",lineHeight:1.65,marginBottom:4,display:"flex",gap:6}}>
        <span style={{color:"var(--ca)",flexShrink:0,fontWeight:700}}>→</span><span>{b}</span>
      </li>)}
    </ul>}
    {text&&<>
      <button data-pdf-detail="true" onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",padding:"4px 0",cursor:"pointer",fontFamily:"inherit",fontSize:11,color:"var(--ca)",fontWeight:600}}>
        <span style={{fontSize:13}}>{open?"▲":"▼"}</span>
        <span>{open?(t&&t.secClose?t.secClose:"Weniger anzeigen"):(t&&t.secOpen?t.secOpen:"Wie kommt das Ergebnis zustande?")}</span>
      </button>
      {open&&<div style={{fontSize:11,color:"var(--ch)",lineHeight:1.75,whiteSpace:"pre-line",marginTop:8,paddingTop:8,borderTop:"1px dashed var(--cb)"}}>{text}</div>}
    </>}
  </div>;
}
function PLZSearch({showKapp=true}={}){const{d,set,t,tip}=useApp();const[ac,setAC]=useState([]);const[show,setShow]=useState(false);const ref=useRef();
  const onP=v=>{set("plz",v);if(/^\d{5}$/.test(v)){const f=PLZ_DB.byPlz[v];if(f){set("ort",f.ort);set("bundesland",f.bl)}}};
  const onO=v=>{set("ort",v);if(v.length>=2){const l=v.toLowerCase();const m=PLZ_DB.allOrts.filter(o=>o.startsWith(l)).slice(0,6);setAC(m.map(o=>PLZ_DB.byOrt[o][0]));setShow(m.length>0)}else setShow(false)};
  const sel=it=>{set("ort",it.ort);set("plz",it.plz);set("bundesland",it.bl);setShow(false)};
  useEffect(()=>{const c=e=>{if(ref.current&&!ref.current.contains(e.target))setShow(false)};document.addEventListener("click",c);return()=>document.removeEventListener("click",c)},[]);
  const kp=isK15(d.ort)?15:20;
  return <><Row><F label={t.plz} value={d.plz} onChange={onP} type="text" hint={PLZ_DB.byPlz[d.plz]?.ort||""}/><div ref={ref} style={{position:"relative"}}><F label={t.ort} value={d.ort} onChange={onO} type="text"/>{show&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:8,zIndex:50,boxShadow:"0 4px 12px rgba(0,0,0,.1)",maxHeight:180,overflow:"auto"}}>{ac.map((it,i)=><div key={i} onClick={()=>sel(it)} style={{padding:"8px 12px",fontSize:13,cursor:"pointer",borderBottom:"1px solid var(--cb)"}}>{it.ort} <span style={{color:"var(--ch)",fontSize:11}}>{it.plz}·{BL_N[it.bl]}</span></div>)}</div>}</div></Row>
  {showKapp&&d.ort&&<div style={{fontSize:11,padding:"6px 10px",background:kp===15?"#FFF0F0":"#E8F8EE",borderRadius:6,marginBottom:10,color:kp===15?"#9a2020":"#1a7a3a"}}>{t.kapp}: {kp}% — {kp===15?t.ang:t.std} ({d.ort})</div>}</>}

function buildMP(miete,qm,vmQm,kappP,lD,lM,jahre,k15,tObj){const vm=vmQm>0?vmQm*qm:null,prog=k15?MIET_P.kapp15:MIET_P.normal,vmPA=prog.pA/100,heute=new Date(),ende=addY(heute,jahre);let akt=miete,lInc=lD?new Date(lD):new Date(heute.getFullYear()-2,heute.getMonth(),1);const hist=[];if(lD&&lM>0&&lM<miete)hist.push({date:new Date(lD),fromM:lM,toM:miete});const rows=[];let sg=0;while(sg++<20){const n=addM(lInc,15);if(n>ende)break;const f3=addM(n,-36),used=hist.filter(h=>h.date>=f3&&h.date<n).reduce((s,h)=>s+(h.fromM>0?(h.toM-h.fromM)/h.fromM*100:0),0),vK=Math.max(0,kappP-used),rentAtF3=(hist.filter(h=>h.date<f3).slice(-1)[0]?.toM??miete),mxK=rentAtF3*(1+kappP/100),j2D=(n-heute)/(1e3*60*60*24*365.25),vP=vm?vm*Math.pow(1+vmPA,j2D):null,mxM=vP?Math.min(mxK,vP):mxK,mE=Math.max(0,mxM-akt),mP=akt>0?mE/akt*100:0,neu=akt+mE;let st,sC;if(vP&&akt>=vP-.5){st=(tObj||{vgl:"Vgl."}).vgl;sC="neg"}else if(vK<=.1){st=(tObj||{kapp:"Kap."}).kapp;sC="neg"}else{st=`+${fmt(mP,1)}%`;sC="pos"}rows.push({datum:n,aktMiete:akt,vm,vmProg:vP,mE,mP,neueMiete:neu,verfK:vK,status:st,sC});if(mE>0){hist.push({date:new Date(n),fromM:akt,toM:neu});akt=neu}lInc=new Date(n)}return{rows,q:prog.q,vmPA:prog.pA}}
function VT({view,setView}){const{t}=useApp();return <div className="mob-toggle">{["input","result"].map(v=><button key={v} className={view===v?"act":""} onClick={()=>{setView(v);setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),50)}}>{v==="input"?t.eingabe:t.ergebnis}</button>)}</div>}



// ═══ TOOLTIPS, LEGAL BASIS & SHARED COMPONENTS ═══
const TIPS={
  de:{
    kaufpreis:"Vereinbarter Kaufpreis ohne Kaufnebenkosten.",
    flaeche:"Nettowohnfläche nach Wohnflächenverordnung (WoFlV).",
    kaltmiete:"Nettokaltmiete ohne Betriebskosten.",
    nichtUml:"Kosten, die nicht auf Mieter umlegbar sind: Verwaltung, Instandhaltung, Rücklagen.",
    leerstand:"Erwartete Leerstandsmonate im Analysezeitraum. Realistisch: 2-4 Monate pro 10 Jahre.",
    eigenkapital:"Liquide Mittel für Kauf. Faustregel: mind. Kaufnebenkosten + 20% des Kaufpreises.",
    zinssatz:`Sollzins p.a. (nicht Effektivzins). Aktueller Marktdurchschnitt: ${MARKET_RATES.avg} %. Quellen: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank.`,
    tilgung:"Anfängliche Tilgung p.a. Empfehlung: mind. 2-3% für vertretbare Laufzeit.",
    grEst:"Grunderwerbsteuer nach GrEStG - bundeslandabhängig 3,5%-6,5%.",
    notar:"Notar- und Grundbuchkosten, ca. 1,5-2% des Kaufpreises.",
    makler:"Maklerprovision - seit 12/2020 geteilt zwischen Käufer und Verkäufer (max. 3,57%).",
    steuersatz:"Persönlicher Durchschnittssteuersatz. Berechnung: (Einkommensteuer ÷ zvE) × 100. Werte im Steuerbescheid. Grenzsteuersatz inkl. Soli typisch 25–45 %.",
    afa:"Absetzung für Abnutzung (§ 7 EStG). 2% linear für Baujahr ab 1925, 3% für Neubau ab 2023.",
    grundAnteil:"Nicht abschreibbar. Typisch 20% in Städten, 10-15% auf dem Land.",
    gebAnteil:"Gebäudewert - abschreibbar gemäß AfA-Satz.",
    wertP:"Historische Wertsteigerung 2-3% p.a. (langfristig). Regional stark variabel.",
    sonder:"Einmalige Sonderumlagen der WEG, z.B. neue Heizung, neues Dach, Fassadensanierung, Aufzug. Vor Kauf Protokolle der Eigentümerversammlungen prüfen.",
    renovierung:"Geschätzte Renovierungskosten beim Kauf (Küche, Bad, Böden etc.). Wichtig: Übersteigen diese Kosten in den ersten 3 Jahren nach Kauf 15% des Gebäude-Kaufpreises (Kaufpreis × Gebäudeanteil), müssen sie als 'anschaffungsnahe Herstellungskosten' aktiviert und über die AfA abgeschrieben werden (§ 6 Abs. 1 Nr. 1a EStG) — kein Sofortabzug. Kein Steuerrechtsrat — Steuerberater hinzuziehen.",
    vgl:"Ortsübliche Vergleichsmiete pro m² (Mietspiegel, Mietdatenbank oder Gutachter).",
    vglRendite:"Ortsübliche Vergleichsmiete lt. Mietspiegel (€/m²). Wirkt auf zwei Arten: (1) Steuert den Mieterhöhungsplan — § 558 BGB erlaubt keine Erhöhung über diesen Wert, egal wie viel Kappungsgrenze noch frei ist. (2) Liegt deine Ist-Miete mehr als 15 % darunter, erscheint ein Hinweis zur schrittweisen Angleichung. Quelle: lokaler Mietspiegel, Mietdatenbank oder Sachverständigengutachten.",
    vglMiete:"Gesetzliche Obergrenze nach § 558 Abs. 1 BGB — die Miete darf niemals über die ortsübliche Vergleichsmiete erhöht werden, egal wie viel Kappungsspielraum noch verfügbar ist. Der Wert projiziert sich im Zeitverlauf mit der hinterlegten Mietpreisprognose. Quelle: lokaler Mietspiegel, Mietdatenbank oder Sachverständigengutachten.",
    lDat:"Datum der letzten vertragswirksamen Mieterhöhung. Bestimmt zwei Fristen: (1) 15-Monats-Frist — die nächste Erhöhung darf frühestens 15 Monate danach erfolgen (§ 558 Abs. 1 BGB). (2) 3-Jahres-Fenster — nur Erhöhungen der letzten 36 Monate zählen für die Kappungsgrenze. Je länger zurück, desto mehr Spielraum ist wieder frei.",
    lMiet:"Kaltmiete VOR der letzten Erhöhung — nicht die aktuelle Miete. Wird benötigt, um den bereits verbrauchten Teil der Kappungsgrenze der letzten 3 Jahre zu berechnen. Beispiel: War die Miete 800 € und ist jetzt 900 €, wurden 12,5 % der Kappung genutzt — bei 20 %-Grenze bleiben noch 7,5 % verfügbar.",
    bj:"Baujahr der Immobilie (Bezugsfertigkeit). Bestimmt den AfA-Satz automatisch: vor 1925 → 2,5 %, 1925–2022 → 2,0 %, ab 2023 (Neubau) → 3,0 % (§ 7 Abs. 4 EStG).",
    sanBj:"Baujahr der Immobilie (Bezugsfertigkeit). Bestimmt die aktuelle Energieklasse (A+…H) und die KfW-Förderung: Der Klimageschwindigkeitsbonus (20 % extra) gilt nur für Gebäude, die vor dem 01.01.2002 errichtet wurden.",
    pers:"Personen im Haushalt - bestimmt Warmwasserbedarf (~800 kWh/Person/J.).",
    garage:"Kaufpreis für Garage oder Stellplatz, separat vom Wohnungsbereich. Nebenkosten werden auf Gesamtpreis berechnet.",
    mieteQm:"Kaltmiete pro m² Wohnfläche. Multipliziert mit Wohnfläche ergibt die monatliche Kaltmiete.",
    ogdecke:"Dämmung der obersten Geschossdecke — kostengünstige Alternative zur kompletten Dachsanierung.",
    batterie:"Kapazität des Batteriespeichers in kWh. Faustregel: Kapazität ≈ PV-Leistung in kWp.",
    sondertilg:"Jährliche Sondertilgung - üblich 5% des Darlehensbetrags/Jahr. Muss vertraglich vereinbart sein (§ 500 BGB).",
    epStrom:"Aktueller Strompreis pro kWh. Bundesdurchschnitt ca. 0,35 €/kWh. Relevant für Wärmepumpe, PV, E-Auto.",
    epHeiz:"Heizkosten pro kWh für Gas, Öl, Pellets, Fernwärme. Gas ca. 0,12 €, Öl ca. 0,10 €, Pellets ca. 0,07 €, Fernwärme ca. 0,12 €.",
    fasFl:"Geschätzte Außenwandfläche. Abhängig von Anbausituation.",
    daFl:"Satteldach: ca. Grundfläche × 1.4, Flachdach: ≈ Grundfläche.",
    keFl:"Fläche der Kellerdecke. Bei unbeheiztem Keller empfehlenswert.",
    pvLeistung:"1 kWp ≈ 7m² Dachfläche. Ertrag ca. 950 kWh/kWp pro Jahr.",
    isfp:"Individueller Sanierungsfahrplan: Ein Energieberater erstellt einen maßgeschneiderten Sanierungsplan. Belohnung: +5% BAFA-Bonus auf jede BEG-Maßnahme. Energieberatung wird mit 50% bezuschusst. Antrag stets VOR Auftragsvergabe!"
  },
  en:{
    kaufpreis:"Agreed purchase price excluding closing costs.",
    flaeche:"Net living area per German WoFlV regulation.",
    kaltmiete:"Net cold rent excluding utilities.",
    nichtUml:"Costs not chargeable to tenants: management, maintenance, reserves.",
    leerstand:"Expected vacancy months over the analysis period. Realistic: 2-4 months per 10 years.",
    eigenkapital:"Liquid funds for purchase. Rule of thumb: at least closing costs + 20% of purchase price.",
    zinssatz:`Nominal rate p.a. (not APR). Current market average: ${MARKET_RATES.avg}% (as of ${MARKET_RATES.stand}). Sources: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank.`,
    tilgung:"Initial annual repayment rate. Recommend: at least 2-3% for reasonable term.",
    grEst:"Real estate transfer tax (GrEStG) — varies 3.5%-6.5% by German state.",
    notar:"Notary and land registry costs, approx. 1.5-2% of purchase price.",
    makler:"Realtor commission — since 12/2020 shared between buyer and seller (max. 3.57%).",
    steuersatz:"Personal average tax rate. Formula: (income tax ÷ taxable income) × 100. Values in your tax assessment. Marginal rate incl. solidarity surcharge typically 25–45 %.",
    afa:"Depreciation per § 7 German Income Tax Act. 2% linear from 1925, 3% for new builds from 2023.",
    grundAnteil:"Not depreciable. Typically 20% in cities, 10-15% rural.",
    gebAnteil:"Building value — depreciable per AfA rate.",
    wertP:"Historical appreciation 2-3% p.a. long-term. Strong regional variation.",
    sonder:"One-time HOA special levies, e.g. new heating, roof, facade renovation, elevator. Review HOA meeting minutes before buying.",
    renovierung:"Estimated renovation costs at purchase (kitchen, bathroom, flooring etc.). Important: if costs exceed 15% of building purchase price within 3 years (§ 6 para. 1 no. 1a EStG), they must be capitalised and depreciated — no immediate deduction. Not tax advice — consult a tax advisor.",
    vgl:"Local comparable rent per m² (rent index, rent database, or appraiser).",
    vglRendite:"Local comparable rent per m² (Mietspiegel). Works two ways: (1) Caps the rent increase plan — § 558 BGB prohibits any increase above this value, regardless of remaining headroom. (2) If your current rent is more than 15% below it, an advisory is shown for gradual alignment. Source: local rent index, database, or expert appraisal.",
    vglMiete:"Legal ceiling per § 558 para. 1 BGB — rent may never be raised above the local comparable rent, no matter how much cap headroom is still available. The value is projected forward using the built-in rent growth forecast. Source: local rent index, database, or expert appraisal.",
    lDat:"Date of last contractually effective rent increase. Sets two deadlines: (1) 15-month wait — the next increase may not occur until 15 months after this date (§ 558 para. 1 BGB). (2) 3-year rolling window — only increases within the last 36 months count toward the cap. The further back, the more headroom is restored.",
    lMiet:"Cold rent BEFORE the last increase — not the current rent. Required to calculate how much of the 3-year cap has already been used. Example: if rent was €800 and is now €900, 12.5% of the cap is consumed — with a 20% limit, 7.5% remains available.",
    bj:"Year of construction (occupancy ready). Automatically sets the depreciation rate: before 1925 → 2.5%, 1925–2022 → 2.0%, from 2023 onward (new build) → 3.0% (§ 7 Para. 4 EStG).",
    sanBj:"Year of construction (occupancy ready). Determines the current energy class (A+…H) and KfW funding eligibility: the climate speed bonus (extra 20%) applies only to buildings constructed before 01 Jan 2002.",
    pers:"Persons in household — determines hot water demand (~800 kWh/person/yr).",
    garage:"Price for garage or parking space, separate from living area. Closing costs are calculated on total price.",
    mieteQm:"Cold rent per m² living area. Multiplied by area equals monthly cold rent.",
    ogdecke:"Insulation of top floor ceiling — cost-effective alternative to full roof renovation.",
    batterie:"Battery storage capacity in kWh. Rule of thumb: capacity ≈ PV power in kWp.",
    sondertilg:"Annual special repayment - typically 5% of loan/year. Must be contractually agreed (§ 500 BGB).",
    epStrom:"Current electricity price per kWh. German average approx. 0.35 €/kWh. Relevant for heat pumps, PV, EVs.",
    epHeiz:"Heating cost per kWh for gas, oil, pellets, district heating. Gas ~0.12 €, oil ~0.10 €, pellets ~0.07 €, district heating ~0.12 €.",
    fasFl:"Estimated facade area. Depends on attachment situation.",
    daFl:"Gable roof: ~ground area × 1.4, flat roof: ≈ ground area.",
    keFl:"Area of basement ceiling. Recommended for unheated basements.",
    pvLeistung:"1 kWp ≈ 7m² roof area. Yield ~950 kWh/kWp per year.",
    isfp:"Individual Energy Renovation Roadmap: A certified energy consultant creates a personalised step-by-step plan. Reward: +5% extra BAFA subsidy on every BEG measure. Consulting is 50% subsidised. Apply before placing any orders!"
  },
  tr:{
    kaufpreis:"Kapanış maliyetleri hariç anlaşılan satın alma fiyatı.",
    flaeche:"Alman WoFlV yönetmeliğine göre net yaşam alanı.",
    kaltmiete:"İşletme giderleri hariç net soğuk kira.",
    nichtUml:"Kiracılara yüklenemeyen maliyetler: yönetim, bakım, rezerv.",
    leerstand:"Analiz dönemi boyunca beklenen boş ay sayısı. Gerçekçi: 10 yılda 2-4 ay.",
    eigenkapital:"Satın alma için likit fonlar. Kural: en az kapanış maliyetleri + alım fiyatının %20'si.",
    zinssatz:`Yıllık nominal faiz (efektif faiz değil). Güncel piyasa ortalaması: %${MARKET_RATES.avg} (${MARKET_RATES.stand} itibariyle). Kaynaklar: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank.`,
    tilgung:"Yıllık başlangıç anapara ödemesi. Tavsiye: makul vade için en az %2-3.",
    grEst:"Almanya'da emlak alım vergisi (GrEStG) - eyalete göre %3,5-6,5.",
    notar:"Noter ve tapu kayıt maliyetleri, satın alma fiyatının yaklaşık %1,5-2'si.",
    makler:"Emlakçı komisyonu - 12/2020'den beri alıcı ile satıcı arasında paylaşılır (maks. %3,57).",
    steuersatz:"Dayanışma vergisi dahil kişisel marjinal vergi oranı (tipik %25-42).",
    afa:"Almanya Gelir Vergisi Kanunu § 7'ye göre amortisman. 1925'ten itibaren doğrusal %2, 2023'ten itibaren yeni yapılarda %3.",
    grundAnteil:"Amortisman yok. Şehirlerde tipik %20, kırsalda %10-15.",
    gebAnteil:"Bina değeri - AfA oranına göre amortismana tabi.",
    wertP:"Tarihsel değer artışı uzun vadede yıllık %2-3. Bölgesel olarak çok değişken.",
    sonder:"Tek seferlik kat malikleri özel ödemeleri, örn. yeni ısıtma, çatı, cephe yenileme, asansör. Satın almadan önce kat malikleri toplantı tutanaklarını inceleyin.",
    renovierung:"Satın alımda tahmini tadilat maliyetleri. %15 eşiği aşılırsa aktifleştirme zorunludur.",
    vgl:"m² başına yerel karşılaştırmalı kira (kira endeksi, veritabanı veya bilirkişi).",
    vglRendite:"m² başına yerel karşılaştırmalı kira (Mietspiegel). İki şekilde etki eder: (1) Kira artış planını sınırlar — § 558 BGB, kalan kap marjından bağımsız olarak bu değerin üzerinde artışa izin vermez. (2) Mevcut kiranız %15'ten fazla altındaysa bir uyarı gösterilir. Kaynak: yerel kira endeksi, veritabanı veya bilirkişi.",
    vglMiete:"§ 558 Abs. 1 BGB uyarınca yasal tavan — kalan kap marjı ne olursa olsun kira hiçbir zaman yerel karşılaştırmalı kiranın üzerine çıkarılamaz. Değer, yerleşik kira büyüme tahmini kullanılarak ileriye yansıtılır. Kaynak: yerel kira endeksi, veritabanı veya bilirkişi.",
    lDat:"Son sözleşme bazında geçerli kira artışı tarihi. İki süreyi belirler: (1) 15 aylık bekleme — bir sonraki artış bu tarihten en erken 15 ay sonra yapılabilir (§ 558 Abs. 1 BGB). (2) 3 yıllık kayan pencere — yalnızca son 36 aydaki artışlar kap hesabına dahil edilir. Ne kadar eskiyse, o kadar çok marj geri kazanılır.",
    lMiet:"Son artıştan ÖNCEKİ soğuk kira — mevcut kira değil. Son 3 yılda kappın ne kadarının kullanıldığını hesaplamak için gereklidir. Örnek: Kira 800 € iken şimdi 900 € ise, kapın %12,5'i kullanılmış — %20 limitiyle %7,5 hâlâ mevcut.",
    bj:"İnşaat yılı (oturuma hazır). AfA oranını otomatik belirler: 1925 öncesi → %2,5, 1925–2022 arası → %2,0, 2023 ve sonrası (yeni yapı) → %3,0 (§ 7 Abs. 4 EStG).",
    sanBj:"İnşaat yılı (oturuma hazır). Mevcut enerji sınıfını (A+…H) ve KfW teşvik uygunluğunu belirler: iklim hız bonusu (%20 ekstra) yalnızca 01.01.2002 öncesi inşa edilen binalar için geçerlidir.",
    pers:"Hanedeki kişi sayısı - sıcak su talebini belirler (kişi başı yıllık ~800 kWh).",
    garage:"Garaj veya park yeri için fiyat, yaşam alanından ayrı. Kapanış maliyetleri toplam fiyat üzerinden hesaplanır.",
    mieteQm:"m² yaşam alanı başına soğuk kira. Alanla çarpılınca aylık soğuk kira çıkar.",
    ogdecke:"Üst kat tavanı yalıtımı - tam çatı yenilemesine maliyet etkin alternatif.",
    batterie:"kWh cinsinden batarya depolama kapasitesi. Kural: kapasite ≈ kWp cinsinden PV gücü.",
    sondertilg:"Yıllık özel geri ödeme - tipik kredinin yıllık %5'i. Sözleşmeye göre kararlaştırılmalı (§ 500 BGB).",
    epStrom:"kWh başına güncel elektrik fiyatı. Almanya ortalaması yaklaşık 0,35 €/kWh. Isı pompası, PV, elektrikli araç için önemli.",
    epHeiz:"Gaz, yağ, pelet, bölge ısıtması için kWh başına ısıtma maliyeti. Gaz ~0,12 €, yağ ~0,10 €, pelet ~0,07 €, bölge ısıtması ~0,12 €.",
    fasFl:"Tahmini cephe alanı. Eklenti durumuna bağlı.",
    daFl:"Beşik çatı: ~zemin alanı × 1.4, düz çatı: ≈ zemin alanı.",
    keFl:"Bodrum tavanı alanı. Isıtılmamış bodrumlar için önerilir.",
    pvLeistung:"1 kWp ≈ 7m² çatı alanı. Yıllık verim ~950 kWh/kWp.",
    isfp:"Bireysel Enerji Yenileme Planı: Sertifikalı enerji danışmanı adım adım yenileme planı oluşturur. Ödül: Her BEG önlemi için +%5 BAFA teşviki. Danışmanlık %50 sübvanse edilir. Siparişten ÖNCE başvurun!"
  },
  zh:{
    kaufpreis:"商定的购买价格，不含交易费用。",
    flaeche:"根据德国 WoFlV 法规的净居住面积。",
    kaltmiete:"不含运营费用的净冷租金。",
    nichtUml:"不能向租户收取的费用：管理、维护、储备金。",
    leerstand:"分析期内预期空置月数。现实值：每10年2-4个月。",
    eigenkapital:"购买的流动资金。经验法则：至少交易费用 + 购买价的20%。",
    zinssatz:`年度名义利率（非有效利率）。当前市场平均水平：${MARKET_RATES.avg}%（截至 ${MARKET_RATES.stand}）。来源：Dr. Klein、Vergleich.de、Finanztip、Finanzfacts、Interhyp、德国联邦银行。`,
    tilgung:"年度初始还款率。建议：至少2-3%以获得合理期限。",
    grEst:"房地产转让税（GrEStG）- 各州 3.5%-6.5%。",
    notar:"公证和土地登记费用，约购买价的1.5-2%。",
    makler:"房地产经纪人佣金 - 自2020年12月起在买方和卖方之间分摊（最多3.57%）。",
    steuersatz:"包括团结附加税的个人边际税率（通常 25-42%）。",
    afa:"按德国所得税法第 7 条折旧。1925 年起线性 2%，2023 年起新建筑 3%。",
    grundAnteil:"不可折旧。城市通常20%，农村10-15%。",
    gebAnteil:"建筑价值 - 按 AfA 率折旧。",
    wertP:"长期历史增值年度 2-3%。地区差异很大。",
    sonder:"一次性物业特别征收，例如新供暖、屋顶、外墙翻新、电梯。购买前查阅业主大会会议记录。",
    renovierung:"购房时的预估装修费用。如超过建筑购价的15%则必须资本化。",
    vgl:"每平方米当地参考租金（租金指数、租金数据库或评估师）。",
    vglRendite:"每平方米当地参考租金（房租指数）。两种作用：(1) 限制租金上涨计划——§ 558 BGB 禁止超过此值的任何上涨，无论剩余上涨空间多少。(2) 如果当前租金低于此值超过15%，会显示逐步调整的提示。来源：当地房租指数、数据库或专家评估。",
    vglMiete:"§ 558 第1款 BGB 规定的法定上限——无论剩余上涨空间多少，租金永远不得超过当地参考租金。该值使用内置租金增长预测进行未来预测。来源：当地房租指数、数据库或专家评估。",
    lDat:"最后一次合同生效租金上调日期。确定两个期限：(1) 15个月等待期——下次上调最早可在此日期15个月后进行（§ 558第1款BGB）。(2) 3年滚动窗口——只有过去36个月内的上调计入上限计算。时间越久远，可用空间恢复越多。",
    lMiet:"最后一次上调前的净冷租金——不是当前租金。用于计算过去3年中已使用的上限比例。示例：租金从800欧元涨到900欧元，已使用12.5%的上限——在20%限额下，还剩7.5%可用。",
    bj:"建筑年份（可入住时间）。自动设定折旧率：1925年前→2.5%，1925–2022年→2.0%，2023年起（新建）→3.0%（§7第4条EStG）。",
    sanBj:"建筑年份（可入住时间）。决定当前能效等级（A+…H）及KfW补贴资格：气候速度奖励（额外20%）仅适用于2002年1月1日前建造的建筑。",
    pers:"家庭人数 - 决定热水需求（每人每年约800 kWh）。",
    garage:"车库或停车位价格，与居住区分开。交易费用按总价计算。",
    mieteQm:"每平方米居住面积的冷租金。乘以面积即为月冷租金。",
    ogdecke:"顶层天花板隔热 - 完整屋顶翻新的经济替代方案。",
    batterie:"电池储能容量（kWh）。经验法则：容量 ≈ PV 功率（kWp）。",
    sondertilg:"年度特别还款 - 通常贷款的5%/年。必须合同约定（德国民法典第500条）。",
    epStrom:"每千瓦时当前电价。德国平均约 0.35 €/kWh。与热泵、光伏、电动车相关。",
    epHeiz:"天然气、燃油、颗粒、区域供热的每千瓦时供暖成本。天然气约 0.12 €、燃油约 0.10 €、颗粒约 0.07 €、区域供热约 0.12 €。",
    fasFl:"估计的外墙面积。取决于附属情况。",
    daFl:"双坡顶：约地面面积 × 1.4，平顶：≈ 地面面积。",
    keFl:"地下室天花板面积。对于无供暖的地下室建议。",
    pvLeistung:"1 kWp ≈ 7 m² 屋顶面积。年产量约 950 kWh/kWp。",
    isfp:"个人能源改造路线图：认证能源顾问制定个性化改造计划。奖励：每项BEG措施+5% BAFA补贴。咨询费用50%受补贴。下订单前申请！"
  },
  hi:{
    kaufpreis:"क्लोजिंग लागत को छोड़कर सहमत खरीद मूल्य।",
    flaeche:"जर्मन WoFlV विनियमन के अनुसार शुद्ध रहने का क्षेत्र।",
    kaltmiete:"उपयोगिताओं को छोड़कर शुद्ध ठंडा किराया।",
    nichtUml:"किरायेदारों पर शुल्क नहीं किए जा सकने वाले खर्च: प्रबंधन, रखरखाव, आरक्षित।",
    leerstand:"विश्लेषण अवधि में अपेक्षित खाली महीने। यथार्थवादी: 10 वर्षों में 2-4 महीने।",
    eigenkapital:"खरीद के लिए तरल धन। नियम: कम से कम क्लोजिंग लागत + खरीद मूल्य का 20%।",
    zinssatz:`प्रति वर्ष नाममात्र दर (प्रभावी दर नहीं)। वर्तमान बाजार औसत: ${MARKET_RATES.avg}% (${MARKET_RATES.stand} तक)। स्रोत: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank।`,
    tilgung:"वार्षिक प्रारंभिक चुकौती दर। सिफारिश: उचित अवधि के लिए कम से कम 2-3%।",
    grEst:"रियल एस्टेट हस्तांतरण कर (GrEStG) - जर्मन राज्य के अनुसार 3.5%-6.5%।",
    notar:"नोटरी और भूमि रजिस्ट्री लागत, खरीद मूल्य का लगभग 1.5-2%।",
    makler:"रियल एस्टेट एजेंट कमीशन - 12/2020 से खरीदार और विक्रेता के बीच साझा (अधिकतम 3.57%)।",
    steuersatz:"एकजुटता अधिभार सहित व्यक्तिगत सीमांत कर दर (आमतौर पर 25-42%)।",
    afa:"जर्मन आयकर अधिनियम § 7 के अनुसार मूल्यह्रास। 1925 से रैखिक 2%, 2023 से नई इमारतों के लिए 3%।",
    grundAnteil:"मूल्यह्रास नहीं। शहरों में आमतौर पर 20%, ग्रामीण 10-15%।",
    gebAnteil:"भवन मूल्य - AfA दर के अनुसार मूल्यह्रास।",
    wertP:"दीर्घकालिक ऐतिहासिक मूल्य वृद्धि प्रति वर्ष 2-3%। मजबूत क्षेत्रीय भिन्नता।",
    sonder:"एकमुश्त HOA विशेष लेवी, जैसे नई हीटिंग, छत, मुखौटा नवीनीकरण, लिफ्ट। खरीदने से पहले HOA बैठक की कार्यवाही की समीक्षा करें।",
    renovierung:"खरीद पर अनुमानित नवीनीकरण लागत। 15% सीमा पार होने पर पूंजीकरण आवश्यक।",
    vgl:"प्रति m² स्थानीय तुलनात्मक किराया (किराया सूचकांक, डेटाबेस या मूल्यांकनकर्ता)।",
    vglRendite:"प्रति m² स्थानीय तुलनात्मक किराया (Mietspiegel)। दो तरह से काम करता है: (1) किराया वृद्धि योजना को सीमित करता है — § 558 BGB बचे हुए कैप स्थान की परवाह किए बिना इस मूल्य से ऊपर वृद्धि की अनुमति नहीं देता। (2) यदि वर्तमान किराया 15% से अधिक कम है, तो क्रमिक समायोजन की सलाह दिखाई जाती है। स्रोत: स्थानीय किराया सूचकांक, डेटाबेस या विशेषज्ञ मूल्यांकन।",
    vglMiete:"§ 558 अनु. 1 BGB के अनुसार कानूनी ऊपरी सीमा — बचे हुए कैप स्थान की परवाह किए बिना किराया कभी भी स्थानीय तुलनात्मक किराए से ऊपर नहीं बढ़ाया जा सकता। मूल्य को अंतर्निहित किराया वृद्धि पूर्वानुमान का उपयोग करके आगे प्रक्षेपित किया जाता है। स्रोत: स्थानीय किराया सूचकांक, डेटाबेस या विशेषज्ञ मूल्यांकन।",
    lDat:"अंतिम अनुबंध-प्रभावी किराया वृद्धि की तारीख। दो समयसीमाएँ निर्धारित करती है: (1) 15 महीने की प्रतीक्षा — अगली वृद्धि इस तारीख से कम से कम 15 महीने बाद ही हो सकती है (§ 558 अनु. 1 BGB)। (2) 3 साल की रोलिंग विंडो — केवल पिछले 36 महीनों की वृद्धि कैप में गिनी जाती है। जितना पुराना, उतना अधिक मार्जिन वापस आता है।",
    lMiet:"अंतिम वृद्धि से पहले का शुद्ध ठंडा किराया — वर्तमान किराया नहीं। पिछले 3 वर्षों में उपयोग किए गए कैप की गणना के लिए आवश्यक। उदाहरण: किराया ₹800 से ₹900 हुआ तो 12.5% कैप उपयोग हो गई — 20% सीमा में 7.5% अभी भी उपलब्ध है।",
    bj:"संपत्ति का निर्माण वर्ष (रहने योग्य होने की तिथि)। AfA दर स्वतः निर्धारित करता है: 1925 से पहले → 2.5%, 1925–2022 → 2.0%, 2023 से (नया निर्माण) → 3.0% (§ 7 Abs. 4 EStG)।",
    sanBj:"संपत्ति का निर्माण वर्ष (रहने योग्य होने की तिथि)। वर्तमान ऊर्जा वर्ग (A+…H) और KfW सब्सिडी पात्रता निर्धारित करता है: जलवायु गति बोनस (20% अतिरिक्त) केवल 01.01.2002 से पहले बनी इमारतों पर लागू।",
    pers:"घर में व्यक्ति - गर्म पानी की मांग निर्धारित करता है (~800 kWh/व्यक्ति/वर्ष)।",
    garage:"गैरेज या पार्किंग स्थान का मूल्य, रहने के क्षेत्र से अलग। क्लोजिंग लागत कुल मूल्य पर गणना की जाती है।",
    mieteQm:"प्रति m² रहने के क्षेत्र का ठंडा किराया। क्षेत्र से गुणा मासिक ठंडा किराया देता है।",
    ogdecke:"शीर्ष मंजिल छत इन्सुलेशन - पूर्ण छत नवीनीकरण के लिए लागत प्रभावी विकल्प।",
    batterie:"kWh में बैटरी भंडारण क्षमता। नियम: क्षमता ≈ kWp में PV शक्ति।",
    sondertilg:"वार्षिक विशेष चुकौती - आमतौर पर ऋण का 5%/वर्ष। अनुबंध में सहमत होना चाहिए (§ 500 BGB)।",
    epStrom:"प्रति kWh वर्तमान बिजली मूल्य। जर्मन औसत लगभग 0.35 €/kWh। हीट पंप, PV, EV के लिए प्रासंगिक।",
    epHeiz:"गैस, तेल, पैलेट, ज़िला हीटिंग के लिए प्रति kWh हीटिंग लागत। गैस ~0.12 €, तेल ~0.10 €, पैलेट ~0.07 €, ज़िला हीटिंग ~0.12 €।",
    fasFl:"अनुमानित मुखौटा क्षेत्र। संलग्नक स्थिति पर निर्भर।",
    daFl:"ढलान छत: ~जमीन क्षेत्र × 1.4, समतल छत: ≈ जमीन क्षेत्र।",
    keFl:"तहखाने की छत का क्षेत्र। बिना गर्म तहखाने के लिए अनुशंसित।",
    pvLeistung:"1 kWp ≈ 7 m² छत क्षेत्र। वार्षिक उत्पादन ~950 kWh/kWp।",
    isfp:"व्यक्तिगत ऊर्जा नवीनीकरण रोडमैप: प्रमाणित ऊर्जा सलाहकार चरण-दर-चरण योजना बनाता है। पुरस्कार: हर BEG उपाय पर +5% BAFA सब्सिडी। परामर्श 50% अनुदानित। ऑर्डर से पहले आवेदन करें!"
  }
};


const LEG={
  rendite:[
    {law:"§ 21 EStG",desc:"Einkünfte aus Vermietung und Verpachtung - steuerliche Behandlung der Mieteinnahmen."},
    {law:"§ 7 Abs. 4 EStG",desc:"AfA - Absetzung für Abnutzung: 2% p.a. linear (Baujahr ≥1925), 3% bei Neubau seit 2023."},
    {law:"§ 9 EStG",desc:"Werbungskosten: Zinsen, Verwaltung, Instandhaltung, Fahrtkosten etc. absetzbar."},
    {law:"GrEStG",desc:"Grunderwerbsteuergesetz - Steuersätze variieren zwischen Bundesländern (3,5%-6,5%)."},
    {law:"§ 558 BGB",desc:"Kappungsgrenze: Mieterhöhung max. 20% in 3 J., 15% bei angespanntem Wohnungsmarkt."},
    {law:"§§ 556d-g BGB",desc:"Mietpreisbremse bei Neuvermietung in Gebieten mit angespanntem Wohnungsmarkt."}
  ],
  kredit:[
    {law:"§§ 488-498 BGB",desc:"Darlehensvertrag - Rechte und Pflichten zwischen Darlehensnehmer und Bank."},
    {law:"§ 489 BGB",desc:"Sonderkündigungsrecht: Nach 10 Jahren Zinsbindung kostenlose Ablösung mit 6 Monaten Frist."},
    {law:"§ 500 Abs. 2 BGB",desc:"Vorzeitige Rückzahlung - Sondertilgungen nach vertraglicher Vereinbarung."},
    {law:"§ 502 BGB",desc:"Vorfälligkeitsentschädigung bei vorzeitiger Ablösung innerhalb der Zinsbindung."},
    {law:"PAngV",desc:"Preisangabenverordnung - Banken müssen den effektiven Jahreszins ausweisen."}
  ],
  miete:[
    {law:"§ 558 BGB",desc:"Mieterhöhung bis zur ortsüblichen Vergleichsmiete - Kappungsgrenze 20% (15% angespannt)."},
    {law:"§ 558 Abs. 1 S. 2 BGB",desc:"15-Monats-Sperrfrist: Nächste Erhöhung frühestens 15 Monate nach letzter."},
    {law:"§ 558a BGB",desc:"Formale Anforderungen: Mieterhöhung schriftlich, Begründung (Mietspiegel o.ä.)."},
    {law:"§ 558b BGB",desc:"Mieter hat 2 Monate Zustimmungsfrist - bei Ablehnung Klage möglich."},
    {law:"§ 559 BGB",desc:"Modernisierungsumlage: 8% der Kosten auf Jahresmiete umlegbar."},
    {law:"§§ 556d-g BGB",desc:"Mietpreisbremse - max. 10% über Vergleichsmiete bei Neuvermietung."}
  ],
  sanier:[
    {law:"GEG (Gebäudeenergiegesetz 2024)",desc:"Energetische Mindestanforderungen und Nachrüstpflichten für Gebäude."},
    {law:"§ 71 GEG",desc:"Ab 2024: Neue Heizungen müssen 65% erneuerbare Energien nutzen (mit Übergangsfristen)."},
    {law:"§ 72 GEG",desc:"Austauschpflicht: Heizungen älter als 30 Jahre müssen ersetzt werden (mit Ausnahmen)."},
    {law:"§ 47 GEG",desc:"Nachrüstpflichten nach Eigentümerwechsel: Oberste Geschossdecke, Heizungsrohre."},
    {law:"BEG (Bundesförderung effiziente Gebäude)",desc:"KfW 261 (Wohngebäude-Kredit) und BAFA BEG EM (Einzelmaßnahmen-Zuschuss)."},
    {law:"§ 35c EStG",desc:"Steuerbonus: 20% der Kosten über 3 Jahre bei selbstgenutzten Immobilien (max. 40.000€)."},
    {law:"iSFP (individueller Sanierungsfahrplan)",desc:"Förderbonus +5% bei BAFA-Maßnahmen mit zertifiziertem Energieberater."}
  ]
};

function Tip({text,label}){
  const[s,setS]=useState(false);const ref=useRef();const[tipPos,setTipPos]=useState({top:0,left:0});
  const{t}=useApp();
  const isMobile=typeof window!=="undefined"&&window.matchMedia("(hover:none) and (pointer:coarse)").matches;
  useLayoutEffect(()=>{if(s&&ref.current&&!isMobile){const r=ref.current.getBoundingClientRect();const tipW=220,btnW=13,pad=8;const ideal=r.left+btnW/2-tipW/2;const left=Math.max(pad,Math.min(window.innerWidth-tipW-pad,ideal));setTipPos({top:r.top+window.scrollY-6,left})}},[s]);
  useEffect(()=>{if(!s)return;const h=e=>{if(e.key==="Escape")setS(false)};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[s]);
  return <span ref={ref} style={{position:"relative",display:"inline-block",marginLeft:4}}>
    <span onClick={e=>{e.stopPropagation();setS(!s)}} onMouseEnter={!isMobile?()=>setS(true):undefined} onMouseLeave={!isMobile?()=>setS(false):undefined}
      style={{cursor:"help",display:"inline-flex",alignItems:"center",justifyContent:"center",width:13,height:13,borderRadius:"50%",border:"1px solid var(--ch)",color:"var(--ch)",fontSize:9,fontWeight:600,background:"var(--cc)"}}>?</span>
    {!isMobile&&s&&createPortal(<div style={{position:"absolute",top:tipPos.top,left:tipPos.left,transform:"translateY(-100%)",width:220,padding:"8px 10px",background:"#1a1a1a",color:"#fff",fontSize:11,lineHeight:1.4,borderRadius:6,zIndex:9999,pointerEvents:"none",whiteSpace:"normal",fontWeight:400}}>{text}</div>,document.body)}
    {isMobile&&s&&createPortal(<div onClick={()=>setS(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"flex-end"}}><div onClick={e=>e.stopPropagation()} style={{width:"100%",background:"var(--cc)",borderRadius:"16px 16px 0 0",padding:"1rem 1.25rem 2rem",borderTop:"1px solid var(--cb)"}}><div style={{width:36,height:4,background:"var(--cb)",borderRadius:2,margin:"0 auto 1rem"}}></div>{label&&<p style={{fontSize:16,fontWeight:600,color:"var(--ct)",margin:"0 0 8px"}}>{label}</p>}<p style={{fontSize:14,color:"var(--cl)",lineHeight:1.6,margin:"0 0 1rem"}}>{text}</p><button onClick={()=>setS(false)} style={{width:"100%",padding:12,background:"#1E3A5F",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:500,cursor:"pointer"}}>{t?.close||"Schließen"}</button></div></div>,document.body)}
  </span>;
}

// Custom language selector — shows emoji flags reliably across all browsers
const LANGS=[{v:"de",flag:"🇩🇪",label:"DE"},{v:"en",flag:"🇬🇧",label:"EN"},{v:"tr",flag:"🇹🇷",label:"TR"},{v:"zh",flag:"🇨🇳",label:"ZH"},{v:"hi",flag:"🇮🇳",label:"HI"}];
function LangSel({lang,setLang}){
  const[open,setOpen]=useState(false);
  const ref=useRef();
  const cur=LANGS.find(l=>l.v===lang)||LANGS[0];
  useEffect(()=>{
    if(!open)return;
    const handler=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[open]);
  return <div ref={ref} style={{position:"relative",userSelect:"none"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",border:"1px solid var(--cb)",borderRadius:8,background:"var(--ci)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:600,color:"var(--ct)",minHeight:38}}>
      <span style={{fontSize:20,lineHeight:1}}>{cur.flag}</span>
      <span style={{fontSize:12,color:"var(--ch)"}}>{cur.label}</span>
      <span style={{fontSize:9,color:"var(--ch)",marginLeft:1}}>{open?"▲":"▼"}</span>
    </button>
    {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",right:0,background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.1)",zIndex:200,overflow:"hidden",minWidth:90}}>
      {LANGS.map(l=><button key={l.v} onClick={()=>{setLang(l.v);setOpen(false)}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",width:"100%",border:"none",borderBottom:"1px solid var(--cb)",background:l.v===lang?"var(--ca-bg)":"var(--cc)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:l.v===lang?700:500,color:l.v===lang?"var(--ca)":"var(--ct)",textAlign:"left"}}>
        <span style={{fontSize:18,lineHeight:1}}>{l.flag}</span>
        <span>{l.label}</span>
      </button>)}
    </div>}
  </div>;
}

function Legal({items}){const{t}=useApp();
  const[o,setO]=useState(false);
  return <div style={{marginTop:16,borderTop:"1px solid var(--cb)",paddingTop:12}}>
    <button onClick={()=>setO(!o)} style={{background:"none",border:"none",fontSize:11,color:"var(--ch)",cursor:"pointer",padding:0,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
      <span>📚 {t.rechtlGrundlagen}</span><span>{o?"▲":"▼"}</span>
    </button>
    {o&&<div style={{marginTop:10,fontSize:11,color:"var(--ch)",lineHeight:1.7}}>
      {items.map((it,i)=><div key={i} style={{marginBottom:6,padding:"8px 10px",background:"var(--ci)",borderRadius:6}}><div style={{fontWeight:600,color:"var(--cl)",marginBottom:2}}>{it.law}</div><div>{it.desc}</div></div>)}
      <div style={{marginTop:10,fontSize:10,fontStyle:"italic"}}>{t.rechtsHinweis}</div>
    </div>}
  </div>;
}

function LineChart({rows,zbJ}){
  const{t}=useApp();
  const[hover,setHover]=useState(null);
  const[hoverCF,setHoverCF]=useState(null);
  const W=400,H=250,pl=44,pr=44,pt=20,pb=20;
  const pw=W-pl-pr,ph=H-pt-pb,n=rows.length;
  if(n<2)return null;

  // Main chart: Restschuld + kum. Cashflow + Jahresmiete
  const rA=rows.map(r=>r.rest),cA=rows.map(r=>r.cfKum),mA=rows.map(r=>r.miete);
  const mxR=Math.max(...rA,...mA,1);  // left axis includes both Restschuld and Jahresmiete
  const all=[...cA,0];
  const mnS=Math.min(...all),mxS=Math.max(...all),rS=mxS-mnS||1;
  const xS=i=>pl+(i/(n-1))*pw;
  const yL=v=>pt+ph*(1-v/mxR);
  const yR=v=>pt+ph*(1-(v-mnS)/rS);
  const pL=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yL(v)).join(" ");
  const pR=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yR(v)).join(" ");
  const fK=v=>Math.round(v/1000)+"k";
  const step=Math.max(1,Math.floor(n/10));
  const zbIdx=zbJ&&zbJ<=n?zbJ-1:null;

  // CF chart: monatlicher CF ohne/mit Steuer
  const cfOhneArr=rows.map(r=>(r.cfOhneSt??r.cf-r.steuer)/12);
  const cfMitArr=rows.map(r=>r.cf/12);
  const allCF=[...cfOhneArr,...cfMitArr,0];
  const mnCF=Math.min(...allCF),mxCF=Math.max(...allCF),rCF=mxCF-mnCF||1;
  const yCF=v=>pt+ph*(1-(v-mnCF)/rCF);
  const pCF=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yCF(v)).join(" ");
  const zero0=mnCF<=0&&mxCF>=0?yCF(0):null;

  return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>

    {/* ── Chart 1: Restschuld / kum. CF / Miete ── */}
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:8}}>{t.chartTitle1}</div>
    <div style={{display:"flex",gap:14,fontSize:10,marginBottom:6,color:"var(--ch)",flexWrap:"wrap"}}>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px solid #c0392b",verticalAlign:"middle",marginRight:4}}/>{t.chartRestschuld}</span>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px solid #22c55e",verticalAlign:"middle",marginRight:4}}/>{t.chartKumCF}</span>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #e8600a",verticalAlign:"middle",marginRight:4}}/>{t.chartJahresmiete}</span>
      {zbIdx!==null&&<span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #f59e0b",verticalAlign:"middle",marginRight:4}}/>{t.chartZinsbind}</span>}
    </div>
    <div style={{position:"relative",overflowX:"auto"}}>
      <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{fontSize:10,fontFamily:"inherit"}}>
        {[0,.25,.5,.75,1].map((f,i)=><line key={i} x1={pl} x2={W-pr} y1={pt+ph*f} y2={pt+ph*f} stroke="var(--cb)" strokeWidth="0.5"/>)}
        {zbIdx!==null&&<line x1={xS(zbIdx)} x2={xS(zbIdx)} y1={pt} y2={pt+ph} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3"/>}
        {zbIdx!==null&&<text x={xS(zbIdx)} y={pt-6} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="600">ZB</text>}
        <path d={pL(rA)} stroke="#c0392b" strokeWidth="1.8" fill="none"/>
        <path d={pR(cA)} stroke="#22c55e" strokeWidth="1.8" fill="none"/>
        <path d={pL(mA)} stroke="#e8600a" strokeWidth="1.8" strokeDasharray="4 3" fill="none"/>
        {rA.map((v,i)=><circle key={"r"+i} cx={xS(i)} cy={yL(v)} r={hover===i?4:2} fill="#c0392b" style={{transition:"r .15s"}}/>)}
        {cA.map((v,i)=><circle key={"c"+i} cx={xS(i)} cy={yR(v)} r={hover===i?4:2} fill="#22c55e" style={{transition:"r .15s"}}/>)}
        {rows.map((r,i)=>((i%step===0)||i===n-1)&&<text key={"x"+i} x={xS(i)} y={H-pb+14} textAnchor="middle" fill="var(--ch)">J{i+1}</text>)}
        {[0,.5,1].map((f,i)=><text key={"yl"+i} x={pl-4} y={pt+ph*f+3} textAnchor="end" fill="#c0392b" fontSize="8">{fK(mxR*(1-f))}</text>)}
        {[0,.5,1].map((f,i)=><text key={"yr"+i} x={W-pr+4} y={pt+ph*f+3} fill="#22c55e" fontSize="8">{fK(mnS+rS*(1-f))}</text>)}
        {hover!==null&&<line x1={xS(hover)} x2={xS(hover)} y1={pt} y2={pt+ph} stroke="var(--ch)" strokeWidth="0.5" strokeDasharray="2 2"/>}
        {rows.map((r,i)=><rect key={"h"+i} x={xS(i)-(i===0?0:pw/(n-1)/2)} y={pt} width={i===0||i===n-1?pw/(n-1)/2:pw/(n-1)} height={ph} fill="transparent" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{cursor:"crosshair"}}/>)}
      </svg>
      {hover!==null&&rows[hover]&&<div style={{position:"absolute",top:0,left:xS(hover)>W/2?"auto":"calc("+xS(hover)*100/W+"% + 8px)",right:xS(hover)>W/2?"calc("+(100-xS(hover)*100/W)+"% + 8px)":"auto",background:"#1a1a1a",color:"#fff",borderRadius:8,padding:"8px 10px",fontSize:10,lineHeight:1.6,zIndex:10,pointerEvents:"none",minWidth:150,boxShadow:"0 4px 12px rgba(0,0,0,.25)"}}>
        <div style={{fontWeight:600,marginBottom:4,borderBottom:"1px solid #444",paddingBottom:3}}>J{rows[hover].j}{zbIdx!==null&&rows[hover].j===zbJ?" ◀ ZB":""}</div>
        <div style={{color:"#ef8888"}}>{t.chartRestschuld}: {fmtE(rows[hover].rest)}</div>
        <div style={{color:"#ef8888"}}>{t.gZin}: {fmtE(rows[hover].zinsen)}</div>
        <div style={{color:"#6ddb8a"}}>{t.steuerErs}: {fmtE(rows[hover].steuer)}</div>
        <div style={{color:"#ffa64d"}}>{t.chartHoverJahresmiete}: {fmtE(rows[hover].miete)}</div>
        <div style={{color:(rows[hover].cfOhneSt??0)>=0?"#ffa64d":"#ef8888",marginTop:2}}>{t.chartHoverCFOhne}: {fmtE(rows[hover].cfOhneSt??0)}</div>
        <div style={{color:rows[hover].cf>=0?"#6ddb8a":"#ef8888"}}>{t.chartHoverCFMit}: {fmtE(rows[hover].cf)}</div>
        <div style={{color:rows[hover].cfKum>=0?"#6ddb8a":"#ef8888",borderTop:"1px solid #444",paddingTop:3,marginTop:3}}>{t.chartHoverKumCF}: {fmtE(rows[hover].cfKum)}</div>
      </div>}
    </div>

    {/* ── Chart 2: Monatlicher Cashflow-Verlauf (ohne / mit Steuer) ── */}
    <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid var(--cb)"}}>
      <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:8}}>{t.chartTitle2}</div>
      <div style={{display:"flex",gap:14,fontSize:10,marginBottom:6,color:"var(--ch)",flexWrap:"wrap"}}>
        <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2.5px solid #e8600a",verticalAlign:"middle",marginRight:4}}/>{t.chartCFOhne}</span>
        <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2.5px solid #22c55e",verticalAlign:"middle",marginRight:4}}/>{t.chartCFMit}</span>
        <span style={{color:"var(--ch)",fontStyle:"italic"}}>{t.chartDiff}</span>
        {zbIdx!==null&&<span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #f59e0b",verticalAlign:"middle",marginRight:4}}/>{t.chartZinsbind}</span>}
      </div>
      <div style={{position:"relative",overflowX:"auto"}}>
        <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{fontSize:10,fontFamily:"inherit"}}>
          {/* Grid lines */}
          {[0,.25,.5,.75,1].map((f,i)=><line key={i} x1={pl} x2={W-pr} y1={pt+ph*f} y2={pt+ph*f} stroke="var(--cb)" strokeWidth="0.5"/>)}
          {/* Zero line */}
          {zero0!==null&&<line x1={pl} x2={W-pr} y1={zero0} y2={zero0} stroke="var(--ch)" strokeWidth="1" strokeDasharray="3 2"/>}
          {zero0!==null&&<text x={pl-4} y={zero0+3} textAnchor="end" fill="var(--ch)" fontSize="8" fontWeight="600">0</text>}
          {/* Zinsbindung */}
          {zbIdx!==null&&<line x1={xS(zbIdx)} x2={xS(zbIdx)} y1={pt} y2={pt+ph} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3"/>}
          {zbIdx!==null&&<text x={xS(zbIdx)} y={pt-6} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="600">ZB</text>}
          {/* Area between lines (Steuervorteil) */}
          <defs>
            <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02"/>
            </linearGradient>
          </defs>
          <path d={pCF(cfOhneArr)+"L"+xS(n-1)+" "+(pt+ph)+" L"+pl+" "+(pt+ph)+" Z"} fill="url(#cfGrad)" strokeWidth="0"/>
          {/* Lines */}
          <path d={pCF(cfOhneArr)} stroke="#e8600a" strokeWidth="2" fill="none"/>
          <path d={pCF(cfMitArr)} stroke="#22c55e" strokeWidth="2" fill="none"/>
          {/* Dots */}
          {cfOhneArr.map((v,i)=><circle key={"co"+i} cx={xS(i)} cy={yCF(v)} r={hoverCF===i?4:2} fill="#e8600a" style={{transition:"r .15s"}}/>)}
          {cfMitArr.map((v,i)=><circle key={"cm"+i} cx={xS(i)} cy={yCF(v)} r={hoverCF===i?4:2} fill="#22c55e" style={{transition:"r .15s"}}/>)}
          {/* X axis labels */}
          {rows.map((r,i)=>((i%step===0)||i===n-1)&&<text key={"cx"+i} x={xS(i)} y={H-pb+14} textAnchor="middle" fill="var(--ch)">J{i+1}</text>)}
          {/* Y labels */}
          {[0,.5,1].map((f,i)=><text key={"cy"+i} x={pl-4} y={pt+ph*f+3} textAnchor="end" fill="var(--ch)" fontSize="8">{fmtE(mnCF+rCF*(1-f))}</text>)}
          {hoverCF!==null&&<line x1={xS(hoverCF)} x2={xS(hoverCF)} y1={pt} y2={pt+ph} stroke="var(--ch)" strokeWidth="0.5" strokeDasharray="2 2"/>}
          {/* Hover area */}
          {rows.map((r,i)=><rect key={"hcf"+i} x={xS(i)-(i===0?0:pw/(n-1)/2)} y={pt} width={i===0||i===n-1?pw/(n-1)/2:pw/(n-1)} height={ph} fill="transparent" onMouseEnter={()=>setHoverCF(i)} onMouseLeave={()=>setHoverCF(null)} style={{cursor:"crosshair"}}/>)}
        </svg>
        {hoverCF!==null&&rows[hoverCF]&&<div style={{position:"absolute",top:0,left:xS(hoverCF)>W/2?"auto":"calc("+xS(hoverCF)*100/W+"% + 8px)",right:xS(hoverCF)>W/2?"calc("+(100-xS(hoverCF)*100/W)+"% + 8px)":"auto",background:"#1a1a1a",color:"#fff",borderRadius:8,padding:"8px 10px",fontSize:10,lineHeight:1.6,zIndex:10,pointerEvents:"none",minWidth:160,boxShadow:"0 4px 12px rgba(0,0,0,.25)"}}>
          <div style={{fontWeight:600,marginBottom:4,borderBottom:"1px solid #444",paddingBottom:3}}>J{rows[hoverCF].j}</div>
          <div style={{color:"#ffa64d"}}>{t.cfOhneSt}: {fmtE(cfOhneArr[hoverCF])}</div>
          <div style={{color:"#6ddb8a"}}>{t.cfMitSt}: {fmtE(cfMitArr[hoverCF])}</div>
          <div style={{color:"#aaa",marginTop:2}}>{t.chartHoverSteuervorteil}: {fmtE(cfMitArr[hoverCF]-cfOhneArr[hoverCF])}</div>
        </div>}
      </div>
      <div style={{fontSize:10,color:"var(--ch)",marginTop:6,fontStyle:"italic"}}>{t.chartDisclamer}</div>
    </div>
  </div>;
}

function YearTable({rows,zbJ}){
  const{t}=useApp();
  const sum=rows.reduce((s,r)=>({zinsen:s.zinsen+r.zinsen,tilgB:s.tilgB+r.tilgB,zt:s.zt+r.zt,steuer:s.steuer+r.steuer,miete:s.miete+r.miete,cf:s.cf+r.cf,cfOhneSt:s.cfOhneSt+(r.cfOhneSt??r.cf-r.steuer)}),{zinsen:0,tilgB:0,zt:0,steuer:0,miete:0,cf:0,cfOhneSt:0});
  const stickyJ={padding:"4px 8px",textAlign:"left",fontWeight:600,position:"sticky",left:0,background:"var(--ci)",zIndex:2,whiteSpace:"nowrap",borderRight:"1px solid var(--cb)"};
  const stickyH={padding:"4px 8px",textAlign:"left",fontWeight:500,color:"var(--ch)",position:"sticky",left:0,background:"var(--ci)",zIndex:3,borderRight:"1px solid var(--cb)"};
  const td={padding:"4px 8px",textAlign:"right",whiteSpace:"nowrap"};
  return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:4}}>{t.tblTitle} ({rows.length} J.)</div>
    <div style={{fontSize:10,color:"var(--ch)",marginBottom:8,lineHeight:1.5}}>
      {t.tblCFOhne} = {t.cfBasis} &nbsp;|&nbsp; {t.tblCFMit} = + {t.steuerErs} (AfA × {t.steuersatz})
    </div>
    {/* Mobile scroll hint */}
    <div style={{fontSize:9,color:"var(--ch)",marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
      <span style={{opacity:.6}}>↔ scrollbar</span>
    </div>
    <div style={{overflowX:"auto",borderRadius:8,border:"1px solid var(--cb)"}}>
      <table style={{fontSize:10,borderCollapse:"collapse",minWidth:580,width:"100%"}}>
        <thead>
          <tr style={{background:"var(--ci)",borderBottom:"2px solid var(--cb)"}}>
            <th style={stickyH}>{t.jahre}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.chartRestschuld}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.gZin}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.tilgung}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.steuerErs}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.tblJahresmiete}</th>
            <th style={{...td,textAlign:"right",fontWeight:700,color:"var(--ca)"}}>{t.tblCFOhne}</th>
            <th style={{...td,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{t.tblCFMit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>{
            const cfO=r.cfOhneSt??r.cf-r.steuer;
            const isZB=zbJ&&r.j===zbJ;
            return <tr key={r.j} style={{borderBottom:"1px solid var(--cb)",background:isZB?"#FFF8E6":"transparent"}}>
              <td style={{...stickyJ,background:isZB?"#FFF8E6":"var(--ci)"}}>
                {r.j}{isZB&&<span style={{fontSize:8,color:"#b8860b",marginLeft:4}}>◀ ZB</span>}
              </td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.rest)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.zinsen)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.tilgB)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.steuer)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.miete)}</td>
              <td style={{...td,fontWeight:600,color:cfO>=0?"#22c55e":"#ef4444"}}>{fmtE(cfO)}</td>
              <td style={{...td,fontWeight:600,color:r.cf>=0?"#22c55e":"#ef4444"}}>{fmtE(r.cf)}</td>
            </tr>;
          })}
          {zbJ&&zbJ<=rows.length&&<tr style={{fontSize:9,background:"#FFF8E6"}}>
            <td colSpan={8} style={{padding:"4px 8px",color:"#b8860b"}}>{t.zinsbindung} {zbJ} J. — {t.chartRestschuld} {fmtE(rows[zbJ-1]?.rest||0)}</td>
          </tr>}
          <tr style={{fontWeight:700,borderTop:"2px solid var(--ct)",background:"var(--ci)"}}>
            <td style={{...stickyJ,fontWeight:700}}>{t.tblSumme}</td>
            <td style={{...td,color:"var(--ch)"}}>—</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.zinsen)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.tilgB)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.steuer)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.miete)}</td>
            <td style={{...td,fontWeight:700,color:sum.cfOhneSt>=0?"#22c55e":"#ef4444"}}>{fmtE(sum.cfOhneSt)}</td>
            <td style={{...td,fontWeight:700,color:sum.cf>=0?"#22c55e":"#ef4444"}}>{fmtE(sum.cf)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>;
}

function Detail({R,d,hideSaldo=false}){
  const{t}=useApp();
  const ek=+d.eigenkapital||0,sonder=+d.sonder||0,ren=+d.renovierung||0;
  const vw=R.vw;
  const rsEnd=R.rsEnd||0;
  const sumN=ek+(R.nbk||0)+sonder+ren+rsEnd;

  // Erträge — beide CF-Varianten
  const erloesVerkauf=vw;
  const sumPOhne=erloesVerkauf+(R.sCFOhne||0);
  const sumPMit=erloesVerkauf+R.sCF;
  const totalOhne=(R.gOhne!=null?R.gOhne:sumPOhne-sumN);
  const totalMit=R.g;
  const rendEKOhne=ek>0?totalOhne/ek*100:0;
  const rendEKMit=ek>0?totalMit/ek*100:0;
  const isPosOhne=totalOhne>=0;
  const isPosMit=totalMit>=0;

  const rowStyle={padding:"5px 0",fontSize:11,borderBottom:"1px solid var(--cb)"};
  const rowFlex={display:"flex",justifyContent:"space-between",alignItems:"baseline"};

  return <div style={{marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:4}}>{t.detTitle} {R.j} {t.detJahren}</div>
    <div style={{fontSize:10,color:"var(--ch)",marginBottom:12}}>{t.detSub}</div>

    {/* Erträge + Aufwendungen nebeneinander */}
    <div className="if-row" style={{marginBottom:12}}>

      {/* ERTRÄGE */}
      <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderTop:"3px solid #22c55e",borderRadius:10,padding:"12px"}}>
        <div style={{fontSize:10,color:"#22c55e",fontWeight:700,marginBottom:8,letterSpacing:.8}}>{t.ertraege}</div>
        <div style={rowStyle}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detErloes}</span><span style={{color:"#22c55e",fontWeight:600}}>{fmtE(erloesVerkauf)}</span></div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:2}}>{t.kaufpreis} {fmtE(R.gKP||+d.kaufpreis||0)} + {fmtP(+d.wertP||0,1)} p.a. {t.wertP}</div>
        </div>
        <div style={rowStyle}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detCumCFOhne}</span><span style={{color:"var(--ca)",fontWeight:600}}>{fmtE(R.sCFOhne||0)}</span></div>
        </div>
        <div style={{...rowStyle,borderBottom:"none"}}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detCumSteuer}</span><span style={{color:"#22c55e",fontWeight:600}}>{fmtE(R.sSt||0)}</span></div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:2}}>{t.detSteuerHinweis}</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",marginTop:4,borderTop:"1px solid var(--cb)"}}>
          <div>
            <div style={{fontSize:10,fontWeight:500,color:"var(--ch)"}}>{t.detSumme} {t.saldoOhne}</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--ca)"}}>{fmtE(sumPOhne)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,fontWeight:500,color:"var(--ch)"}}>{t.detSumme} {t.saldoMit}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#22c55e"}}>{fmtE(sumPMit)}</div>
          </div>
        </div>
      </div>

      {/* AUFWENDUNGEN */}
      <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderTop:"3px solid #ef4444",borderRadius:10,padding:"12px"}}>
        <div style={{fontSize:10,color:"#ef4444",fontWeight:700,marginBottom:8,letterSpacing:.8}}>{t.aufwend}</div>
        {(()=>{const aufItems=[{l:t.eigenkapital,v:ek},{l:t.nbk,v:R.nbk},{l:t.sonderUml,v:sonder},...(ren>0?[{l:t.renovierung,v:ren}]:[]),{l:t.chartRestschuld,v:rsEnd}];return aufItems.map((i,k)=><div key={k} style={{...rowStyle,borderBottom:k===aufItems.length-1?"none":"1px solid var(--cb)"}}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{i.l}</span><span style={{color:"#ef4444",fontWeight:500}}>{fmtE(i.v)}</span></div>
        </div>);})()}
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",marginTop:4,borderTop:"1px solid var(--cb)"}}>
          <span style={{fontSize:12,fontWeight:600}}>{t.detSumme}</span>
          <span style={{fontSize:14,fontWeight:700,color:"#ef4444"}}>{fmtE(sumN)}</span>
        </div>
      </div>
    </div>

    {!hideSaldo&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:8}}>
      {/* Ohne Steuervorteil */}
      <div style={{padding:"14px",background:isPosOhne?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",borderRadius:10,border:`1px solid ${isPosOhne?"#22c55e44":"#ef444444"}`,borderTop:`4px solid ${isPosOhne?"#22c55e":"#ef4444"}`}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,color:"var(--ch)",marginBottom:6,textTransform:"uppercase"}}>{t.gSaldoOhne}</div>
        <div style={{fontSize:22,fontWeight:800,color:isPosOhne?"#15803d":"#b91c1c",fontVariantNumeric:"tabular-nums"}}>{isPosOhne?"+":""}{fmtE(totalOhne)}</div>
        <div style={{fontSize:10,color:"var(--ch)",marginTop:5,lineHeight:1.5}}>
          <span style={{fontWeight:600}}>{t.detEKR}:</span> {fmtP(rendEKOhne)} ({fmtP(rendEKOhne/R.j)} p.a.)
        </div>
        <div style={{fontSize:9,color:"var(--ch)",marginTop:4,lineHeight:1.4,opacity:.8}}>{t.sec6SaldoOhneHint}</div>
      </div>

      {/* Mit Steuervorteil */}
      <div style={{padding:"14px",background:isPosMit?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",borderRadius:10,border:`1px solid ${isPosMit?"#22c55e44":"#ef444444"}`,borderTop:`4px solid ${isPosMit?"#22c55e":"#ef4444"}`}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,color:"var(--ch)",marginBottom:6,textTransform:"uppercase"}}>{t.gSaldoMit}</div>
        <div style={{fontSize:22,fontWeight:800,color:isPosMit?"#15803d":"#b91c1c",fontVariantNumeric:"tabular-nums"}}>{isPosMit?"+":""}{fmtE(totalMit)}</div>
        <div style={{fontSize:10,color:"var(--ch)",marginTop:5,lineHeight:1.5}}>
          <span style={{fontWeight:600}}>{t.detEKR}:</span> {fmtP(rendEKMit)} ({fmtP(rendEKMit/R.j)} p.a.)
        </div>
        <div style={{fontSize:9,color:"var(--ch)",marginTop:4,lineHeight:1.4,opacity:.8}}>{t.sec6SaldoMitHint}</div>
        <div style={{fontSize:9,color:"var(--ch)",marginTop:4,lineHeight:1.4,borderTop:"1px solid var(--cb)",paddingTop:4}}>
          {t.detInfo}
        </div>
      </div>
    </div>}
  </div>;
}


function ExportPDF({title}){const{t}=useApp();
  const doExport=async()=>{
    const rp=document.querySelector(".res-pane");
    if(!rp)return;
    // iOS Safari: window.open() muss synchron im User-Gesture-Kontext aufgerufen werden
    // → sofort öffnen, bevor irgendein await den Kontext bricht
    const w=window.open("","_blank");
    // Alle Sektionen aufklappen bevor wir den DOM klonen (Content ist sonst nicht im DOM)
    const expandBtn=rp.querySelector('[data-pdf-expand]');
    if(expandBtn&&expandBtn.textContent.includes("⊕")){expandBtn.click();await new Promise(r=>setTimeout(r,300));}
    // Alle "Wie kommt das Ergebnis zustande?" Toggles aufklappen (eigener lokaler State)
    const detailBtns=rp.querySelectorAll('[data-pdf-detail]');
    detailBtns.forEach(b=>{if(!b.textContent.includes("▲"))b.click();});
    if(detailBtns.length>0)await new Promise(r=>setTimeout(r,200));
    const clone=rp.cloneNode(true);
    clone.querySelectorAll("button,.no-print").forEach(e=>e.remove());
    const vars={"var(--cc)":"#fff","var(--ct)":"#1a1a1a","var(--cl)":"#3d3d3a","var(--ch)":"#8a8a80","var(--cb)":"#e5e5dc","var(--ci)":"#fafaf7","var(--cro)":"#f0f0ea","var(--ca)":"#e8600a","var(--ca-dk)":"#c44d00","var(--ca-bg)":"#fff1e8","var(--ca-bd)":"#f5cba9","var(--bg)":"#f5f5f0"};
    let h=clone.innerHTML;
    Object.entries(vars).forEach(([k,v])=>{h=h.split(k).join(v)});
    const now=new Date().toLocaleDateString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit"});
    // Fetch logo as base64 for self-contained PDF
    const wordmark='<div style="font-size:30px;font-weight:700;letter-spacing:-.5px;color:#1a1a2e;line-height:1">immo<span style="color:#e8650a">fuchs</span>.info</div>';
    let logoHtml=`<div style="display:flex;align-items:center;gap:10px">${wordmark}</div>`;
    try{
      const resp=await fetch('/logo.png');
      if(resp.ok){
        const blob=await resp.blob();
        const b64=await new Promise(res=>{const fr=new FileReader();fr.onload=e=>res(e.target.result);fr.readAsDataURL(blob);});
        logoHtml=`<div style="display:flex;align-items:center;gap:12px"><img src="${b64}" style="height:75px;width:75px;display:block;object-fit:contain">${wordmark}</div>`;
      }
    }catch(e){}
    const doc=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Immofuchs - ${title}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a1a;padding:30px;max-width:800px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{border-collapse:collapse;width:100%}svg{max-width:100%}
.hdr-print{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e8600a}
.hdr-print-meta{text-align:right}
@media print{body{padding:15px}*{overflow:visible!important}div,table,tr,svg{break-inside:avoid;page-break-inside:avoid}h2,h3{break-after:avoid;page-break-after:avoid}}</style>
</head><body>
<div class="hdr-print"><div>${logoHtml}</div><div class="hdr-print-meta"><div style="font-size:15px;font-weight:600;color:#1a1a2e">${title}</div><div style="font-size:12px;color:#8a8a80;margin-top:3px">${now}</div></div></div>
${h}
<div style="margin-top:30px;padding-top:12px;border-top:1px solid #e5e5dc;font-size:9px;color:#8a8a80;text-align:center">Erstellt mit Immofuchs · ${now} · Keine Rechts- oder Steuerberatung</div>
</body></html>`;
    // Druckdialog → "Als PDF speichern"
    const printDoc=doc.replace("</body>","<script>setTimeout(()=>window.print(),600)<\/script></body>");
    if(w){
      w.document.open();
      w.document.write(printDoc);
      w.document.close();
    }else{
      // Fallback falls Popup doch geblockt (sehr selten nach synchronem open)
      const blob=new Blob([printDoc],{type:"text/html;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="ImmoFuchs_"+title.replace(/\s+/g,"_")+".html";a.click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    }
  };
  return <button className="no-print" onClick={doExport} style={{width:"100%",padding:"12px",border:"1px solid var(--cb)",borderRadius:10,background:"var(--ci)",color:"var(--ct)",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:12,marginBottom:4,fontFamily:"inherit"}}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    {t.pdfExport}
  </button>;
}

// ═══ HAUPTRECHNER (Rendite) ═══
function Haupt(){const{d,set,t,zinsen,tip,setTabExt,lang}=useApp();const[view,setView]=useState("input");const[secAllOpen,setSecAllOpen]=useState(false);const[secAllKey,setSecAllKey]=useState(0);
  const lastEditedRef=useRef(null);
  // mieteQm: use typed value; if empty string, don't fall back (allow clearing)
  const mieteQm=d.mieteQm!==""?+d.mieteQm||0:0;
  useEffect(()=>{
    if(lastEditedRef.current==="kalt")return;
    if(mieteQm>0&&(+d.flaeche||0)>0){
      const nM=Math.round(mieteQm*(+d.flaeche));
      if(nM!==(+d.kaltmiete||0))set("kaltmiete",String(nM));
    }
  },[mieteQm,d.flaeche]);
  useEffect(()=>{
    if(lastEditedRef.current!=="kalt")return;
    const fl=+d.flaeche||0,km=+d.kaltmiete||0;
    if(fl>0&&km>0){
      const newQm=Math.round((km/fl)*100)/100;
      if(String(newQm)!==d.mieteQm)set("mieteQm",String(newQm));
    }
    lastEditedRef.current=null;
  },[d.kaltmiete]);
  const R=useMemo(()=>{
    const kp=+d.kaufpreis||0,ga=+d.garage||0,gKP=kp+ga,qm=+d.flaeche||1,mi=+d.kaltmiete||0,ek=+d.eigenkapital||0;
    const zP=+d.zinssatz||0,tP=+d.tilgung||0,nP=+d.notar||0,mP=+d.makler||0;
    const gP=GREST[d.bundesland]||0,nu=+d.nichtUml||0,lM=+d.leerstand||0;
    const sP=+d.steuersatz||0,aP=+d.afaSatz||0,gA=+d.gebAnteil||0;
    const wP=+d.wertP||0,j=+d.jahre||10,so=+d.sonder||0,ren=+d.renovierung||0,vQ=+d.vergleichsmiete||0;
    const renGebKP=(+d.kaufpreis||0)*((+d.gebAnteil||80)/100);
    const ren15Grenze=renGebKP*0.15;
    const renUnterGrenze=ren>0&&ren<=ren15Grenze;
    const renUeberGrenze=ren>0&&ren>ren15Grenze;
    const renAfaJ=renUeberGrenze?(ren*(+d.afaSatz||2)/100):0;
    // Don't return null when kaufpreis=0 — show zeroes instead so res-pane stays visible
    const pQm=qm>0?kp/qm:0,jM=mi*12,nbk=gKP*(gP+nP+mP)/100;
    const da=Math.max(0,gKP-ek),bel=gKP>0?da/gKP*100:0;
    const mz=zP/100/12,ann=da*(zP+tP)/100/12;
    let lz=0;if(mz>0&&ann>da*mz)lz=Math.log(ann/(ann-da*mz))/Math.log(1+mz)/12;else if(mz===0&&ann>0)lz=da/ann/12;
    const tM=j*12,lF=tM>0?Math.max(0,(tM-lM)/tM):1;
    const gesamtInv=gKP+so; // Investitionsbasis inkl. Sonderumlage
    const effJ=mi*lF,bR=gesamtInv>0?jM/gesamtInv*100:0;
    const nuJ=nu*12,nR=(gesamtInv+nbk)>0?(effJ*12-nuJ)/(gesamtInv+nbk)*100:0;
    const afJ=kp*(gA/100)*(aP/100)+renAfaJ;
    const k15=isK15(d.ort)||d.bundesland==="BE"||d.bundesland==="HH",kP=k15?15:20;
    const mt=buildMP(mi,qm,vQ,kP,d.letzteErhDatum,+d.letzteErhMiete||0,j,k15,t);
    const gRJ=(jj)=>{const yS=addY(new Date(),jj-1);let r=mi;for(let i=0;i<mt.rows.length;i++){if(mt.rows[i].datum<=yS)r=mt.rows[i].neueMiete;else break}return r};
    let rs=da,sZ=0,sT=0,sSt=0,sCF=0,sCFOhne=0,sM=0,sMB=0,beJ=null;
    const yearRows=[];
    for(let jj=1;jj<=j;jj++){
      const restStart=rs;
      const mJ=gRJ(jj)*lF,jMJ=mJ*12;
      const zi=rs*(zP/100),ti=Math.min(ann*12-zi,rs),zt2=zi+ti;
      const st2=(zi+afJ+nuJ+(jj===1&&renUnterGrenze?ren:0))*(sP/100);
      const cfOhneSt=jMJ-nuJ-zt2;        // ohne Steuerersparnis
      const cf=cfOhneSt+st2;              // mit Steuerersparnis
      sZ+=zi;sT+=ti;sSt+=st2;sCF+=cf;sCFOhne+=cfOhneSt;sM+=jMJ;sMB+=mi*lF*12;
      if(beJ===null&&sSt>=nbk)beJ=jj;
      yearRows.push({j:jj,rest:Math.max(0,restStart),zP,zinsen:zi,tilgB:ti,zt:zt2,steuer:st2,miete:jMJ,cf,cfOhneSt,cfKum:sCF});
      rs=Math.max(0,rs-ti);
    }
    const mehrMiet=sM-sMB;
    const w=gKP*(Math.pow(1+wP/100,j)-1),vw=gKP+w;
    const rsEnd=rs;
    const total=(vw-rsEnd)+sCF-ek-nbk-so-ren;          // Gesamtsaldo MIT Steuer
    const totalOhne=(vw-rsEnd)+sCFOhne-ek-nbk-so-ren;  // Gesamtsaldo OHNE Steuer
    // Monatlicher Cashflow — Jahr 1 Basis (für KPI-Schnellüberblick)
    const cf2OhneSt=(effJ-nu-ann);                              // OHNE Steuerersparnis
    const cf2MitSt =(effJ-nu-ann)+(yearRows[0]?.steuer||0)/12; // MIT Steuerersparnis
    const cf2=cf2OhneSt;
    const ekQ=gKP>0?ek/gKP*100:0;
    let rk=0;const rF=[];
    if(bel>95){rk+=30;rF.push("bel>95")}else if(bel>90){rk+=22;rF.push("bel>90")}else if(bel>80){rk+=12;rF.push("bel>80")}
    if(nR<1){rk+=20;rF.push("nR<1")}else if(nR<2){rk+=12;rF.push("nR<2")}else if(nR<3){rk+=5;rF.push("nR<3")}
    if(cf2<-500){rk+=15;rF.push("cf<-500")}else if(cf2<0){rk+=8;rF.push("cf<0")}
    if(zP>=5){rk+=12;rF.push("z≥5")}else if(zP>=4){rk+=6;rF.push("z≥4")}
    if(tP<1){rk+=18;rF.push("t<1")}else if(tP<2){rk+=8;rF.push("t<2")}
    if(isFinite(lz)&&lz>35){rk+=12;rF.push("lz>35")}else if(isFinite(lz)&&lz>30){rk+=6;rF.push("lz>30")}
    if(!isFinite(lz)){rk+=15;rF.push("lz=∞")}
    if(pQm>6000){rk+=8;rF.push("p>6k")}else if(pQm>5000){rk+=4;rF.push("p>5k")}
    if(ekQ<10){rk+=15;rF.push("ek<10")}else if(ekQ<20){rk+=5;rF.push("ek<20")}
    if(lM>tM*.08){rk+=8;rF.push("ls>8")}else if(lM>tM*.05){rk+=4;rF.push("ls>5")}
    if(k15)rk=Math.max(0,rk-5);
    if(bR>=5)rk=Math.max(0,rk-5);
    if(cf2>0)rk=Math.max(0,rk-3);
    rk=Math.min(100,Math.round(rk));
    return{pQm,bR,nR,ann,cf2,cf2OhneSt,cf2MitSt,lz,nbk,da,bel,afJ,sSt,g:total,gOhne:totalOhne,vw,w,rk,rF,gP,j,sCF,sCFOhne,beJ,z1:da*mz,t1:ann-da*mz,yearRows,mehrMiet,kP,k15,gKP,rsEnd,ekQ,ren,ren15Grenze,renUnterGrenze,renUeberGrenze};
  },[d]);

  const afaFromBj=bj=>{const y=+bj;if(!y)return null;if(y<1925)return"2.5";if(y>=2023)return"3";return"2";};

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <Sel label={t.bundesland} value={d.bundesland} onChange={v=>set("bundesland",v)} options={BL_O}/>
      <PLZSearch/>
      <F label={t.kaufpreis} unit="€" value={d.kaufpreis} onChange={v=>set("kaufpreis",v)} tip={tip("kaufpreis")}/>
      <F label={t.garageKauf} unit="€" value={d.garage} onChange={v=>set("garage",v)} tip={tip("garage")}/>
      {(+d.garage||0)>0&&<div style={{fontSize:10,color:"var(--ch)",marginTop:-6,marginBottom:8,paddingLeft:4}}>{t.kaufpreis}: {fmtE((+d.kaufpreis||0)+(+d.garage||0))}</div>}
      <Row><F label={t.flaeche} unit="m²" value={d.flaeche} onChange={v=>set("flaeche",v)} tip={tip("flaeche")}/><F label={t.preisQm} unit="€/m²" value={R?fmt(R.pQm):"—"} readOnly hint={t.flaeche}/></Row>
      <F label={t.kaltmiete+" /m²"} unit="€/m²" value={d.mieteQm} onChange={v=>{lastEditedRef.current="qm";set("mieteQm",v)}} step="0.5" tip={tip("mieteQm")} hint={d.vergleichsmiete?`${t.vgl}: ${d.vergleichsmiete} €/m²`:""}/>
      <F label={t.kaltmiete} unit={`€/${t.monLabel||"Mon."}`} value={d.kaltmiete} onChange={v=>{lastEditedRef.current="kalt";set("kaltmiete",v)}} tip={tip("kaltmiete")} hint={mieteQm>0?`= ${d.mieteQm} × ${d.flaeche} m²`:""}/>
      <Row><F label={t.sBJ} value={d.baujahr||""} onChange={v=>{set("baujahr",v);const a=afaFromBj(v);if(a)set("afaSatz",a);}} tip={tip("bj")} maxLength={4}/><F label={t.afa} unit="% p.a." value={d.afaSatz} onChange={v=>set("afaSatz",v)} step="0.5" tip={tip("afa")}/></Row>
      <Row><F label={t.nichtUml} unit={`€/${t.monLabel||"Mon."}`} value={d.nichtUml} onChange={v=>set("nichtUml",v)} tip={tip("nichtUml")}/><F label={t.leerstand} unit={t.monLabel||"Mon."} value={d.leerstand} onChange={v=>set("leerstand",v)} step="0.5" tip={tip("leerstand")}/></Row>
      <Sec title={t.fin} icon="🏦"/>

      <F label={t.eigenkapital} unit="€" value={d.eigenkapital} onChange={v=>set("eigenkapital",v)} tip={tip("eigenkapital")}/>
      <Row><F label={t.zinssatz} unit="% p.a." value={d.zinssatz} onChange={v=>set("zinssatz",v)} step="0.05" tip={tip("zinssatz")}/><F label={t.tilgung} unit="% p.a." value={d.tilgung} onChange={v=>set("tilgung",v)} step="0.05" tip={tip("tilgung")}/></Row>
      <Sel label={t.zinsbindung} value={d.zinsbindung} onChange={v=>set("zinsbindung",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/>
      <Sec title={t.stNk} icon="📋"/>
      <Row><F label={t.grEst} unit="%" value={R?.gP||"—"} readOnly hint={d.bundesland?BL_N[d.bundesland]:""} tip={tip("grEst")}/><F label={t.notar} unit="%" value={d.notar} onChange={v=>set("notar",v)} step="0.1" tip={tip("notar")}/></Row>
      <F label={t.makler} unit="%" value={d.makler} onChange={v=>set("makler",v)} step="0.01" tip={tip("makler")}/>
      <F label={t.steuersatz} unit="%" value={d.steuersatz} onChange={v=>set("steuersatz",v)} tip={tip("steuersatz")}/>
      <Row><F label={t.grundAnteil} unit="%" value={d.grundAnteil} onChange={v=>{set("grundAnteil",v);set("gebAnteil",100-(+v||0))}} tip={tip("grundAnteil")}/><F label={t.gebAnteil} unit="%" value={d.gebAnteil} onChange={v=>{set("gebAnteil",v);set("grundAnteil",100-(+v||0))}} tip={tip("gebAnteil")}/></Row>
      <Sec title={t.wZ} icon="📈"/>
      <Row><F label={t.wertP} unit="% p.a." value={d.wertP} onChange={v=>set("wertP",v)} step="0.1" tip={tip("wertP")}/><Sel label={t.jahre} value={d.jahre} onChange={v=>set("jahre",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/></Row>
      <F label={t.sonderUml} unit="€" value={d.sonder} onChange={v=>set("sonder",v)} tip={tip("sonder")}/>
      <F label={t.renovierung} unit="€" value={d.renovierung} onChange={v=>set("renovierung",v)} tip={tip("renovierung")}/>
      {(()=>{
        const ren=+d.renovierung||0;
        if(ren<=0)return null;
        const schwelle=R?.ren15Grenze||0;
        const unterGrenze=R?.renUnterGrenze;
        const ueberGrenze=R?.renUeberGrenze;
        return(
          <div style={{padding:"9px 12px",borderRadius:10,marginBottom:10,marginTop:-4,
            background:unterGrenze?"#F0FAF3":ueberGrenze?"#FFF7ED":"#F8F9FA",
            border:`1px solid ${unterGrenze?"#86EFAC":ueberGrenze?"#FBB97D":"#e5e7eb"}`}}>
            <div style={{fontSize:10,fontWeight:700,color:unterGrenze?"#15803d":ueberGrenze?"#b45309":"var(--ct)",marginBottom:3}}>
              {unterGrenze?t.renovSofort:t.renovAktiv}
            </div>
            <div style={{fontSize:9,color:"var(--ch)"}}>
              {t.renovGrenzHinw}: {fmtE(Math.round(schwelle))} ({fmtP((+d.gebAnteil||80),0)} × 15%)
            </div>
          </div>
        );
      })()}
      <Sec title={t.immLeerQ} icon="🏠"/>
      <div style={{display:"flex",gap:8,marginBottom:12}}>{[["nein",t.immLeerNein],["ja",t.immLeerJa]].map(([val,lbl])=><button key={val} onClick={()=>{set("immLeer",val);if(val==="nein"){set("letzteErhDatum",new Date(new Date().getFullYear(),new Date().getMonth()+4,1).toISOString().split("T")[0]);set("letzteErhMiete","0");}else{set("letzteErhDatum",new Date(new Date().getFullYear()-2,new Date().getMonth(),1).toISOString().split("T")[0]);}}} style={{flex:1,padding:"10px 8px",borderRadius:8,border:`2px solid ${d.immLeer===val?"var(--ca)":"var(--cb)"}`,background:d.immLeer===val?"var(--ca)":"var(--cc)",color:d.immLeer===val?"#fff":"var(--ct)",fontSize:13,fontWeight:d.immLeer===val?600:400,cursor:"pointer",transition:"all .15s"}}>{lbl}</button>)}</div>
      <F label={t.vgl} unit="€/m²" value={d.vergleichsmiete} onChange={v=>set("vergleichsmiete",v)} step="0.5" tip={tip("vglRendite")}/>
      {d.immLeer==="nein"?<F label={t.mietbeginn} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/>:<Row><F label={t.lDat} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/><F label={t.lMiet} unit="€" value={d.letzteErhMiete} onChange={v=>set("letzteErhMiete",v)} tip={tip("lMiet")}/></Row>}
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}><div style={{fontSize:40,opacity:.12}}>🏠</div></div>:<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,margin:"0 0 12px",paddingBottom:10,borderBottom:"2px solid var(--ca)"}}>
          <span style={{fontSize:16,fontWeight:700,color:"var(--ct)",letterSpacing:-.3}}>{t.kennzahlen}</span>
          <button data-pdf-expand="true" onClick={()=>{setSecAllOpen(v=>!v);setSecAllKey(k=>k+1);}} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"1px solid var(--cb)",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,color:"var(--ca)",whiteSpace:"nowrap",flexShrink:0}}>
            <span style={{fontSize:13,lineHeight:1}}>{secAllOpen?"⊖":"⊕"}</span>
            <span>{secAllOpen?(t.collapseAll||"Alle zuklappen"):(t.expandAll||"Alle aufklappen")}</span>
          </button>
        </div>

        {/* RISIKOGAUGE — immer sichtbar */}
        <RBar score={R.rk} factors={R.rF}/>

        {/* ═══ SELBSTTRÄGER-CHECK ═══ */}
        {(()=>{
          const cfOCol=rate('cfOhne',R.cf2OhneSt).color;
          const cfMCol=rate('cfMit',R.cf2MitSt).color;
          const worstCol=[cfOCol,cfMCol].includes("red")?"red":[cfOCol,cfMCol].includes("yellow")?"yellow":"green";
          const selfHex=worstCol==="green"?"#22c55e":worstCol==="yellow"?"#f59e0b":"#ef4444";
          const selfIntro=R.cf2OhneSt>0?t.sec2GreenCF:R.cf2OhneSt>=-150?t.sec2YellowCF:t.sec2RedCF;
          return <AccordionSection question={t.selfQ} hint={t.selfHint} color={selfHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{selfIntro}</div>
            <div style={{marginTop:10}}><BreakEvenCards R={R}/></div>
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 1: Lohnt sich das? ═══ */}
        {(()=>{
          const brCol=rate('bruttoR',R.bR).color;
          const nrCol=rate('nettoR',R.nR).color;
          const worstCol=[brCol,nrCol].includes("red")?"red":[brCol,nrCol].includes("yellow")?"yellow":"green";
          const ampelHex=worstCol==="green"?"#22c55e":worstCol==="yellow"?"#f59e0b":"#ef4444";
          const intro=R.bR>=5?t.sec1GreenBR:R.bR>=4?t.sec1YellowBR:t.sec1RedBR;
          return <AccordionSection question={t.sec1Q} hint={t.sec1Hint} color={ampelHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
              <AmpelKPI label={t.bruttoR} value={fmtP(R.bR)}
                color={brCol}
                statusLabel={brCol==="green"?t.badgeGut:brCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.bR>=5?"✓ "+t.brGreen:R.bR>=4?"~ "+t.brYellow:"⚠ "+t.brRed}
                tip={R.bR>=5?t.brGreenTip:R.bR>=4?t.brYellowTip:t.brRedTip}/>
              <AmpelKPI label={t.nettoR} value={fmtP(R.nR)}
                color={nrCol}
                statusLabel={nrCol==="green"?t.badgeGut:nrCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.nR>=3.5?"✓ "+t.nrGreen:R.nR>=2.5?"~ "+t.nrYellow:"⚠ "+t.nrRed}
                tip={R.nR>=3.5?t.nrGreenTip:R.nR>=2.5?t.nrYellowTip:t.nrRedTip}/>
            </div>
            {R.bR>0&&R.nR>0&&(R.bR-R.nR)>2&&<div style={{marginTop:8}}><Ins emoji="📊" text={t.adv1} type="warn"/></div>}
            {R.bR>0&&(+d.kaltmiete)>0&&(R.gKP/((+d.kaltmiete)*12))>30&&<div style={{marginTop:4}}><Ins emoji="🏷️" text={t.adv2} type="warn"/></div>}
            {R.nR>0&&R.nR<(+d.zinssatz)&&<div style={{marginTop:4}}><Ins emoji="📉" text={t.adv3} type="bad"/></div>}
            {lang==='de'&&<SectionExplain
              bullets={(()=>{const brRat=rate('bruttoR',R.bR);const nrRat=rate('nettoR',R.nR);const kpF=R.gKP/Math.max((+d.kaltmiete||1)*12,1);const kpRat=rate('kpFaktor',kpF);return[
                `${brRat.symbol} Bruttorendite ${fmtP(R.bR)} — ${R.bR>=5?'solide ab 5 %':R.bR>=4?'4–5 % akzeptabel':'unter 4 %'} → ${vrd(brRat)} (Jahresmiete ${fmtE((+d.kaltmiete||0)*12)} ÷ ${fmtE(R.gKP)})`,
                `${nrRat.symbol} Nettorendite ${fmtP(R.nR)} — ${R.nR>=3.5?'solide ab 3,5 %':R.nR>=2.5?'2,5–3,5 % akzeptabel':'unter 2,5 %'} → ${vrd(nrRat)}${(+d.leerstand)>0?' (inkl. Leerstandsverluste)':''}`,
                `${kpRat.symbol} Kaufpreisfaktor ${fmt(kpF,1)}x — ${kpF<=25?'≤ 25x solide':kpF<=30?'25–30x teuer':'>30x sehr teuer'} → ${vrd(kpRat)}`,
                `Benchmark-Vergleich: Tagesgeld 3 % ${R.nR>=3?'✓':'⚠'} · Staatsanleihe 3,5 % ${R.nR>=3.5?'✓':'⚠'} · ETF ~7 % ${R.nR>=7?'✓':'⚠'} — Nettorendite ${fmtP(R.nR)}`,
                ...(R.bR>0&&R.nR>0&&(R.bR-R.nR)>2?[`Große Kostenschere — Brutto-Netto-Spread von ${fmtP(R.bR-R.nR)}: nicht-umlegbare Kosten prüfen!`]:[]),
                ...(R.nR>0&&R.nR<(+d.zinssatz)?[`⚠ Nettorendite (${fmtP(R.nR)}) liegt unter deinem Zinssatz (${fmtP(+d.zinssatz)}) — Fremdkapital kostet mehr als die Immo einbringt`]:[])
              ]})()}
              text={
                `Die Bruttorendite ist der erste Schnell-Check für jedes Immobilien-Investment: du nimmst die Jahresmiete und teilst sie durch den Gesamtkaufpreis. Bei dir sind das ${fmtE((+d.kaltmiete||0)*12)} Jahresmiete auf ${fmtE(R.gKP)} Kaufpreis — macht ${fmtP(R.bR)} brutto. Diese Zahl klingt erstmal klar, ist aber noch geschönt: Sie ignoriert die Kosten, die du nicht auf den Mieter weitergeben kannst.\n\nDie Nettorendite ist die ehrlichere Zahl. Sie zieht alle nicht-umlegbaren Kosten ab — also Hausverwaltung, Instandhaltungsrücklage, Leerstand, eigene Reparaturkosten — und zeigt dir, was wirklich bei dir ankommt. ${R.nR>=3.5?"Bei "+fmtP(R.nR)+" liegst du solide über dem, was ein Tagesgeldkonto oder eine sichere Staatsanleihe bringt.":R.nR>=2.5?"Bei "+fmtP(R.nR)+" ist die Rendite noch akzeptabel — schau aber, ob die laufenden Kosten noch steigen können (Stichwort: Instandhaltung und Rücklagen).":"Bei "+fmtP(R.nR)+" ist die Rendite schwach — das schlägt kaum mehr als ein gutes Tagesgeldkonto, und das ohne das Risiko und die Arbeit einer Immobilie."}\n\nStellschrauben — was kannst du drehen? Erstens der Kaufpreis: 10.000 € weniger bedeuten direkt eine höhere Rendite, ohne dass sich sonst etwas ändern muss. Zweitens die Kaltmiete: Ist sie marktgerecht oder liegt sie noch unter dem Ortsüblichen? Drittens die nicht-umlegbaren Kosten: Weniger Leerstand, günstigerer Verwalter, günstigeres Hausgeld verbessern die Nettorendite direkt. Und wer einen Stellplatz oder eine Garage separat vermietet, verbessert die Einnahmen ohne großen Mehraufwand.`
              }
            />}
            {lang!=='de'&&t.s1b1&&<SectionExplain
              bullets={[
                tpl(t.s1b1,{a:fmtE((+d.kaltmiete||0)*12),b:fmtE(R.gKP),c:fmtP(R.bR)}),
                t.s1b2+((+d.leerstand)>0?(t.s1b2v||''):''),
                t.s1b3,
                tpl(t.s1b4,{x:fmt(R.gKP/Math.max((+d.kaltmiete||1)*12,1),1)}),
                ...(R.bR>0&&R.nR>0&&(R.bR-R.nR)>2?[tpl(t.s1b5,{x:fmtP(R.bR-R.nR)})]:[]),
                ...(R.nR>0&&R.nR<(+d.zinssatz)?[tpl(t.s1b6,{a:fmtP(R.nR),b:fmtP(+d.zinssatz)})]:[]),
              ]}
              text={tpl(R.nR>5?t.s1t2a:R.nR>3?t.s1t2b:t.s1t2c,{nR:fmtP(R.nR)})+'\n\n'+tpl(t.s1t1,{rent:fmtE((+d.kaltmiete||0)*12),price:fmtE(R.gKP),bR:fmtP(R.bR)})+'\n\n'+t.s1t3}
            />}
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 2: Trage ich das monatlich? ═══ */}
        {(()=>{
          const cfOCol=rate('cfOhne',R.cf2OhneSt).color;
          const cfMCol=rate('cfMit',R.cf2MitSt).color;
          const worstCol=[cfOCol,cfMCol].includes("red")?"red":[cfOCol,cfMCol].includes("yellow")?"yellow":"green";
          const ampelHex=worstCol==="green"?"#22c55e":worstCol==="yellow"?"#f59e0b":"#ef4444";
          const intro=R.cf2OhneSt>0?t.sec2GreenCF:R.cf2OhneSt>=-150?t.sec2YellowCF:t.sec2RedCF;
          return <AccordionSection question={t.sec2Q} hint={t.sec2Hint} color={ampelHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:10}}>
              <AmpelKPI label={t.cfOhneSt} value={fmtE(R.cf2OhneSt)}
                color={cfOCol}
                statusLabel={cfOCol==="green"?t.badgeGut:cfOCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.cf2OhneSt>0?"✓ "+t.cfOGreen:R.cf2OhneSt>=-150?"~ "+t.cfOYellow:"⚠ "+t.cfORed}
                tip={R.cf2OhneSt>0?t.cfOGreenTip:R.cf2OhneSt>=-150?t.cfOYellowTip:t.cfORedTip}/>
              <AmpelKPI label={t.cfMitSt} value={fmtE(R.cf2MitSt)}
                color={cfMCol}
                statusLabel={cfMCol==="green"?t.badgeGut:cfMCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.cf2MitSt>0?"✓ "+t.cfMGreen:R.cf2MitSt>=-150?"~ "+t.cfMYellow:"⚠ "+t.cfMRed}
                tip={R.cf2MitSt>0?t.cfMGreenTip:R.cf2MitSt>=-150?t.cfMYellowTip:t.cfMRedTip}/>
            </div>

            {(+d.leerstand)>0&&R.bR>0&&((+d.leerstand)/((+d.jahre||10)*12)*100)>5&&R.cf2OhneSt<0&&<div style={{marginTop:4}}><Ins emoji="🏠" text={t.adv6} type="bad"/></div>}
            {lang==='de'&&<SectionExplain
              bullets={(()=>{const cfOR=rate('cfOhne',R.cf2OhneSt);const cfMR=rate('cfMit',R.cf2MitSt);return[
                `${cfOR.symbol} Cashflow o. Steuer ${fmtE(R.cf2OhneSt)}/Mon. — ${R.cf2OhneSt>=0?'selbsttragend':R.cf2OhneSt>=-150?`tragbar bis −150 €/Mon.`:'unter −150 €/Mon.'} → ${vrd(cfOR)}`,
                `${cfMR.symbol} Cashflow m. Steuer ${fmtE(R.cf2MitSt)}/Mon. — Steuerersparnis ${fmtE(R.cf2MitSt-R.cf2OhneSt)}/Mon. extra → ${vrd(cfMR)}`,
                ...(R.cf2OhneSt<0?[`Du zahlst ${fmtE(Math.abs(R.cf2OhneSt))}/Mon. drauf — ${fmtE(Math.abs(R.cf2OhneSt)*12)}/Jahr aus eigener Tasche`]:[`Die Immobilie trägt sich selbst — sogar ohne Steuerhilfe`]),
                ...(R.cf2OhneSt<0&&R.cf2MitSt>0?[`Mit Steuerbonus dreht der Cashflow ins Positive — Vorsicht: Bonus kommt erst mit der Steuererklärung`]:[]),
                `Annuität gesamt: ${fmtE(R.ann)}/Mon. (Zinsen: ${fmtE(R.z1)}, Tilgung: ${fmtE(R.t1)})`
              ]})()}
              text={
                `Der Cashflow ist die Antwort auf die Frage: "Muss ich monatlich eigenes Geld reinbuttern — oder wirft die Immobilie sogar etwas ab?" Die Rechnung ist simpel: Kaltmiete minus nicht-umlegbare Kosten minus deine Kreditrate. Wenn das positiv ist, trägt sich die Immobilie selbst. Negativ bedeutet: du zahlst jeden Monat drauf.\n\nJetzt der wichtige Unterschied zwischen "ohne Steuer" und "mit Steuer": Als Vermieter kannst du die Darlehenszinsen und die Gebäudeabschreibung (AfA) steuerlich geltend machen. Das senkt deine Steuerlast und verbessert den Cashflow — aber Vorsicht: dieser Steuerbonus landet nicht direkt auf deinem Konto. Du siehst ihn erst bei der Steuererklärung, meist Monate später. Er ist real, aber kein Geld zum Ausgeben am 1. des Monats.\n\n${R.cf2OhneSt<0?"Negativer Cashflow ist nicht per se schlimm — viele Profi-Investoren nehmen monatliche Zuzahlungen bewusst in Kauf, wenn Wertsteigerung und Steuereffekte das langfristig ausgleichen. Aber du musst diese Reserve wirklich haben. Ein Leerstandsmonat kommt obendrauf.":"Positiver Cashflow ohne Steuerbonus ist das Goldstandard-Ziel: die Immobilie zahlt sich selbst und bringt dir sogar Geld — unabhängig von deiner Steuererklärung."}\n\nStellschrauben: Den größten Hebel hat der Tilgungssatz — weniger tilgen bedeutet niedrigere Rate und besseren Cashflow (aber längere Laufzeit!). Mehr Eigenkapital senkt die Kreditrate direkt. Eine höhere Miete oder weniger Leerstand verbessert die Einnahmeseite. Im Finanzierungsrechner kannst du Sondertilgungen simulieren.`
              }
            />}
            {lang!=='de'&&t.s2b1&&<SectionExplain
              bullets={[
                tpl(t.s2b1,{a:fmtE(R.cf2OhneSt)}),
                tpl(t.s2b2,{a:fmtE(R.cf2MitSt),b:fmtE(R.cf2MitSt-R.cf2OhneSt)}),
                ...(R.cf2OhneSt<0?[tpl(t.s2b3n,{a:fmtE(Math.abs(R.cf2OhneSt)),b:fmtE(Math.abs(R.cf2OhneSt)*12)})]:[t.s2b3p]),
                ...(R.cf2OhneSt<0&&R.cf2MitSt>0?[t.s2b4]:[]),
                tpl(t.s2b5,{a:fmtE(R.ann),b:fmtE(R.z1),c:fmtE(R.t1)}),
              ]}
              text={t.s2t1+'\n\n'+t.s2t2+'\n\n'+(R.cf2OhneSt<0?t.s2t3n:t.s2t3p)+'\n\n'+t.s2t4}
            />}
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 3: Was zahle ich der Bank? ═══ */}
        {(()=>{
          const belCol=rate('bel',R.bel).color;
          const lzCol=!isFinite(R.lz)?"red":rate('laufzeit',R.lz).color;
          const worstCol=[belCol,lzCol].includes("red")?"red":[belCol,lzCol].includes("yellow")?"yellow":"green";
          const ampelHex=worstCol==="green"?"#22c55e":worstCol==="yellow"?"#f59e0b":"#ef4444";
          const intro=R.bel<70?t.sec3GreenBel:R.bel<85?t.sec3YellowBel:t.sec3RedBel;
          return <AccordionSection question={t.sec3Q} hint={t.sec3Hint} color={ampelHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:10}}>
              <AmpelKPI label={t.bel} value={fmtP(R.bel)}
                color={belCol}
                statusLabel={belCol==="green"?t.badgeGut:belCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.bel<70?"✓ "+t.belGreen:R.bel<85?"~ "+t.belYellow:"⚠ "+t.belRed}
                tip={R.bel<70?t.belGreenTip:R.bel<85?t.belYellowTip:t.belRedTip}/>
              <AmpelKPI label={t.laufzeit} value={isFinite(R.lz)?`${fmt(R.lz,1)} J.`:"∞"}
                color={lzCol}
                statusLabel={lzCol==="green"?t.badgeGut:lzCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={!isFinite(R.lz)?"⚠ "+t.lzInf:R.lz>35?"⚠ "+t.lzRed:R.lz>25?"~ "+t.lzYellow:"✓ "+t.lzGreen}
                tip={!isFinite(R.lz)?t.lzInfTip:R.lz>35?t.lzRedTip:R.lz>25?t.lzYellowTip:t.lzGreenTip}/>
              <NeutralKPI label={t.darlehen} value={fmtE(R.da)} sub={`EK-Quote: ${fmtP(R.ekQ)}`}/>
              <NeutralKPI label={t.rate} value={fmtE(R.ann)} sub={`${t.zins} ${fmtE(R.z1)} + ${t.tilgK} ${fmtE(R.t1)}`}/>
            </div>
            {(+d.grundAnteil)>40&&<div style={{marginTop:4}}><Ins emoji="📋" text={t.adv5} type="info"/></div>}
            {lang==='de'&&<SectionExplain
              bullets={[
                `Beleihungsauslauf: ${fmtP(R.bel)} — die Bank finanziert ${fmtP(R.bel)} des Kaufpreises${R.bel<70?" → Topkonditionen möglich":R.bel<85?" → kleiner Zinsaufschlag üblich":" → deutlicher Risikoaufschlag der Bank"}`,
                `Monatliche Rate: ${fmtE(R.ann)} (Zinsen: ${fmtE(R.z1)} + Tilgung: ${fmtE(R.t1)})`,
                `${isFinite(R.lz)?`Laufzeit: ca. ${fmt(R.lz,1)} Jahre bei ${fmtP(+d.tilgung||0)} Tilgung p.a.`:"Laufzeit: ∞ — bei dieser Tilgung wird das Darlehen nie vollständig abbezahlt!"}`,
                `Darlehenssumme: ${fmtE(R.da)} (Eigenkapital ${fmtE(+d.eigenkapital||0)} = ${fmtP(R.ekQ)} EK-Quote)`,
                ...(R.bel>80?[`Ab 80% Beleihung verlangen Banken Zinsaufschläge — das verteuert dein Darlehen spürbar`]:[]),
                ...(!isFinite(R.lz)?[`⚠ Mit dieser Tilgung zahlst du ewig Zinsen — erhöhe die Tilgung auf mindestens 2% p.a.`]:[])
              ]}
              text={
                `Der Beleihungsauslauf zeigt, wieviel Prozent des Kaufpreises die Bank dir leiht. Je niedriger, desto besser — denn Banken sehen weniger beleihte Objekte als sicherer an und belohnen das mit günstigeren Zinsen. Bis 60% gibt es oft Topkonditionen. Zwischen 60% und 80% ist normal. Ab 80% wird es teurer — Banken rechnen jetzt Risikoaufschläge auf, die dir direkt in der Monatszahlung begegnen. Ab 90% wird es richtig eng.\n\nSchau dir die Aufteilung deiner Rate an: Am Anfang eines Darlehens geht der Großteil der Rate an die Bank als Zins — und nur ein kleiner Teil baut die Schuld wirklich ab. Das ändert sich erst im Laufe der Jahre. ${isFinite(R.lz)?"Bei deiner aktuellen Tilgung von "+fmtP(+d.tilgung||0)+" p.a. dauert das Abbezahlen ca. "+fmt(R.lz,1)+" Jahre.":"Achtung: Bei dieser Tilgung wird das Darlehen rechnerisch nie vollständig abbezahlt — das Geld fließt dauerhaft als Zinsen zur Bank."}\n\nStellschrauben: Mehr Eigenkapital ist der direkteste Weg — jeder Euro mehr senkt Beleihungsauslauf und Zinssatz gleichzeitig. Eine höhere Tilgung (z. B. von 2% auf 3%) verkürzt die Laufzeit enorm und spart massive Zinssummen. Sondertilgungen nutzen: Viele Darlehen erlauben 5% des Darlehens pro Jahr kostenlos extra zurückzuzahlen — das kannst du im Finanzierungsrechner simulieren. Zinsbindung bewusst wählen: Lange Zinsbindung gibt Sicherheit, kurze kann günstiger sein wenn die Zinsen fallen.`
              }
            />}
            {lang!=='de'&&t.s3b1&&<SectionExplain
              bullets={[
                tpl(t.s3b1,{a:fmtP(R.bel),suf:R.bel<70?' — '+(t.s3b1p||''):R.bel<85?' — '+(t.s3b1m||''):' — '+(t.s3b1h||'')}),
                tpl(t.s3b2,{a:fmtE(R.ann),b:fmtE(R.z1),c:fmtE(R.t1)}),
                isFinite(R.lz)?tpl(t.s3b3a,{x:fmt(R.lz,1),p:fmtP(+d.tilgung||0)}):t.s3b3b,
                tpl(t.s3b4,{a:fmtE(R.da),b:fmtE(+d.eigenkapital||0),c:fmtP(R.ekQ)}),
                ...(R.bel>80?[t.s3b5]:[]),
                ...(!isFinite(R.lz)?[t.s3b6]:[]),
              ]}
              text={t.s3t1+'\n\n'+(isFinite(R.lz)?tpl(t.s3t2a,{p:fmtP(+d.tilgung||0),lz:fmt(R.lz,1)}):t.s3t2b)+'\n\n'+t.s3t3}
            />}
          <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid var(--cb)"}}><p style={{fontSize:11,color:"var(--ch)",lineHeight:1.6,margin:"0 0 8px"}}>{lang==='de'?`Bei ${fmt(+d.tilgung||0,1)} % Tilgung läuft dein Darlehen noch ca. ${isFinite(R.lz)?fmt(R.lz,0):"∞"} Jahre — Sondertilgungen können das deutlich verkürzen.`:`At ${fmt(+d.tilgung||0,1)} % repayment your loan runs approx. ${isFinite(R.lz)?fmt(R.lz,0):"∞"} years — extra repayments can cut that short.`}</p><button onClick={()=>setTabExt("kredit")} style={{fontSize:11,fontWeight:600,color:"var(--ca)",background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>🏦 {t.kreditFull||t.kredit} →</button></div>
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 4: Steuervorteil (nur wenn Steuersatz > 0) ═══ */}
        {(+d.steuersatz)>0&&(()=>{
          const st=+d.steuersatz;
          const intro=st<30?t.sec4LowTax:st<42?t.sec4MidTax:t.sec4HighTax;
          const stErsM=R.sSt/R.j/12;
          const stErsCol=rate('steuerErsM',stErsM).color;
          const beJCol=R.beJ?rate('nkAmort',R.beJ).color:"red";
          const sec4Color=stErsCol==="green"?"#22c55e":stErsCol==="yellow"?"#f59e0b":"#1E3A5F";
          return <AccordionSection question={t.sec4Q} hint={t.sec4Hint} color={sec4Color} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
              <NeutralKPI label={t.nbk} value={fmtE(R.nbk)} sub={t.nbkSub}/>
              <AmpelKPI label={t.steuerErs} value={fmtE(Math.round(R.sSt/R.j))}
                color={stErsCol}
                statusLabel={stErsCol==="green"?t.badgeGut:stErsCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={`≈ ${fmtE(Math.round(stErsM))}${t.monAbb||"/Mon."}`}
                tip={tpl(t.steuerErsTip,{a:fmtE(R.afJ),b:fmtE(Math.round(R.z1*12))})}/>
              {R.beJ&&<AmpelKPI label={t.steuerNeutral} value={tpl(t.jahrN||"Jahr {n}",{n:R.beJ})}
                color={beJCol}
                statusLabel={beJCol==="green"?t.badgeGut:beJCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={beJCol==="green"?t.nkAmortOk:beJCol==="yellow"?t.nkAmortMid:t.nkAmortNo}
                tip={tpl(t.nkAmortTip,{nbk:fmtE(R.nbk),beJ:R.beJ})}/>
              }
            </div>
            {(+d.steuersatz)>42&&R.bel>60&&<div style={{marginTop:8}}><Ins emoji="💼" text={t.adv4} type="info"/></div>}
            {lang==='de'&&<SectionExplain
              bullets={(()=>{const stR=rate('steuerErsM',stErsM);const beR=R.beJ?rate('nkAmort',R.beJ):{tier:'red',symbol:'⚠',color:'red'};return[
                `${stR.symbol} Steuerersparnis ${fmtE(Math.round(stErsM))}/Mon. — ${stErsM>=150?'stark ab 150 €/Mon.':stErsM>=75?'75–150 €/Mon. moderat':'unter 75 €/Mon.'} → ${vrd(stR)} (bei ${fmtP(st,0)} Steuersatz)`,
                `Zwei absetzbare Positionen: Darlehenszinsen (${fmtE(Math.round(R.z1*12))}/J.) + AfA (${fmtE(R.afJ)}/J.)`,
                `AfA-Basis: ${fmtP(+d.gebAnteil||80,0)} % Gebäudeanteil × ${fmtP(+d.afaSatz||2)} p.a. = ${fmtE(R.afJ)}/Jahr`,
                `${beR.symbol} NK-Amortisation${R.beJ?` Jahr ${R.beJ} — ${R.beJ<=10?'≤ 10 Jahre':R.beJ<=15?'10–15 Jahre':'>15 Jahre'} → ${vrd(beR)}`:" — Break-Even noch nicht erreicht → kritisch"}`,
                `Faustregel: Je höher dein Steuersatz, desto mehr profitierst du — der Steuervorteil ist ein Instrument für Gutverdiener`
              ]})()}
              text={
                `Der Staat subventioniert Vermieter indirekt über zwei Mechanismen: Erstens kannst du deine Darlehenszinsen als Werbungskosten absetzen — sie mindern direkt dein zu versteuerndes Einkommen aus der Vermietung. Zweitens gibt es die AfA, die "Absetzung für Abnutzung" — eine pauschale Gebäudeabschreibung, mit der du jedes Jahr einen Teil des Gebäudewerts steuerlich als Verlust ansetzen kannst.\n\nWichtig: Nur der Gebäudeanteil am Kaufpreis darf abgeschrieben werden, nicht der Grundstücksanteil. Du hast ${fmtP(+d.gebAnteil||80,0)} Gebäudeanteil angegeben — das ergibt eine AfA-Basis von ${fmtE(Math.round(R.gKP*(+d.gebAnteil||80)/100))}. Der AfA-Satz beträgt bei Gebäuden, die nach 1924 gebaut wurden, 2% pro Jahr. Vor 1925 gilt 2,5%. Bei Neubauten ab 2023 sogar 3%.\n\nStellschrauben: Den Gebäudeanteil realistisch aber optimiert ansetzen — Achtung: das Finanzamt prüft das, ein Wertgutachten schafft Sicherheit. Den AfA-Satz anhand des Baujahrs prüfen. Hohe Darlehenszinsen im ersten Jahr nutzen (sie sinken mit der Zeit durch Tilgung). Wer wenig verdient, profitiert weniger vom Steuervorteil — wer viel verdient, holt durch die Steuer deutlich mehr aus der gleichen Immobilie raus.`
              }
            />}
              {lang!=='de'&&t.s4b1&&<SectionExplain
                bullets={[
                  tpl(t.s4b1,{a:fmtE(Math.round(R.sSt/R.j)),b:fmtE(Math.round(R.sSt/R.j/12)),c:fmtP(+d.steuersatz||0,0)}),
                  tpl(t.s4b2,{a:fmtE(Math.round(R.z1*12)),b:fmtE(R.afJ)}),
                  tpl(t.s4b3,{a:fmtP(+d.gebAnteil||80,0),b:fmtP(+d.afaSatz||2),c:fmtE(R.afJ)}),
                  R.beJ?tpl(t.s4b4a,{a:fmtE(R.nbk),b:R.beJ}):tpl(t.s4b4b,{a:fmtE(R.nbk)}),
                  ...((+d.afaSatz||2)<=2?[tpl(t.s4b5,{x:fmtE(Math.round(R.gKP*(+d.gebAnteil||80)/100*0.005))})]:[]),
                  t.s4b6,
                ]}
                text={t.s4t1+'\n\n'+tpl(t.s4t2,{p:fmtP(+d.gebAnteil||80,0)})+'\n\n'+t.s4t3}
              />}
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 5: Zeitverlauf ═══ */}
        <AccordionSection question={t.sec5Q} hint={t.sec5Hint} sync={{key:secAllKey,open:secAllOpen}}>
          <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 8px"}}>{t.sec5Sub}</div>
          <LineChart rows={R.yearRows} zbJ={+d.zinsbindung||10}/>
          <YearTable rows={R.yearRows} zbJ={+d.zinsbindung||10}/>
          {lang==='de'&&<SectionExplain
            bullets={[
              `Restschuld: startet bei ${fmtE(R.da)}, fällt durch Tilgung${isFinite(R.lz)?" und erreicht 0 in Jahr "+Math.ceil(R.lz):" — wird in ${R.j} Jahren nicht vollständig abbezahlt"}`,
              `Kum. Cashflow: zeigt wie viel Geld du bis zum jeweiligen Jahr insgesamt raus- oder reingesteckt hast`,
              `Jahresmiete: steigt mit der Zeit durch mögliche Mieterhöhungen (§558 BGB)`,
              `Zinsbindungsende: in Jahr ${+d.zinsbindung||10} läuft deine Zinsbindung aus — danach gilt der Marktpreis`,
              `${R.sCF>=0?"Über den Analysezeitraum ist der kumulierte Cashflow positiv — die Immo hat mehr eingespielt als sie gekostet hat":"Über den Analysezeitraum ist der kumulierte Cashflow negativ — du hast netto mehr bezahlt als eingenommen"}`
            ]}
            text={`Die drei Kurven im Chart erzählen die Geschichte deiner Investition:\n\nRestschuld (fallende Kurve): Zu Beginn geht fast die gesamte Rate als Zinsen an die Bank, die Schuld sinkt nur langsam. Das ändert sich mit der Zeit — je weniger Restschuld, desto mehr von deiner Rate tilgt wirklich. Das Tempo nimmt also zu. Beim Zinsbindungsende (Jahr ${+d.zinsbindung||10}) wird der Zinssatz neu verhandelt — das Marktumfeld entscheidet dann, ob deine Rate steigt, fällt oder gleich bleibt.\n\nKumulierter Cashflow (steigende oder fallende Kurve): Diese Linie zeigt dir, wie viel du aus der Immobilie insgesamt über die Zeit rausgeholt hast — oder reingesteckt hast. Wann dreht sie ins Positive? Das ist dein persönlicher Cash-Breakeven.\n\nJahresmiete: Durch Mieterhöhungen nach §558 BGB steigt die Miete schrittweise — abhängig von Vergleichsmiete, Kappungsgrenze und deiner Ausgangslage. Diese Steigerungen verbessern den Cashflow langfristig und steigern auch den Wert deiner Immobilie.`
          }
          />}
          {lang!=='de'&&t.s5b2&&<SectionExplain
            bullets={[
              isFinite(R.lz)?tpl(t.s5b1a,{a:fmtE(R.da),b:Math.ceil(R.lz)}):tpl(t.s5b1b,{a:fmtE(R.da),b:R.j}),
              t.s5b2,
              t.s5b3,
              tpl(t.s5b4,{x:+d.zinsbindung||10}),
              R.sCF>=0?t.s5b5p:t.s5b5n,
            ]}
            text={tpl(t.s5t1,{zb:+d.zinsbindung||10})}
          />}
          {(()=>{const aktQm=(+d.kaltmiete)/(+d.flaeche||1);const vglQm=+d.vergleichsmiete||0;const gapPct=vglQm>0&&aktQm<vglQm?(vglQm-aktQm)/vglQm*100:0;return <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid var(--cb)"}}><p style={{fontSize:11,color:"var(--ch)",lineHeight:1.6,margin:"0 0 8px"}}>{lang==='de'?(gapPct>0.5?`Deine Miete liegt ${fmt(gapPct,0)} % unter der Vergleichsmiete (${fmtE(Math.round(vglQm*(+d.flaeche||0)))}/Mon.) — § 558 erlaubt eine schrittweise Angleichung.`:`Deine Miete liegt auf Vergleichsniveau — prüfe wann die nächste Anpassung möglich ist.`):(gapPct>0.5?`Your rent is ${fmt(gapPct,0)} % below the reference rent (${fmtE(Math.round(vglQm*(+d.flaeche||0)))}/mo.) — § 558 allows a step-by-step adjustment.`:`Your rent is at reference level — check when the next increase is due.`)}</p><button onClick={()=>setTabExt("miete")} style={{fontSize:11,fontWeight:600,color:"var(--ca)",background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>📈 {t.mieteFull||t.miete} →</button></div>;})()}
        </AccordionSection>

        {/* ═══ SECTION 6: Was bleibt am Ende? ═══ */}
        {(()=>{
          const gCol=rate('gesamtSaldo',R.g).color;
          const ampelHex=R.g>=0?"#22c55e":"#ef4444";
          const intro=R.g>=0?t.sec6GreenG:t.sec6RedG;
          return <AccordionSection question={t.sec6Q} hint={t.sec6Hint} color={ampelHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:10}}>
              <div style={{background:(R.gOhne||0)>=0?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",borderRadius:12,border:`0.5px solid ${(R.gOhne||0)>=0?"#22c55e44":"#ef444444"}`,borderTop:`5px solid ${(R.gOhne||0)>=0?"#22c55e":"#ef4444"}`,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:600,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>{t.saldoOhne}</div>
                <div style={{fontSize:22,fontWeight:700,color:(R.gOhne||0)>=0?"#15803d":"#b91c1c",fontVariantNumeric:"tabular-nums"}}>{(R.gOhne||0)>=0?"+":""}{fmtE(R.gOhne||0)}</div>
                <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.5}}>{t.sec6SaldoOhneHint}</div>
                <div style={{fontSize:10,color:"var(--ch)",marginTop:2}}>EK-R: {fmtP(+d.eigenkapital>0?(R.gOhne||0)/(+d.eigenkapital)*100:0,1)} p.a.</div>
              </div>
              <div style={{background:R.g>=0?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",borderRadius:12,border:`0.5px solid ${R.g>=0?"#22c55e44":"#ef444444"}`,borderTop:`5px solid ${R.g>=0?"#22c55e":"#ef4444"}`,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:600,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>{t.saldoMit}</div>
                <div style={{fontSize:22,fontWeight:700,color:R.g>=0?"#15803d":"#b91c1c",fontVariantNumeric:"tabular-nums"}}>{R.g>=0?"+":""}{fmtE(R.g)}</div>
                <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.5}}>{t.sec6SaldoMitHint}</div>
                <div style={{fontSize:10,color:"var(--ch)",marginTop:2}}>EK-R: {fmtP(+d.eigenkapital>0?R.g/(+d.eigenkapital)*100:0,1)} p.a.</div>
              </div>
            </div>
            {R.g>=0&&<div style={{marginTop:4}}><Ins emoji="🎯" text={`${t.positivSaldo}: ${fmtE(R.g)} — ${R.j} ${t.jPl}`} type="good"/></div>}
            {R.g<0&&<div style={{marginTop:4}}><Ins emoji="🚫" text={`${t.saldoMit}: ${fmtE(Math.abs(R.g))} — ${t.kaufpreis}, ${t.kaltmiete}, ${t.eigenkapital}`} type="bad"/></div>}
            {(()=>{
              const ekRpa=(+d.eigenkapital)>0?R.g/(+d.eigenkapital)/R.j*100:0;
              const ekRpaOhne=(+d.eigenkapital)>0?(R.gOhne||0)/(+d.eigenkapital)/R.j*100:0;
              const ekRCol=rate('ekRendite',ekRpa).color;
              return <>
                <div style={{marginTop:10}}>
                  <div style={{fontSize:10,fontWeight:600,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.7,marginBottom:6}}>{t.ekRTitle||"EK-Rendite p.a."}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
                    <AmpelKPI label={t.ekRMit||"EK-Rendite mit Steuer"} value={fmtP(ekRpa,2)}
                      color={ekRCol}
                      statusLabel={ekRCol==="green"?(t.badgeGut||"Stark"):ekRCol==="yellow"?(t.badgeOkay||"Moderat"):(t.badgeKrit||"Schwach")}
                      status={tpl(t.ekRHorizon||"{j} Jahre Anlagehorizont",{j:R.j})}
                      tip={tpl(t.ekRTip1||"Dein Eigenkapital ({ek}) wächst mit {p} p.a. — zum Vergleich: ETF historisch ~7%",{ek:fmtE(+d.eigenkapital||0),p:fmtP(ekRpa,2)})}/>
                    <AmpelKPI label={t.ekROhne||"EK-Rendite ohne Steuer"} value={fmtP(ekRpaOhne,2)}
                      color={rate('ekRendite',ekRpaOhne).color}
                      statusLabel={rate('ekRendite',ekRpaOhne).tier==="green"?(t.badgeGut||"Stark"):rate('ekRendite',ekRpaOhne).tier==="yellow"?(t.badgeOkay||"Moderat"):(t.badgeKrit||"Schwach")}
                      status={t.ekRConserv||"Konservative Betrachtung"}
                      tip={t.ekRTip2||"Ohne Steuerbonus — für Geringverdiener oder Basis-Szenario"}/>
                  </div>
                </div>
                {lang==='de'&&<SectionExplain
                  bullets={(()=>{const gR=rate('gesamtSaldo',R.g);const ekR=rate('ekRendite',ekRpa);const waR=rate('wertAnnahme',+d.wertP||0);return[
                    `${gR.symbol} Gesamtsaldo mit Steuer: ${R.g>=0?"+":""}${fmtE(R.g)} — ${R.g>=0?'positiv → gut':'negativ → kritisch'} über ${R.j} Jahre`,
                    `${ekR.symbol} EK-Rendite p.a. (mit Steuer): ${fmtP(ekRpa,2)} — ${ekRpa>=6?'≥ 6 % stark':ekRpa>=3?'3–6 % grenzwertig':'unter 3 %'} → ${vrd(ekR)} (ETF ~7 %)`,
                    `${waR.symbol} Wertsteigerungsannahme ${fmtP(+d.wertP||0,1)} p.a. — ${(+d.wertP||0)<=2.5?'konservativ ≤ 2,5 %':(+d.wertP||0)<=4?'ambitioniert 2,5–4 %':'>4 % optimistisch'} → ${vrd(waR)}`,
                    `Formel: (${fmtE(R.vw)} Verkaufserlös − ${fmtE(R.rsEnd)} Restschuld) + ${fmtE(R.sCF)} kum. CF − ${fmtE((+d.eigenkapital||0)+R.nbk+(+d.sonder||0)+(+d.renovierung||0))} Investition`,
                    ...(R.rsEnd>0?[`Restschuld bei Verkauf: ${fmtE(R.rsEnd)} — muss aus dem Verkaufserlös getilgt werden`]:["Darlehen vollständig abbezahlt!"]),
                    `Kum. Cashflow: ${R.sCF>=0?"+":""}${fmtE(R.sCF)} — ${R.sCF>=0?"netto Geld verdient":"netto Geld reingesteckt"}`
                  ]})()}
                  text={
                    `Das Gesamtergebnis ist die ehrlichste Zahl in diesem Rechner — hier wird alles zusammengezählt. Die Formel in Klartext: Du nimmst den geschätzten Verkaufserlös (${fmtE(R.vw)}), ziehst die Restschuld ab (${fmtE(R.rsEnd)}), addierst alle kumulierten Cashflows der ${R.j} Jahre (${R.sCF>=0?"+":""}${fmtE(R.sCF)}), und ziehst dann alles ab, was du anfangs reingesteckt hast: Eigenkapital, Kaufnebenkosten, Sonderumlage, Renovierung.\n\n${R.g>=0?"Das Ergebnis ist positiv — die Immobilie hat sich gelohnt. Du hast mehr rausgeholt als reingesteckt.":"Das Ergebnis ist negativ — nach aktuellem Stand hast du mehr investiert als du am Ende zurückbekommst. Das kann sich ändern, wenn die Wertsteigerung höher ausfällt oder du die Mieteinnahmen steigern kannst."}\n\nDie EK-Rendite p.a. macht das Ergebnis vergleichbar: Dein eingesetztes Eigenkapital von ${fmtE(+d.eigenkapital||0)} wächst mit ${fmtP(ekRpa,2)} pro Jahr — ${ekRpa>=7?"Das ist exzellent und schlägt historisch sogar einen ETF.":ekRpa>=5?"Das ist solide. Ein ETF bringt historisch ~7%, aber ohne Hebeleffekt und ohne die Stabilität einer Sachwertanlage.":ekRpa>=3?"Das ist okay, aber schwach für eine Immobilie mit Finanzierungsrisiko. Prüfe ob die Annahmen realistisch sind.":"Das ist schwach. Überleg ob Kaufpreis, Miete oder Finanzierung besser gestellt werden kann."}\n\nStellschrauben: Den Anlagehorizont verlängern (mehr Jahre = mehr Tilgung + mehr Wertsteigerung). Die Wertsteigerungsannahme realistisch halten (2–3% p.a. sind historisch solide für gute Lagen). Cashflow optimieren (weniger Leerstand, regelmäßige Mietanpassungen). Sondertilgungen nutzen, um die Restschuld zu drücken.`
                }
                />}
                {lang!=='de'&&t.s6b1&&<SectionExplain
                  bullets={[
                    tpl(t.s6b1,{a:(R.g>=0?'+':'')+fmtE(R.g),j:R.j}),
                    tpl(t.s6b2,{vw:fmtE(R.vw),rs:fmtE(R.rsEnd),cf:fmtE(R.sCF),inv:fmtE((+d.eigenkapital||0)+R.nbk+(+d.sonder||0)+(+d.renovierung||0))}),
                    tpl(t.s6b3,{a:fmtE(R.w),j:R.j,p:fmtP(+d.wertP||0)}),
                    tpl(t.s6b4,{a:fmtP(ekRpa,2)}),
                    ...(R.rsEnd>0?[tpl(t.s6b5n,{a:fmtE(R.rsEnd)})]:[t.s6b5p]),
                    R.sCF>=0?tpl(t.s6b6p,{a:fmtE(R.sCF)}):tpl(t.s6b6n,{a:fmtE(R.sCF)}),
                  ]}
                  text={tpl(t.s6t1,{vw:fmtE(R.vw),rs:fmtE(R.rsEnd),cf:fmtE(R.sCF)})+'\n\n'+(R.g>=0?t.s6t2p:t.s6t2n)+'\n\n'+(()=>{const r=ekRpa;return r>7?tpl(t.s6t3a,{a:fmtP(r,2)}):r>4?tpl(t.s6t3b,{a:fmtP(r,2)}):r>2?tpl(t.s6t3c,{a:fmtP(r,2)}):tpl(t.s6t3d,{a:fmtP(r,2)})})()}
                />}
              </>;
            })()}
                    </AccordionSection>;
        })()}

        {/* ═══ SECTION 7: Verkaufsszenario ═══ */}
        <AccordionSection question={t.sec7Q.replace('{j}',String(R.j))} hint={t.sec7Hint} sync={{key:secAllKey,open:secAllOpen}}>
          <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 8px"}}>{t.sec7Sub.replace(/\{j\}/g,String(R.j))}</div>
          <Detail R={R} d={d} hideSaldo={true}/>
          {lang==='de'&&<SectionExplain
            bullets={[
              `Geschätzter Verkaufswert in Jahr ${R.j}: ${fmtE(R.vw)} (Wertsteigerung: ${fmtP(+d.wertP||0,1)} p.a.)`,
              `Restschuld beim Verkauf: ${fmtE(R.rsEnd)}${R.rsEnd>0?" — wird aus dem Verkaufserlös getilgt":""}`,
              `Nettoerlös nach Tilgung: ${fmtE(R.vw-R.rsEnd)}`,
              `Maklerkosten beim Verkauf nicht eingerechnet — in der Praxis nochmals 3–7% des Verkaufspreises`,
              `${(R.j>10?"Spekulationsfrist von 10 Jahren überschritten: kein Verkaufgewinn versteuern!":"Spekulationsfrist läuft noch — Verkaufsgewinne werden mit dem Steuersatz versteuert")}`
            ]}
            text={`Die Tabelle zeigt alle Bestandteile deines Verkaufserlöses im Detail — aufgeschlüsselt für jeden Bestandteil des Ergebnisses. Der Kaufwert nach ${R.j} Jahren ist eine Schätzung auf Basis der eingegebenen Wertsteigerungsrate von ${fmtP(+d.wertP||0,1)} p.a. — das ist keine Garantie, sondern ein Planungsszenario.\n\nBesonders wichtig: Vergleiche den geschätzten Marktwert (${fmtE(R.vw)}) mit der Restschuld (${fmtE(R.rsEnd)}). Wenn die Restschuld höher ist als der Marktpreis, hast du ein Problem — du kannst die Immobilie nicht ohne Verlust verkaufen. Das kommt bei sehr hohem Beleihungsauslauf und geringen Tilgungsraten vor, vor allem wenn die Immobilienpreise fallen.\n\n${R.j>10?"Steuerlich interessant: Nach 10 Jahren Haltedauer ist der Verkaufsgewinn bei Privatpersonen steuerfrei (§23 EStG Spekulationsfrist). Das kann bei guter Wertsteigerung Tausende von Euro Steuerersparnis bedeuten.":"Achtung: Du bist noch innerhalb der 10-Jahres-Spekulationsfrist. Wenn du die Immobilie jetzt verkaufst, wird der Gewinn mit deinem Steuersatz besteuert — das kann ein erheblicher Abzug sein."}\n\nDenk auch an die Verkaufskosten: Makler (3–7% des Verkaufspreises), Notar, Grundbuch. Die sind in diesem Rechner nicht eingerechnet, schmälern aber den Nettoerlös deutlich.`
          }
          />}
          {lang!=='de'&&t.s7b1&&<SectionExplain
            bullets={[
              tpl(t.s7b1,{j:R.j,vw:fmtE(R.vw),p:fmtP(+d.wertP||0,1)}),
              R.rsEnd>0?tpl(t.s7b2a,{a:fmtE(R.rsEnd)}):tpl(t.s7b2b,{a:fmtE(R.rsEnd)}),
              tpl(t.s7b3,{a:fmtE(R.vw-R.rsEnd)}),
              t.s7b4,
              R.j>10?t.s7b5p:t.s7b5n,
            ]}
            text={tpl(t.s7t1,{vw:fmtE(R.vw),p:fmtP(+d.wertP||0,1)})+'\n\n'+tpl(t.s7t2,{vw:fmtE(R.vw),rs:fmtE(R.rsEnd)})+'\n\n'+(R.j>10?t.s7t3p:t.s7t3n)+'\n\n'+t.s7t4}
          />}
        </AccordionSection>

        <SaveBtn tab="haupt"/>
        <ExportPDF title={t.hauptFull||t.haupt}/>
        <Legal items={LEG.rendite}/>
      </>}
    </div>
  </div></div>;
}


// ═══ KREDIT (mit Sondertilgung + Beratung) ═══
function Kredit(){
  const{d,set,t,tip}=useApp();
  const[view,setView]=useState("input");
  const[sondTP,setSondTP]=useState("5");

  const R=useMemo(()=>{
    const kp=+d.kaufpreis||0,ga=+d.garage||0,gKP=kp+ga,ek=+d.eigenkapital||0;
    const zP=+d.zinssatz||0,tP=+d.tilgung||0,zbJ=+d.zinsbindung||10;
    const gP=GREST[d.bundesland]||0,nP=+d.notar||0,mP=+d.makler||0;
    if(kp<=0)return null;
    const da=Math.max(0,gKP-ek),nbk=gKP*(gP+nP+mP)/100;
    const bel=gKP>0?da/gKP*100:0,mz=zP/100/12;
    const ann=da*(zP+tP)/100/12;
    let lz=0;
    if(mz>0&&ann>da*mz)lz=Math.log(ann/(ann-da*mz))/Math.log(1+mz)/12;
    else if(mz===0&&ann>0)lz=da/ann/12;
    let rs=da,sZ=0,rows=[],rZB=da;
    const mJ=Math.min(isFinite(lz)?Math.ceil(lz)+1:60,60);
    for(let j=1;j<=mJ;j++){
      // Monatliche Iteration: Restschuld sinkt monatlich → korrekte Jahreszinsen
      let z=0,t2=0;
      for(let m=0;m<12&&rs>0;m++){
        const zm=rs*mz;
        const tm=Math.min(ann-zm,rs);
        if(tm<=0)break;
        z+=zm;t2+=tm;
        rs=Math.max(0,rs-tm);
      }
      sZ+=z;
      if(j===zbJ)rZB=rs;
      rows.push({j,z,t:t2,rest:rs,isZB:j===zbJ});
      if(rs<=0)break;
    }
    const z1=da*mz,t1=ann-z1;
    const sondP=+sondTP||0,sondE=da*sondP/100;
    let rs2=da,sZ2=0,years2=0;
    const mZm=zP/100/12,annM=da*(zP+tP)/100/12;
    while(rs2>0&&years2<60){
      years2++;
      for(let m=0;m<12&&rs2>0;m++){
        const zi=rs2*mZm;
        const ti=Math.min(annM-zi,rs2);
        if(ti<=0){years2=Infinity;break}
        sZ2+=zi;
        rs2=Math.max(0,rs2-ti);
      }
      if(!isFinite(years2))break;
      if(sondE>0&&rs2>0)rs2=Math.max(0,rs2-sondE);
    }
    const zinsenGespart=sZ-sZ2;
    const jahreGespart=isFinite(years2)?lz-years2:0;
    return{da,nbk,bel,ann,lz,sZ,rZB,rows,z1,t1,gP,zbJ,gA:da+sZ+nbk,sondP,sondE,sZ2,years2,zinsenGespart,jahreGespart};
  },[d,sondTP]);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={`${t.kaufpreis} & ${t.eigenkapital}`} icon="🏠"/>
      <F label={t.kaufpreis} unit="€" value={d.kaufpreis} onChange={v=>set("kaufpreis",v)} tip={tip("kaufpreis")}/>
      <Row><F label={t.eigenkapital} unit="€" value={d.eigenkapital} onChange={v=>set("eigenkapital",v)} tip={tip("eigenkapital")}/><F label={t.darlehen} unit="€" value={R?fmt(R.da):"—"} readOnly/></Row>
      <Sec title={t.nbk} icon="📋"/>
      <Row><F label={t.grEst} unit="%" value={R?.gP||"—"} readOnly tip={tip("grEst")}/><F label={t.notar} unit="%" value={d.notar} onChange={v=>set("notar",v)} step="0.1" tip={tip("notar")}/></Row>
      <Row><F label={t.makler} unit="%" value={d.makler} onChange={v=>set("makler",v)} step="0.01" tip={tip("makler")}/><F label="NBK ges." unit="€" value={R?fmt(R.nbk):"—"} readOnly/></Row>
      <Sec title={t.fin} icon="🏦"/>
      <Row><F label={t.zinssatz} unit="% p.a." value={d.zinssatz} onChange={v=>set("zinssatz",v)} step="0.05" tip={tip("zinssatz")}/><F label={t.tilgung} unit="% p.a." value={d.tilgung} onChange={v=>set("tilgung",v)} step="0.05" tip={tip("tilgung")}/></Row>
      <Sel label={t.zinsbindung} value={d.zinsbindung} onChange={v=>set("zinsbindung",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/>
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}>🏦</div>:<>
        <div style={{background:"linear-gradient(135deg,var(--ca),var(--ca-dk))",borderRadius:14,padding:"18px 16px",color:"#fff",marginBottom:14}}>
          <div style={{fontSize:10,opacity:.8,textTransform:"uppercase"}}>{t.rate}</div>
          <div style={{fontSize:26,fontWeight:700,marginTop:4}}>{fmtE(R.ann)}</div>
          <div style={{display:"flex",gap:20,marginTop:12}}>
            <div><div style={{fontSize:9,opacity:.6}}>{t.zins}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.z1)}/Mo.</div></div>
            <div><div style={{fontSize:9,opacity:.6}}>{t.tilgK}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.t1)}/Mo.</div></div>
          </div>
        </div>
        <div className="if-row" style={{marginBottom:14}}>
          <KPI label={t.darlehen} value={fmtE(R.da)} sub={`${t.bel}: ${fmtP(R.bel)}`}/>
          <KPI label={t.laufzeit} value={isFinite(R.lz)?`${fmt(R.lz,1)} J.`:"—"}/>
          <KPI label={t.gZin} value={fmtE(R.sZ)}/>
          <KPI label={t.nbk} value={fmtE(R.nbk)}/>
          <KPI label={t.gAuf} value={fmtE(R.gA)}/>
          <KPI label={t.rest} value={fmtE(R.rZB)} sub={`nach ${R.zbJ} J.`}/>
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:600}}>{t.bel}</span>
            <span style={{fontSize:13,fontWeight:600,color:R.bel>90?"#ef4444":R.bel>80?"#f59e0b":"#22c55e"}}>{fmtP(R.bel)}</span>
          </div>
          <div style={{height:6,borderRadius:3,background:"var(--cb)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(R.bel,100)}%`,borderRadius:3,background:R.bel>90?"#ef4444":R.bel>80?"#f59e0b":"var(--ca)"}}/>
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{R.bel>90?t.belCond90:R.bel>80?t.belCond80:t.belCondOk}</div>
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"2px solid var(--ca)",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:14,fontWeight:600}}>💰 {t.sondTilgLabel}</span>
            <Tip text={tip("sondertilg")}/>
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginBottom:10}}>{t.sondTilgSub}</div>
          <Row>
            <F label={t.vereinbSatz} unit="%" value={sondTP} onChange={setSondTP} step="1"/>
            <F label={t.entspricht} unit="€/Jahr" value={fmt(R.sondE)} readOnly/>
          </Row>
          <div style={{fontSize:11,color:"var(--ch)",marginTop:2,marginBottom:10}}>{t.stdSond}</div>
          {R.sondE>0&&isFinite(R.years2)&&<div style={{background:"var(--ci)",borderRadius:8,padding:"10px 12px",fontSize:12}}>
            <div style={{fontWeight:600,color:"var(--ca)",marginBottom:6}}>{t.effekt} {fmt(R.sondP)}% = {fmtE(R.sondE)}/J.:</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.neueLaufzeit}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmt(R.years2,1)} J. ({t.statt} {fmt(R.lz,1)} J.)</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.zinsenGespart}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmtE(R.zinsenGespart)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.jahre}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmt(R.jahreGespart,1)} J.</span></div>
          </div>}
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12,overflow:"auto"}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.tPl}</div>
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid var(--cb)"}}>{[t.jahre.slice(0,2),t.rate,t.gZin,t.tilgung,t.rest].map(h=><th key={h} style={{padding:"3px 4px",textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{h}</th>)}</tr></thead>
            <tbody>{R.rows.map(r=><tr key={r.j} style={{borderBottom:"1px solid var(--cb)",background:r.isZB?"var(--ci)":"transparent"}}>
              <td style={{padding:"3px 4px"}}>{r.j}{r.isZB?" ◀":""}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(R.ann*12)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"#ef4444"}}>{fmtE(r.z)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(r.t)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{r.rest>0?fmtE(r.rest):"✅"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.advTitle}</div>
          {R.restZB>0&&R.da>0&&(R.restZB/R.da)>0.6&&<Ins emoji="⚠️" text={t.adv7} type="bad"/>}
          {(+d.zinsbindung)<10&&(+d.zinssatz)>3.5&&<Ins emoji="🛡️" text={t.adv8} type="warn"/>}
          {(+d.tilgung)<2&&<Ins emoji="🐌" text={t.adv9} type="warn"/>}
          {R.lz>25&&R.sondP===0&&<Ins emoji="💰" text={t.adv10} type="info"/>}
          {R.bel>=80&&R.bel<=90&&<Ins emoji="🏦" text={t.adv11} type="info"/>}
        </div>
        <SaveBtn tab="kredit"/>
        <ExportPDF title={t.kreditFull||t.kredit}/>
        <Legal items={LEG.kredit}/>
      </>}
    </div>
  </div></div>;
}

// ═══ MIETERHÖHUNG (mit Beratung) ═══
function Miete(){
  const{d,set,t,tip,lang}=useApp();
  const[view,setView]=useState("input");
  const R=useMemo(()=>{
    const mi=+d.kaltmiete||0,qm=+d.flaeche||1,vQ=+d.vergleichsmiete||0,j=+d.mietJahre||10;
    if(mi<=0)return null;
    const k15=isK15(d.ort)||d.bundesland==="BE"||d.bundesland==="HH",kP=k15?15:20;
    const mt=buildMP(mi,qm,vQ,kP,d.letzteErhDatum,+d.letzteErhMiete||0,j,k15);
    return{...mt,kP,k15,mi,vQ,vm:vQ>0?vQ*qm:null};
  },[d]);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <PLZSearch/>
      <Sec title={t.kaltmiete} icon="💰"/>
      <F label={t.kaltmiete} unit={`€/${t.monLabel||"Mon."}`} value={d.kaltmiete} onChange={v=>set("kaltmiete",v)} tip={tip("kaltmiete")}/>
      <Row><F label={t.flaeche} unit="m²" value={d.flaeche} onChange={v=>set("flaeche",v)} tip={tip("flaeche")}/><F label={t.vgl} unit="€/m²" value={d.vergleichsmiete} onChange={v=>set("vergleichsmiete",v)} step="0.5" tip={tip("vglMiete")}/></Row>
      <Sec title={t.immLeerQ} icon="🏠"/>
      <div style={{display:"flex",gap:8,marginBottom:12}}>{[["nein",t.immLeerNein],["ja",t.immLeerJa]].map(([val,lbl])=><button key={val} onClick={()=>{set("immLeer",val);if(val==="nein"){set("letzteErhDatum",new Date(new Date().getFullYear(),new Date().getMonth()+4,1).toISOString().split("T")[0]);set("letzteErhMiete","0");}else{set("letzteErhDatum",new Date(new Date().getFullYear()-2,new Date().getMonth(),1).toISOString().split("T")[0]);}}} style={{flex:1,padding:"10px 8px",borderRadius:8,border:`2px solid ${d.immLeer===val?"var(--ca)":"var(--cb)"}`,background:d.immLeer===val?"var(--ca)":"var(--cc)",color:d.immLeer===val?"#fff":"var(--ct)",fontSize:13,fontWeight:d.immLeer===val?600:400,cursor:"pointer",transition:"all .15s"}}>{lbl}</button>)}</div>
      <Sec title={d.immLeer==="nein"?t.mietbeginn:t.lDat} icon="📅"/>
      {d.immLeer==="nein"?<F label={t.mietbeginn} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/>:<Row><F label={t.lDat} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/><F label={t.lMiet} unit="€" value={d.letzteErhMiete} onChange={v=>set("letzteErhMiete",v)} tip={tip("lMiet")}/></Row>}
      <Sel label={t.jahre} value={d.mietJahre||"10"} onChange={v=>set("mietJahre",v)} options={[5,10,15,20].map(y=>({v:y,l:`${y} J.`}))}/>
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}>💰</div>:<>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.kapp}</div>
          <div style={{fontSize:12,lineHeight:1.8}}>
            {[[t.ort,d.ort||"—"],[t.kapp,<span style={{fontWeight:600,color:"var(--ca)"}}>{R.kP}% in 3 J.</span>],[t.markt,R.k15?"🔴 "+t.ang:"🟢 "+t.std],...(R.vm?[[t.vgl,fmtE(R.vm)+"/Mon."]]:[])].map(([k,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--ch)"}}>{k}</span><span>{v}</span></div>)}
          </div>
        </div>
        {R.rows.length>0?(()=>{
          const nx=R.rows[0],jz=nx.datum<=new Date();
          return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.nE}</div>
            <div style={{fontSize:12,lineHeight:1.8}}>
              {[[t.dat,<span style={{fontWeight:600,color:"var(--ca)"}}>{fmtDat(nx.datum,lang)}</span>],[t.akt,fmtE(nx.aktMiete)+"/Mon."],[t.mxE,<span style={{color:"#22c55e"}}>{nx.mE>0?`+${fmtE(nx.mE)}`:"—"}</span>],[t.nM,<span style={{fontWeight:600,color:"var(--ca)"}}>{fmtE(nx.neueMiete)}/Mon.</span>]].map(([k,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--ch)"}}>{k}</span><span>{v}</span></div>)}
            </div>
            <div style={{marginTop:8,padding:"6px 10px",borderRadius:6,fontSize:11,background:jz?"#E8F8EE":"#FFF8E6",color:jz?"#1a7a3a":"#8a6d10"}}>{jz?`✅ ${t.jM}`:`⏳ ${t.ab} ${fmtDat(nx.datum,lang)}`}</div>
          </div>;
        })():<Ins emoji="ℹ️" text={t.keE} type="info"/>}
        {R.rows.length>0&&<div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12,overflow:"auto"}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.mPl}</div>
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid var(--cb)"}}>{[t.dat,t.akt,t.vgl,t.erh,t.nM,t.sta].map(h=><th key={h} style={{padding:"3px 4px",textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{h}</th>)}</tr></thead>
            <tbody>{R.rows.map((r,i)=><tr key={i} style={{borderBottom:"1px solid var(--cb)"}}>
              <td style={{padding:"3px 4px"}}>{fmtDat(r.datum,lang)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(r.aktMiete)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"var(--ch)"}}>{r.vmProg?fmtE(Math.round(r.vmProg)):"—"}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:r.mE>0?"#22c55e":"var(--ch)"}}>{r.mE>0?`+${fmtE(r.mE)}`:"—"}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"var(--ca)"}}>{fmtE(r.neueMiete)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:r.sC==="pos"?"#22c55e":"#ef4444"}}>{r.status}</td>
            </tr>)}</tbody>
          </table>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:6}}>{R.vQ>0?`📊 Ø +${fmt(R.vmPA,1)}% p.a. | ${R.q}`:""}</div>
        </div>}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.advTitle}</div>
          {(()=>{const nx=R.rows&&R.rows[0];const mi=+d.kaltmiete||0;const vm=+d.vergleichsmiete||0;const lD=d.letzteErhDatum?new Date(d.letzteErhDatum):null;const jetzt=new Date();const jahre3=lD?((jetzt-lD)/(1000*60*60*24*365.25)):99;return(<>{vm>0&&mi>0&&mi<vm*0.85&&nx&&nx.verfK>0&&<Ins emoji="📈" text={t.adv12} type="info"/>}{jahre3>3&&<Ins emoji="🔄" text={t.adv13} type="good"/>}{nx&&nx.verfK<=0&&vm>0&&mi<vm*0.95&&<Ins emoji="⏳" text={t.adv14} type="warn"/>}{R.k15&&vm>0&&mi>=vm*0.9&&<Ins emoji="🔧" text={t.adv15} type="info"/>}</>);})()}
        </div>
        <SaveBtn tab="miete"/>
        <ExportPDF title={t.mieteFull||t.miete}/>
        <Legal items={LEG.miete}/>
      </>}
    </div>
  </div></div>;
}


// ═══ SANIERUNG (3-Stufen, erweiterte Maßnahmen, GEG, Amortisation) ═══
const EC_O=["A+","A","B","C","D","E","F","G","H"];
const EC_C=["#0D6E3A","#2E9E52","#6DBE45","#A7CE3F","#F7CE1F","#F6A623","#E97020","#DD3A1E","#B01414"];
const kw2ec=k=>{if(k<=30)return 0;if(k<=50)return 1;if(k<=75)return 2;if(k<=100)return 3;if(k<=130)return 4;if(k<=160)return 5;if(k<=200)return 6;if(k<=250)return 7;return 8};

// SAN_TIERS und SAN_SRC_KEYS → importiert aus ./data.js


function TierSel({value,onChange,tiers}){
  const{t}=useApp();
  const opts=[{k:"s",l:t.tierS||"Standard",c:"var(--ch)"},{k:"g",l:t.tierG||"Gehoben",c:"var(--ca)"},{k:"m",l:t.tierM||"Premium",c:"#b8860b"}];
  return <div style={{display:"flex",gap:0,borderRadius:6,overflow:"hidden",border:"1px solid var(--cb)",marginBottom:6}}>
    {opts.map(o=><button key={o.k} onClick={()=>onChange(o.k)} style={{flex:1,padding:"6px 2px",border:"none",fontSize:10,fontWeight:value===o.k?600:400,cursor:"pointer",background:value===o.k?"var(--ca)":"var(--ci)",color:value===o.k?"#fff":"var(--ch)",fontFamily:"inherit",lineHeight:1.2}}>
      <div>{o.l}</div>
      {tiers[o.k]&&<div style={{fontSize:9,marginTop:1,opacity:value===o.k?1:.7}}>{fmtE(tiers[o.k].p)}</div>}
    </button>)}
  </div>;
}

function Sanier(){
  const{d,set,t,tip}=useApp();
  const[view,setView]=useState("input");
  const[act,setAct]=useState({fenster:false,fassade:false,heizung:false,dach:false,tuer:false,pv:false,keller:false,ogdecke:false,batterie:false,lueftung:false});
  const[tier,setTier]=useState({fenster:"s",fassade:"s",heizung:"s",dach:"s",tuer:"s",pv:"s",lueftung:"s"});
  const[s,setS]=useState({fA:"12",fXL:"0",fHST:"0",faF:"137",anbau:"frei",daF:"80",dachform:"sattel",pvK:"7",keF:"60",ogF:"60",batK:"7",epStrom:String(SAN_ENERGIE.defaultStrompreis),epHeiz:String(SAN_ENERGIE.defaultHeizpreis),hkJahr:"",skJahr:"",preisstieg:"2"});
  const sF=(k,v)=>setS(p=>({...p,[k]:v}));
  const tog=k=>setAct(p=>({...p,[k]:!p[k]}));
  const setT=(k,v)=>setTier(p=>({...p,[k]:v}));
  const getEkl=bj=>{const y=+bj||1981;const hk=SAN_NORMEN.hkBaujahr.find(r=>y<=r.bis)?.hk??50;return ENERGIE_KLASSEN.find(r=>hk<=r.bis)?.kl??"H";};

  const R=useMemo(()=>{
    const fl=+d.sanFl||+d.flaeche||140,bj=+d.baujahr||1981,ht=d.sanHt||"heizoel",ha=d.sanHa||"alt",pe=+d.sanPe||3;
    const hkEntry=SAN_NORMEN.hkBaujahr.find(e=>bj<=e.bis)||SAN_NORMEN.hkBaujahr[SAN_NORMEN.hkBaujahr.length-1];
    const hk=hkEntry.hk;
    const co2F=SAN_ENERGIE.co2F[ht]||0.2;
    const ep=SAN_ENERGIE.ep[ht]||0.12;
    const eH=Math.round(hk*fl)+Math.round(pe*SAN_NORMEN.warmwasserKWhPerson)+Math.round(fl*SAN_NORMEN.hilfsStromKWhM2);
    const co2H=Math.round(eH*co2F);
    const epStrom=+s.epStrom||SAN_ENERGIE.defaultStrompreis,epHeiz=+s.epHeiz||SAN_ENERGIE.defaultHeizpreis;
    const htIsStrom=ht==="wp"||ht==="strom";
    const epKwh=htIsStrom?epStrom:epHeiz;
    // Jahreskosten: user-eingabe überschreibt Auto-Kalkulation (muss VOR kH/skJ stehen)
    const hkJahrUser=+s.hkJahr||0,skJahrUser=+s.skJahr||0;
    const preisstieg=(+s.preisstieg||2)/100; // %/Jahr Energiepreis-Steigerung
    const kH_auto=Math.round(eH*ep/50)*50;
    const kH=hkJahrUser>0?hkJahrUser:kH_auto; // User-Eingabe hat Vorrang
    const stromKWhBDEW=SAN_NORMEN.stromBDEW[Math.min(pe,5)]||SAN_NORMEN.stromBDEW[3];
    const sk_auto=Math.round(stromKWhBDEW*epStrom/50)*50; // BDEW-Norm nach Personenhaushalt
    const skJ=skJahrUser>0?skJahrUser:sk_auto;

    const anbauF=s.anbau==="doppel"?0.75:s.anbau==="mittel"?0.5:1;
    const oF=(ht==="heizoel"||ht==="gas"||ht==="kohle")&&ha==="alt";
    const hFQ=Math.min(.30+(oF?.20:.00),.70); // BAFA BEG 2026: 30% Grund + 20% Klimabonus (alte Öl/Gas/Kohle), kein +5% für andere
    const iB=d.sanIsfp?.05:0; // iSFP-Bonus: +5% auf alle BEG-fähigen Maßnahmen

    const FQ={fenster:.15+iB,fassade:.15+iB,heizung:Math.min(hFQ+iB,.70),dach:.15+iB,tuer:.15+iB,pv:0,keller:.15+iB,ogdecke:.15+iB,batterie:0,lueftung:.15+iB};
    // BAFA/KfW Förder-Caps: dynamisch aus FQ (damit iSFP-Bonus automatisch einfliesst)
    const FO_CAP={
      fenster:Math.round(30000*FQ.fenster),
      fassade:Math.round(30000*FQ.fassade),
      heizung:Math.round(30000*FQ.heizung),
      dach:Math.round(30000*FQ.dach),
      tuer:Math.round(30000*FQ.tuer),
      pv:Infinity,                     // KfW 270: kein Betragscap
      keller:Math.round(30000*FQ.keller),
      ogdecke:Math.round(30000*FQ.ogdecke),
      batterie:Infinity,               // Landesförderung: variiert
      lueftung:Math.round(30000*FQ.lueftung)
    };
    const ES={
      fenster:{ek:.12,co2:.10},fassade:{ek:.20,co2:.18},heizung:{ek:.35,co2:.45},
      dach:{ek:.08,co2:.07},tuer:{ek:.02,co2:.02},
      pv:{ek:Math.min((+s.pvK||7)*SAN_NORMEN.pvErtragKWhKwp*ep/Math.max(kH,1),.25),co2:Math.min((+s.pvK||7)*SAN_NORMEN.pvErtragKWhKwp*SAN_ENERGIE.co2F.strom/Math.max(co2H,1),.20)},
      keller:{ek:.05,co2:.04},ogdecke:{ek:.06,co2:.05},
      batterie:{ek:.05,co2:.03},lueftung:{ek:.08,co2:.06}
    };

    const fA=+s.fA||12,fXL=+s.fXL||0,fHST=+s.fHST||0;
    const tF=tier.fenster,tFa=tier.fassade,tH=tier.heizung,tD=tier.dach,tT=tier.tuer,tP=tier.pv,tL=tier.lueftung;
    const fenK=fA*SAN_TIERS.fenster[tF].p+fXL*(SAN_TIERS.fensterXL[tF]?.p||2000)+fHST*(SAN_TIERS.fensterHST[tF]?.p||5000);
    const faF2=+s.faF||137,fasK=Math.round(SAN_TIERS.fassade[tFa].p*anbauF*Math.max(faF2,40)/137);
    const hzK=SAN_TIERS.heizung[tH].p;
    const daF2=+s.daF||80,daK=Math.round(SAN_TIERS.dach[tD].p*Math.max(daF2,30)/80);
    const tuerK=SAN_TIERS.tuer[tT].p;
    const pvK2=+s.pvK||7,pvKo=Math.round(SAN_TIERS.pv[tP].p*pvK2/7);
    const keF2=+s.keF||60,kelK=Math.round(keF2*37);
    const ogF2=+s.ogF||60,ogK=Math.round(ogF2*35);
    const batK2=+s.batK||7,batKo=Math.round(batK2*1000);
    const lueK=SAN_TIERS.lueftung[tL].p;

    const ALL=[
      {k:"fenster",n:t.sanMassN1,c:fenK,em:"🪟",det:`${fA} Std.${fXL>0?", "+fXL+" XL":""}${fHST>0?", "+fHST+" HST":""}`,src:SAN_SRC_KEYS.fenster},
      {k:"fassade",n:t.sanMassN2,c:fasK,em:"🧱",det:`${faF2}m² · ${s.anbau==="doppel"?t.anbDoppel:s.anbau==="mittel"?t.anbMittel:t.anbFrei} · ${SAN_TIERS.fassade[tFa].d}cm`,src:SAN_SRC_KEYS.fassade},
      {k:"heizung",n:t.sanMassN3,c:hzK,em:"🔥",det:t[SAN_TIERS.heizung[tH].l]||SAN_TIERS.heizung[tH].l,src:SAN_SRC_KEYS.heizung},
      {k:"dach",n:t.sanMassN4,c:daK,em:"🏠",det:`${daF2}m² · ${s.dachform==="flach"?t.dchFlach:s.dachform==="walm"?t.dchWalm:t.dchSattel}`,src:SAN_SRC_KEYS.dach},
      {k:"tuer",n:t.sanMassN5,c:tuerK,em:"🚪",det:t[SAN_TIERS.tuer[tT].l]||SAN_TIERS.tuer[tT].l,src:SAN_SRC_KEYS.tuer},
      {k:"pv",n:t.sanMassN6,c:pvKo,em:"☀️",det:`${pvK2} kWp · ${t[SAN_TIERS.pv[tP].l]||SAN_TIERS.pv[tP].l}`,src:SAN_SRC_KEYS.pv},
      {k:"keller",n:t.sanMassN7,c:kelK,em:"🏗️",det:`${keF2}m²`,src:SAN_SRC_KEYS.keller},
      {k:"ogdecke",n:t.sanMassN8,c:ogK,em:"🔝",det:`${ogF2}m²`,src:SAN_SRC_KEYS.ogdecke},
      {k:"batterie",n:t.sanMassN9,c:batKo,em:"🔋",det:`${batK2} kWh`,src:SAN_SRC_KEYS.batterie},
      {k:"lueftung",n:t.sanMassN10,c:lueK,em:"💨",det:t[SAN_TIERS.lueftung[tL].l]||SAN_TIERS.lueftung[tL].l,src:SAN_SRC_KEYS.lueftung}
    ];

    let tK=0,tFo=0,tFoLand=0,eM=1,cM=1;
    const rows=[];
    const blBonus=LAND_BONUS_FQ[d.bundesland]||{};
    ALL.forEach(m=>{
      if(!act[m.k])return;
      const fq=FQ[m.k]||0;
      const fqL=blBonus[m.k]||0;                       // Landesbonus-Quote
      const foRaw=Math.round(m.c*fq/100)*100;
      const fo=Math.min(foRaw,FO_CAP[m.k]??foRaw);    // BAFA/KfW Cap
      const foLandRaw=Math.round(m.c*fqL/100)*100;
      const foLand=Math.min(foLandRaw,LAND_BONUS_CAP); // Landesbonus Cap
      tK+=m.c;tFo+=fo;tFoLand+=foLand;
      const ekE=Math.round(kH*(ES[m.k]?.ek||0)/50)*50;
      const co2E=Math.round(co2H*(ES[m.k]?.co2||0));
      eM*=(1-(ES[m.k]?.ek||0));
      cM*=(1-(ES[m.k]?.co2||0));
      const capped=foRaw>fo;
      rows.push({n:m.n,em:m.em,c:m.c,f:fo,foLand,fqL:Math.round(fqL*100),net:m.c-fo-foLand,ek:ekE,co2:co2E,src:m.src,fq:Math.round(fq*100),det:m.det,k:m.k,capped});
    });
    const ne=tK-tFo-tFoLand;
    const ekG=Math.round(kH*(1-eM)/50)*50;
    const co2G=Math.round(co2H*(1-cM));
    const espEuro=ekG; // ekG bereits in €/Jahr — keine weitere Multiplikation mit epKwh
    // PV: Stromersparnis durch Eigenverbrauch (zusätzlich zur Heizersparnis)
    // min(PV-Eigenverbrauch kWh, tatsächlicher Jahresstromverbrauch kWh) × Strompreis
    const pvK2tmp=+s.pvK||7;
    const pvEigenverbrauchKwh=act.pv
      ?Math.min(pvK2tmp*SAN_NORMEN.pvErtragKWhKwp*SAN_NORMEN.pvEigenverbrauchQuote,fl*SAN_NORMEN.hausStromKWhM2)
      :0;
    const pvStromEsp=Math.round(pvEigenverbrauchKwh*epStrom/50)*50;
    const totalEsp=espEuro+pvStromEsp; // Gesamtersparnis für Amortisationsrechnung
    // Amortisation mit optionaler Preissteigerungs-Prognose
    let amJ=99;
    if(totalEsp>0&&ne>0){
      if(preisstieg<=0){
        amJ=Math.round(ne/totalEsp*10)/10;
      } else {
        // Geometrische Reihe: ne = totalEsp * ((1+p)^n - 1) / p
        let kum=0,yr=0;
        while(kum<ne&&yr<80){yr++;kum+=totalEsp*Math.pow(1+preisstieg,yr-1);}
        amJ=yr<80?yr:99;
      }
    }

    const gegReq=[];
    if(bj<2002&&ha==="alt"&&(ht==="heizoel"||ht==="gas"))gegReq.push({law:"§ 72 GEG",text:t.sanTip4,sev:"warn"});
    if(bj<1984)gegReq.push({law:"§ 47 GEG",text:t.sanMassN8+" — "+t.sHTyp,sev:"info"});
    if(bj<1978)gegReq.push({law:"§ 71 GEG",text:t.sanMassN3+": 65% "+t.str,sev:"info"});
    if(hk>200)gegReq.push({law:"EU-EPBD",text:`${t.eKl} ${EC_O[kw2ec(hk)]} (${hk} kWh/m²a)`,sev:"warn"});

    return{tK,tFo,tFoLand,ne,ekG,co2G,amJ,ecV:kw2ec(hk),ecN:kw2ec(Math.max(hk*eM,10)),hk,eM,cM,kH,skJ,co2H,ALL,rows,epKwh,htIsStrom,espEuro,pvStromEsp,totalEsp,gegReq,preisstieg,sk_auto,kH_auto};
  },[d,s,act,tier,t]);

  const htO=[{v:"gas",l:t.gas},{v:"heizoel",l:t.oel},{v:"wp",l:t.wp},{v:"pellets",l:t.pel},{v:"fernw-std",l:t.fw},{v:"kohle",l:t.koh},{v:"strom",l:t.str}];
  const haO=[{v:"alt",l:t.alt},{v:"mittel",l:t.mitt},{v:"neu",l:t.neu}];
  const anbauO=[{v:"frei",l:t.anbFrei},{v:"doppel",l:t.anbDoppel},{v:"mittel",l:t.anbMittel}];
  const dachO=[{v:"sattel",l:t.dchSattel},{v:"flach",l:t.dchFlach},{v:"walm",l:t.dchWalm}];
  const hasTier=k=>["fenster","fassade","heizung","dach","tuer","pv","lueftung"].includes(k);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <Sel label={t.bundesland} value={d.bundesland} onChange={v=>set("bundesland",v)} options={BL_O}/>
      {d.bundesland&&<div style={{fontSize:10,color:"var(--ch)",marginTop:-6,marginBottom:10,paddingLeft:4}}>🏦 Landesbank: {LAND_F[d.bundesland]||"BEG"} — {t.sanLandesbankHint}</div>}
      <button onClick={()=>set("sanIsfp",!d.sanIsfp)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:d.sanIsfp?"#dcfce7":"var(--ci)",border:`1px solid ${d.sanIsfp?"#22c55e":"var(--cb)"}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",marginBottom:10,textAlign:"left",fontFamily:"inherit"}}>
        <div style={{width:34,height:20,borderRadius:10,background:d.sanIsfp?"#22c55e":"var(--cb)",position:"relative",flexShrink:0,transition:"background .2s"}}>
          <div style={{position:"absolute",top:2,left:d.sanIsfp?16:2,width:16,height:16,borderRadius:8,background:"#fff",transition:"left .2s"}}/>
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:d.sanIsfp?"#15803d":"var(--ct)"}}><span style={{display:"flex",alignItems:"center",gap:4}}>{t.sanIsfpLabel}<Tip text={tip("isfp")}/></span></div>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:1}}>{t.sanIsfpSub}</div>
        </div>
      </button>
      <Sec title={t.sGebData} icon="🏠"/>
      <Row><F label={t.sWfl} unit="m²" value={d.sanFl||d.flaeche||"140"} onChange={v=>set("sanFl",v)} tip={tip("flaeche")}/><F label={t.sBJ} value={d.baujahr||"1981"} onChange={v=>set("baujahr",v)} tip={tip("sanBj")}/></Row>
      {(+d.baujahr||0)>0&&<div style={{display:"flex",gap:12,marginTop:-4,marginBottom:8,fontSize:11,paddingLeft:2,flexWrap:"wrap"}}>
        <span style={{color:"var(--ch)"}}>🏠 {t.eKl}: <b style={{color:"var(--ct)"}}>{getEkl(d.baujahr)}</b></span>
        {(+d.baujahr)<KFW.klimaBonus_baujahrGrenze
          ?<span style={{color:"#15803d",fontWeight:600}}>· ✅ KfW Klimabonus</span>
          :<span style={{color:"var(--ch)"}}>· KfW Klimabonus: ✗</span>}
      </div>}
      <Row><Sel label={t.sHTyp} value={d.sanHt||"heizoel"} onChange={v=>set("sanHt",v)} options={htO}/><Sel label={t.sHAlt} value={d.sanHa||"alt"} onChange={v=>set("sanHa",v)} options={haO}/></Row>
      <F label={t.sPers} value={d.sanPe??""} placeholder="3" onChange={v=>set("sanPe",v)} tip={tip("pers")}/>
      <Sec title={t.sEnergie} icon="⚡"/>
      <Row><F label={t.sStrPr} unit="€/kWh" value={s.epStrom} onChange={v=>sF("epStrom",v)} step="0.01" tip={tip("epStrom")}/><F label={t.sSkJahr} unit="€/J." value={s.skJahr} onChange={v=>sF("skJahr",v)} tip={tip("skJahr")} placeholder={String(R.sk_auto)}/></Row>
      <Row><F label={t.sHkos} unit="€/kWh" value={s.epHeiz} onChange={v=>sF("epHeiz",v)} step="0.01" tip={tip("epHeiz")}/><F label={t.sHkJahr} unit="€/J." value={s.hkJahr} onChange={v=>sF("hkJahr",v)} tip={tip("hkJahr")} placeholder={String(R.kH_auto)}/></Row>
      <Sel label={t.sPreisstieg} value={s.preisstieg||"2"} onChange={v=>sF("preisstieg",v)} options={[{v:"0",l:t.sPS0},{v:"1",l:t.sPS1},{v:"2",l:t.sPS2},{v:"3",l:t.sPS3},{v:"5",l:t.sPS5}]}/>

      <Sec title={t.sStruktur} icon="📐"/>
      <Row><Sel label={t.sAnbau} value={s.anbau} onChange={v=>sF("anbau",v)} options={anbauO}/><Sel label={t.sDaForm} value={s.dachform} onChange={v=>sF("dachform",v)} options={dachO}/></Row>

      <Sec title={t.sMassnahmen} icon="🔧"/>
      {R.ALL.map(m=><div key={m.k} style={{marginBottom:8,border:act[m.k]?"2px solid var(--ca)":"1px solid var(--cb)",borderRadius:10,overflow:"visible",background:act[m.k]?"var(--cc)":"transparent",transition:"border .2s"}}>
        <div onClick={()=>tog(m.k)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>{m.em}</span>
            <div><div style={{fontSize:12,fontWeight:600}}>{m.n}</div>
              {act[m.k]&&<div style={{fontSize:10,color:"var(--ch)",marginTop:1}}>{m.det}</div>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontWeight:600,color:act[m.k]?"var(--ca)":"var(--ch)"}}>{fmtE(m.c)}</span>
            <div style={{width:18,height:18,borderRadius:5,background:act[m.k]?"var(--ca)":"var(--cb)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}>{act[m.k]&&<span style={{color:"#fff",fontSize:11}}>✓</span>}</div>
          </div>
        </div>
        {act[m.k]&&<div style={{padding:"0 12px 10px",borderTop:"1px solid var(--cb)"}}>
          {hasTier(m.k)&&<div style={{marginTop:8}}><TierSel value={tier[m.k]} onChange={v=>setT(m.k,v)} tiers={SAN_TIERS[m.k]}/></div>}

          {m.k==="fenster"&&<div style={{marginTop:4}}>
            <Row><F label={t.sFenStd} value={s.fA} onChange={v=>sF("fA",v)}/><F label={t.sFenXL} value={s.fXL} onChange={v=>sF("fXL",v)}/></Row>
            <F label={t.sFenHST} value={s.fHST} onChange={v=>sF("fHST",v)}/>
          </div>}
          {m.k==="fassade"&&<F label={t.sFasFl} unit="m²" value={s.faF} onChange={v=>sF("faF",v)} tip={tip("fasFl")}/>}
          {m.k==="dach"&&<F label={t.sDaFl} unit="m²" value={s.daF} onChange={v=>sF("daF",v)} tip={tip("daFl")}/>}
          {m.k==="pv"&&<F label={t.sLeist} unit="kWp" value={s.pvK} onChange={v=>sF("pvK",v)} step="0.5" tip={tip("pvLeistung")}/>}
          {m.k==="keller"&&<F label={t.sKeFl} unit="m²" value={s.keF} onChange={v=>sF("keF",v)} tip={tip("keFl")}/>}
          {m.k==="ogdecke"&&<F label={t.sOgFl} unit="m²" value={s.ogF} onChange={v=>sF("ogF",v)} tip={tip("ogdecke")}/>}
          {m.k==="batterie"&&<F label={t.sKap} unit="kWh" value={s.batK} onChange={v=>sF("batK",v)} tip={tip("batterie")}/>}

          <div style={{fontSize:10,color:"var(--ch)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
          <span>📚 {t[m.src]||m.src}</span>
          {m.capped&&<span style={{background:"#FFF8E6",color:"#8a6d10",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:600,border:"1px solid #F5E4A8"}}>⚠ Cap</span>}
        </div>
        </div>}
      </div>)}
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>

    <div className={`res-pane ${view==="result"?"act":""}`}>

      <div style={{background:"linear-gradient(135deg,var(--ca),var(--ca-dk))",borderRadius:14,padding:"18px 16px",color:"#fff",marginBottom:14}}>
        <div style={{fontSize:10,opacity:.8,textTransform:"uppercase"}}>{t.sGesK}</div>
        <div style={{fontSize:26,fontWeight:700,marginTop:4}}>{R.rows.length>0?fmtE(R.tK):"— €"}</div>
        {R.rows.length>0?<div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
          <div><div style={{fontSize:9,opacity:.6}}>BAFA/KfW</div><div style={{fontSize:14,fontWeight:600}}>–{fmtE(R.tFo)}</div></div>
          {R.tFoLand>0&&<div><div style={{fontSize:9,opacity:.8}}>🏦 Landesbonus*</div><div style={{fontSize:14,fontWeight:600,color:"#93c5fd"}}>–{fmtE(R.tFoLand)}</div></div>}
          <div><div style={{fontSize:9,opacity:.6}}>{t.sNetK}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.ne)}</div></div>
          <div><div style={{fontSize:9,opacity:.6}}>{t.amo}</div><div style={{fontSize:14,fontWeight:600}}>{R.amJ>30?"> 30 J.":`${R.amJ} J.`}</div></div>
        </div>:<div style={{fontSize:12,opacity:.75,marginTop:10}}>👈 {t.sMassnahmen}</div>}
      </div>

      {d.bundesland&&R.rows.length>0&&<div style={{padding:"8px 12px",background:"var(--ci)",borderRadius:8,fontSize:11,marginBottom:12,color:"var(--ch)",border:"1px solid var(--cb)"}}>
        🏛️ {t.foe} (BAFA/KfW) · {t.check}: <b style={{color:"var(--ct)"}}>{LAND_F[d.bundesland]||"BEG"}</b>
        {R.tFoLand>0&&<span style={{marginLeft:8,color:"#3b82f6"}}>+ ~{fmtE(R.tFoLand)} {LAND_F[d.bundesland]} Landesbonus*</span>}
      </div>}

      {R.gegReq.length>0&&<div style={{background:"#FFF8E6",borderRadius:10,padding:"12px",border:"1px solid #F5E4A8",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,color:"#8a6d10",marginBottom:6}}>⚖️ {t.mR} — GEG</div>
        {R.gegReq.map((g,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:4,fontSize:11}}>
          <span style={{flexShrink:0}}>{g.sev==="warn"?"⚠️":"ℹ️"}</span>
          <span style={{color:"#6b5a10"}}><b>{g.law}:</b> {g.text}</span>
        </div>)}
      </div>}

      {R.rows.length>0&&<>

      {R.rows.length>0&&<div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.sMassDet}</div>
        {R.rows.map((r,i)=><div key={i} style={{borderBottom:i<R.rows.length-1?"1px solid var(--cb)":"none",padding:"10px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:14}}>{r.em}</span>
              <div><div style={{fontSize:12,fontWeight:600}}>{r.n}</div><div style={{fontSize:10,color:"var(--ch)"}}>{r.det}</div></div>
            </div>
            <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:600}}>{fmtE(r.c)}</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:10,marginTop:4}}>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}>
              <div style={{color:"var(--ch)"}}>BAFA/KfW ({r.fq}%)</div>
              <div style={{color:"#22c55e",fontWeight:500}}>–{fmtE(r.f)}</div>
              {r.foLand>0&&<div style={{color:"#3b82f6",fontWeight:500,marginTop:1}}>+BL –{fmtE(r.foLand)} <span style={{fontWeight:400,opacity:.8}}>({r.fqL}%)*</span></div>}
            </div>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}><div style={{color:"var(--ch)"}}>{t.esp}</div><div style={{fontWeight:500}}>{fmtE(r.ek)}/J.</div></div>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}><div style={{color:"var(--ch)"}}>{t.co2}</div><div style={{fontWeight:500}}>–{fmt(r.co2)} kg/J.</div></div>
          </div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:4}}>📚 {t[r.src]||r.src} · {t.sNetK}: {fmtE(r.net)}</div>
        </div>)}
        <div style={{paddingTop:8,borderTop:"2px solid var(--ct)",display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600}}>
          <span>{t.sGesamt}</span>
          <span>
            {fmtE(R.tK)} – {fmtE(R.tFo)}{R.tFoLand>0&&<span style={{color:"#3b82f6"}}> –{fmtE(R.tFoLand)}</span>} = <span style={{color:"var(--ca)"}}>{fmtE(R.ne)}</span>
          </span>
        </div>
        {R.tFoLand>0&&<div style={{fontSize:9,color:"#3b82f6",marginTop:4,paddingTop:4,borderTop:"1px solid var(--cb)"}}>* Landesbonus ({LAND_F[d.bundesland]}) — {t.sanLandDis}</div>}
      </div>}

      <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:10}}>{t.eKl}</div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--ch)",marginBottom:4}}>{t.vor}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",background:EC_C[R.ecV],borderRadius:8,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>{EC_O[R.ecV]}</div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{fmt(R.hk)} kWh/m²a</div>
          </div>
          <div style={{fontSize:26,color:"var(--ca)",fontWeight:600,lineHeight:1}}>→</div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--ch)",marginBottom:4}}>{t.nac}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",background:EC_C[R.ecN],borderRadius:8,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>{EC_O[R.ecN]}</div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{fmt(Math.round(R.hk*R.eM))} kWh/m²a</div>
          </div>
        </div>
      </div>

      <div className="if-row" style={{marginBottom:14}}>
        <KPI label={t.sEnerEsp} value={`-${Math.round((1-R.eM)*100)}%`} sub={`${fmtE(R.kH)} → ${fmtE(Math.round(R.kH*R.eM/50)*50)}/J.`} accent/>
        <KPI label={t.sCO2R} value={`-${Math.round((1-R.cM)*100)}%`} sub={`${fmt(R.co2H)} → ${fmt(Math.round(R.co2H*R.cM))} kg/J.`}/>
        <KPI label={t.sJEsp} value={fmtE(R.totalEsp)} sub={R.pvStromEsp>0?`Heizung ${fmtE(R.espEuro)} + PV-Strom ${fmtE(R.pvStromEsp)}`:`bei ${fmt(R.epKwh,2)} €/kWh (${R.htIsStrom?t.str:t.sHTyp})`} accent/>
        <KPI label={t.sFqAvg} value={R.tK>0?fmtP(R.tFo/R.tK*100):"—"} sub={`${fmtE(R.tFo)} ${t.foe}`}/>
      </div>
      {d.sanIsfp&&<div style={{display:"flex",alignItems:"center",gap:6,background:"#dcfce7",border:"1px solid #86efac",borderRadius:8,padding:"6px 10px",marginBottom:10,fontSize:11}}>
        <span style={{fontSize:14}}>📋</span>
        <span style={{fontWeight:600,color:"#15803d"}}>{t.sanIsfpActive.split("—")[0].trim()}</span>
        <span style={{color:"#166534"}}>{"— "+(t.sanIsfpActive.split("—")[1]||"").trim()}</span>
      </div>}

      <div className="if-row" style={{marginBottom:14}}>
        <KPI label={t.sHkJahr} value={fmtE(R.kH)} sub={t.sAutoCalc} accent/>
        <KPI label={t.sSkJahr} value={fmtE(R.skJ)} sub={t.sAutoCalc}/>
      </div>

      <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600}}>{t.sAmoR}</span>
          {R.preisstieg>0&&<span style={{fontSize:9,color:"var(--ch)",background:"var(--ci)",padding:"2px 6px",borderRadius:4,border:"1px solid var(--cb)"}}>+{Math.round(R.preisstieg*100)}%/J. {t.sPreisstieg}</span>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:18,fontWeight:700,color:"var(--ct)"}}>{R.amJ>30?"> 30 J.":`${R.amJ} J.`}</span>
          <span style={{fontSize:11,color:"var(--ch)"}}>{t.sAmoSub}</span>
        </div>
        <div style={{height:6,borderRadius:3,background:"var(--cb)",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min(R.amJ/30*100,100)}%`,borderRadius:3,background:R.amJ<=10?"#22c55e":R.amJ<=20?"var(--ca)":"#f59e0b"}}/>
        </div>
        <div style={{fontSize:10,color:"var(--ch)",marginTop:6,lineHeight:1.6}}>
          {t.sNetK}: {fmtE(R.ne)} ÷ {t.sJEsp}: {fmtE(R.totalEsp)}/J.{R.pvStromEsp>0?` (Heizung ${fmtE(R.espEuro)} + PV ${fmtE(R.pvStromEsp)})`:""} = <b>{R.amJ>30?"> 30":R.amJ} J.</b>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>💡 {t.sBerat}</div>
        <Ins emoji="🔄" text={t.sanTip1} type="info"/>
        {d.sanIsfp
          ?<Ins emoji="✅" text={t.sanIsfpTip} type="good"/>
          :<Ins emoji="👨‍🔧" text={t.sanTip2} type="good"/>}
        <Ins emoji="📝" text={t.sanTip3} type="warn"/>
        {(+d.baujahr||1981)<1977&&<Ins emoji="⚠️" text={`${t.sBJ} ${d.baujahr||1981}: GEG § 47`} type="warn"/>}
        {d.sanHa==="alt"&&(d.sanHt==="heizoel"||d.sanHt==="gas"||d.sanHt==="kohle")&&<Ins emoji="🔥" text={t.sanTip4} type="bad"/>}
        <Ins emoji="💸" text={t.sanTip5} type="good"/>
        <Ins emoji="🌡️" text={t.sanTip6} type="info"/>
        {d.bundesland&&<Ins emoji="🏛️" text={`${t.foe}: ${LAND_F[d.bundesland]||"BEG"}`} type="info"/>}
        {act.pv&&act.batterie&&<Ins emoji="🔋" text={t.sanTip7} type="good"/>}
        {R.amJ>25&&R.rows.length>0&&<Ins emoji="🧮" text={`${t.amo}: ${R.amJ>30?">30":R.amJ} J.`} type="info"/>}
        {R.amJ>20&&R.rows.length>0&&<Ins emoji="🏦" text={t.adv16} type="info"/>}
        {R.ecN!==undefined&&R.ecN>3&&<Ins emoji="🇪🇺" text={t.adv17} type="warn"/>}
        {act&&act.heizung&&!act.fassade&&!act.dach&&<Ins emoji="🌡️" text={t.adv18} type="warn"/>}
      </div>
      <SaveBtn tab="sanier"/>
      <ExportPDF title={t.sanierFull||t.sanier}/>
        <Legal items={LEG.sanier}/>
      </>}
    </div>
  </div></div>;
}

// ═══ APP ═══
// ═══════════ STEUER §6 TRICK ═══════════
const STEUER_T={
de:{
  heading:"Steueroptimierung",subHeading:"§ 6 Abs. 1 Nr. 1a EStG",
  subtitle:"Rückwärtsrechnung: Welche Immobilie brauche ich, um meine Lohnsteuer auf null zu drücken?",
  inputSec:"Eingabe",
  lsLabel:"Jährliche Lohnsteuer",lsHint:"Aus Lohnsteuerbescheid oder Einkommensteuerbescheid",
  lsTip:"Den Jahresbetrag finden Sie:\n• In Ihrer Gehaltsabrechnung (Zeile »Lohnsteuer«)\n• Im Einkommensteuerbescheid des Finanzamts\n• In der elektronischen Lohnsteuerbescheinigung\n\nBei Ehegatten-Splitting die gemeinsame Steuerlast eintragen.",
  gstLabel:"Persönlicher Grenzsteuersatz",gstHint:"0–60 % · Im Steuerbescheid nachschlagen · Faustregel: ~42 % ab 66.761 € zvE, 45 % ab 277.826 € zvE",
  gstTip:"Der Grenzsteuersatz ist der Satz auf jeden zusätzlichen Euro — nicht der Durchschnittssatz!\n\nBeispiel: 45 % → jeder Euro Werbungskosten spart 45 Cent Steuer.\n\nFaustregel:\n• Ab ~66.761 € zvE → 42 %\n• Ab ~277.826 € zvE → 45 %\n• Solidaritätszuschlag → +5,5 % auf die ESt\n\nExakten Wert im Steuerbescheid nachschlagen.",
  grdLabel:"Geschätzter Grundstückswert",grdHint:"Nur Grund & Boden — kein AfA, kein §6-Sofortabzug möglich",
  grdTip:"Beim Kauf eines bebauten Grundstücks muss der Preis aufgeteilt werden. Nur der Gebäudeanteil kann nach §6 sofort abgezogen werden — der Grundstückswert nicht.\n\nWo finden:\n• Bodenrichtwert × Fläche (BORIS-Portal Ihres Bundeslandes)\n• Gutachterausschuss der Gemeinde\n• Notarielle Kaufpreisaufteilung\n\nIn Städten oft 10–30 % des Kaufpreises.",
  howTitle:"So funktioniert die Rechnung",
  step1:"① Lohnsteuer ÷ Grenzsteuersatz = benötigte Werbungskosten",
  step2:"② Werbungskosten ÷ 15 % = Mindest-Gebäudewert",
  step3:"③ Gebäudewert + Grundstückswert = Kaufpreis",
  howFooter:"Sanierungskosten müssen innerhalb von 3 Jahren nach Kaufvertrag anfallen und 15 % des Gebäudewerts nicht überschreiten (§ 6 Abs. 1 Nr. 1a EStG).",
  heroLabel:"Ziel: Lohnsteuer vollständig ausgleichen",heroSub:"Benötigte Sanierungskosten (= 15 % des Gebäudewerts)",
  propSec:"Benötigte Immobilie",minBuild:"Mindest-Gebäudewert",minBuildSub:"Sanierungskosten ÷ 15 %",
  landVal:"Grundstückswert",landValSub:"Kein Sofortabzug möglich",
  totalInv:"Gesamtinvestition",totalInvSub:"Mindest-Kaufpreis",
  bufTitle:"✅ Mit 3 % Sicherheitspuffer (empfohlen)",bufSub:"Sanierungskosten auf 97 % begrenzen — schützt vor der 15 %-Falle",
  bufSanL:"Sanierungskosten max.",bufSanS:"97 % des Limits",bufBuildL:"Empfohlener Gebäudewert",bufBuildS:"Sanierung ÷ 15 %",bufKpL:"Empfohlener Kaufpreis",bufKpS:"inkl. Grundstück",
  hinTitle:"⚠️ Wichtige Fallstricke",
  w1t:"Die 15 %-Falle",w2t:"Kein Geld gespart, nur umgeleitet",w3t:"3-Jahres-Frist ist hart",
  w3x:"Alle Rechnungen müssen innerhalb von 3 Jahren nach Kaufvertrag ausgestellt und bezahlt sein. Das Rechnungsdatum entscheidet.",
  w4t:"Nur bei Vermietung",w4x:"§ 6 Abs. 1 Nr. 1a EStG gilt ausschließlich bei vermieteten Objekten. Bei Eigennutzung entfällt der Sofortabzug vollständig.",
  w5t:"Mieteinnahmen schmälern den Effekt",w5x:"Mieteinnahmen im selben Jahr müssen versteuert werden und reduzieren den Netto-Steuervorteil im Jahr 1 leicht.",
  w6t:"Steuerberater ist Pflicht",w6x:"Diese Berechnung ist eine grobe Orientierung. Für die rechtssichere Umsetzung ist ein Steuerberater unverzichtbar.",
  emptyTitle:"Daten eingeben",emptyText:"Trage deine Lohnsteuer und den Grenzsteuersatz ein, um zu berechnen, welche Immobilie du brauchst.",
  disclaimer:"⚠️ Keine Steuerberatung. Alle Angaben ohne Gewähr. Steuerberater konsultieren."
},
en:{
  heading:"Tax Optimisation",subHeading:"§ 6 Para. 1 No. 1a EStG (German Tax Law)",
  subtitle:"Reverse calculation: What property do I need to reduce my income tax to zero?",
  inputSec:"Input",
  lsLabel:"Annual Income Tax",lsHint:"From your tax assessment notice or payslip",
  lsTip:"Find the annual amount:\n• On your payslip (line 'Lohnsteuer')\n• In your income tax assessment from the tax office\n• On your electronic wage tax certificate\n\nFor joint filing (Ehegatten-Splitting), enter the combined tax burden.",
  gstLabel:"Personal Marginal Tax Rate",gstHint:"0–60 % · Check your tax assessment · Rule: ~42 % from €66,761 taxable income",
  gstTip:"The marginal rate applies to each additional euro earned — not your average rate!\n\nExample: 45% marginal rate → every €1 of deductible expenses saves 45 cents in tax.\n\nGuidelines:\n• From ~€66,761 taxable income → 42%\n• From ~€277,826 taxable income → 45%\n• Solidarity surcharge → +5.5% on income tax\n\nFind the exact value in your tax assessment.",
  grdLabel:"Estimated Land Value",grdHint:"Land only — no depreciation, no §6 immediate deduction",
  grdTip:"When buying developed property, the price must be split between building and land. Only the building portion can be immediately deducted under §6.\n\nHow to find it:\n• Land reference value × plot area (BORIS portal)\n• Appraisal committee assessment\n• Notarial price allocation\n\nTypically 10–30% of purchase price in cities.",
  howTitle:"How the calculation works",
  step1:"① Income Tax ÷ Marginal Rate = Required deductible expenses",
  step2:"② Deductible expenses ÷ 15% = Minimum building value",
  step3:"③ Building value + Land value = Purchase price",
  howFooter:"All renovation costs must occur within 3 years of the purchase contract and must not exceed 15% of the building value (§ 6 Para. 1 No. 1a EStG).",
  heroLabel:"Goal: Fully offset income tax",heroSub:"Required renovation costs (= 15% of building value)",
  propSec:"Required Property",minBuild:"Minimum Building Value",minBuildSub:"Renovation costs ÷ 15%",
  landVal:"Land Value",landValSub:"No immediate deduction possible",
  totalInv:"Total Investment",totalInvSub:"Minimum Purchase Price",
  bufTitle:"✅ With 3% Safety Buffer (Recommended)",bufSub:"Cap renovation at 97% — protects against the 15% trap",
  bufSanL:"Max. Renovation Costs",bufSanS:"97% of limit",bufBuildL:"Recommended Building Value",bufBuildS:"Renovation ÷ 15%",bufKpL:"Recommended Purchase Price",bufKpS:"incl. land",
  hinTitle:"⚠️ Important Pitfalls",
  w1t:"The 15% Trap",w2t:"No money saved — just redirected",w3t:"3-year deadline is strict",
  w3x:"All invoices must be issued and paid within 3 years of the purchase contract. The invoice date is decisive.",
  w4t:"Rented properties only",w4x:"§ 6 Para. 1 No. 1a EStG applies exclusively to rented properties. No immediate deduction for owner-occupied use.",
  w5t:"Rental income reduces the effect",w5x:"Rental income in the same year must be taxed, slightly reducing the net tax benefit in year 1.",
  w6t:"Tax advisor is mandatory",w6x:"This calculation is a rough guide. A tax advisor is essential for legally sound implementation.",
  emptyTitle:"Enter your data",emptyText:"Enter your income tax and marginal rate to calculate what property you need.",
  disclaimer:"⚠️ Not tax advice. No warranty for accuracy. Consult a tax advisor."
},
tr:{
  heading:"Vergi Optimizasyonu",subHeading:"§ 6 Madde 1 No. 1a EStG (Alman Vergi Kanunu)",
  subtitle:"Geriye dönük hesaplama: Gelir vergimi sıfırlamak için hangi mülke ihtiyacım var?",
  inputSec:"Giriş",
  lsLabel:"Yıllık Gelir Vergisi",lsHint:"Vergi değerlendirme formunuzdan veya maaş bordronuzdan",
  lsTip:"Yıllık tutarı şuralarda bulabilirsiniz:\n• Maaş bordrosu ('Lohnsteuer' satırı)\n• Vergi dairesi gelir vergisi değerlendirmesi\n• Elektronik ücret vergisi sertifikası\n\nOrtak beyan (Ehegatten-Splitting) için toplam vergi yükünü girin.",
  gstLabel:"Kişisel Marjinal Vergi Oranı",gstHint:"0–60 % · Vergi tebliğinizde kontrol edin · Yaklaşık: 66.761 € üzeri ~42 %",
  gstTip:"Marjinal oran, her ek kazanılan euroya uygulanan orandır — ortalama oran değil!\n\nÖrnek: %45 marjinal oran → 1 € düşülebilir gider = 45 sent vergi tasarrufu.\n\nGenel kurallar:\n• ~66.761 € matrahtan → %42\n• ~277.826 € matrahtan → %45\n• Dayanışma zammı → Gelir vergisine +%5,5\n\nKesin değeri vergi değerlendirmenizde bulun.",
  grdLabel:"Tahmini Arsa Değeri",grdHint:"Yalnızca arsa — amortisman yok, §6 anında kesinti mümkün değil",
  grdTip:"İmarlı mülk satın alırken fiyat bina ve arsa olarak bölünmelidir. Yalnızca bina kısmı §6 kapsamında anında düşülebilir.\n\nNasıl bulunur:\n• Arazi referans değeri × parsel alanı (BORIS portalı)\n• Ekspertiz kurumu değerlendirmesi\n• Noterde fiyat paylaştırması\n\nŞehirlerde genellikle satış fiyatının %10-30'u.",
  howTitle:"Hesaplama nasıl çalışır",
  step1:"① Gelir Vergisi ÷ Marjinal Oran = Gerekli düşülebilir giderler",
  step2:"② Düşülebilir giderler ÷ %15 = Minimum bina değeri",
  step3:"③ Bina değeri + Arsa değeri = Satın alma fiyatı",
  howFooter:"Tüm tadilat maliyetleri satın alma sözleşmesinden itibaren 3 yıl içinde gerçekleşmeli ve bina değerinin %15'ini geçmemelidir.",
  heroLabel:"Hedef: Gelir vergisini tamamen sıfırla",heroSub:"Gerekli tadilat maliyetleri (= bina değerinin %15'i)",
  propSec:"Gerekli Mülk",minBuild:"Minimum Bina Değeri",minBuildSub:"Tadilat maliyetleri ÷ %15",
  landVal:"Arsa Değeri",landValSub:"Anında kesinti mümkün değil",
  totalInv:"Toplam Yatırım",totalInvSub:"Minimum Satın Alma Fiyatı",
  bufTitle:"✅ %3 Güvenlik Tamponu ile (Önerilen)",bufSub:"Tadilatı %97 ile sınırlayın — %15 tuzağına karşı koruma",
  bufSanL:"Maks. Tadilat Maliyetleri",bufSanS:"Limitin %97'si",bufBuildL:"Önerilen Bina Değeri",bufBuildS:"Tadilat ÷ %15",bufKpL:"Önerilen Satın Alma Fiyatı",bufKpS:"arsa dahil",
  hinTitle:"⚠️ Önemli Tuzaklar",
  w1t:"%15 Tuzağı",w2t:"Para tasarrufu yok — sadece yönlendirme",w3t:"3 yıllık son tarih kesindir",
  w3x:"Tüm faturalar satın alma sözleşmesinden itibaren 3 yıl içinde düzenlenmeli ve ödenmelidir. Fatura tarihi belirleyicidir.",
  w4t:"Yalnızca kiralık mülkler için",w4x:"§ 6 Madde 1 No. 1a EStG yalnızca kiralık mülklere uygulanır. Sahibi tarafından kullanım için anında kesinti yapılamaz.",
  w5t:"Kira geliri etkiyi azaltır",w5x:"Aynı yıldaki kira gelirleri vergilendirilmeli ve 1. yıldaki net vergi avantajını hafifçe azaltır.",
  w6t:"Vergi danışmanı zorunludur",w6x:"Bu hesaplama yaklaşık bir rehberdir. Yasal açıdan sağlam uygulama için bir vergi danışmanı gereklidir.",
  emptyTitle:"Verilerinizi girin",emptyText:"Hangi mülke ihtiyacınız olduğunu hesaplamak için gelir vergisi ve marjinal oranı girin.",
  disclaimer:"⚠️ Vergi tavsiyesi değildir. Doğruluk garantisi yoktur. Vergi danışmanına danışın."
},
zh:{
  heading:"税务优化",subHeading:"§ 6 第1款第1a项 EStG（德国税法）",
  subtitle:"逆向计算：我需要什么房产才能将所得税降为零？",
  inputSec:"输入",
  lsLabel:"年度所得税",lsHint:"来自税务评估通知或工资单",
  lsTip:"在以下地方找到年度金额：\n• 工资单（'Lohnsteuer'一行）\n• 税务局的所得税评估通知\n• 电子工资税证书\n\n夫妻合并申报时，请输入合并税负总额。",
  gstLabel:"个人边际税率",gstHint:"0–60 % · 查看税务通知书 · 参考：超66.761欧元约42%",
  gstTip:"边际税率是对每增加一欧元征税的税率——不是平均税率！\n\n示例：45%边际税率 → 每1欧元可扣除费用节省45美分税款。\n\n参考标准：\n• 应税收入约66,761欧元起 → 42%\n• 应税收入约277,826欧元起 → 45%\n• 团结附加税 → 所得税再加5.5%\n\n在税务评估通知中查找确切数值。",
  grdLabel:"估算土地价值",grdHint:"仅限土地 — 无折旧，无§6即时扣除",
  grdTip:"购买已建成房产时，价格必须在建筑物和土地之间分配。只有建筑物部分可根据§6立即扣除。\n\n如何确定：\n• 土地参考价值×地块面积（BORIS门户）\n• 评估委员会评估\n• 公证人价格分配\n\n城市地区通常占购买价格的10-30%。",
  howTitle:"计算原理",
  step1:"① 所得税 ÷ 边际税率 = 所需可扣除费用",
  step2:"② 可扣除费用 ÷ 15% = 最低建筑物价值",
  step3:"③ 建筑物价值 + 土地价值 = 购买价格",
  howFooter:"所有翻新费用必须在购买合同签订后3年内发生，且不得超过建筑物价值的15%（§6第1款第1a项EStG）。",
  heroLabel:"目标：完全抵消所得税",heroSub:"所需翻新费用（= 建筑物价值的15%）",
  propSec:"所需房产",minBuild:"最低建筑物价值",minBuildSub:"翻新费用 ÷ 15%",
  landVal:"土地价值",landValSub:"无即时扣除可能",
  totalInv:"总投资额",totalInvSub:"最低购买价格",
  bufTitle:"✅ 含3%安全缓冲（推荐）",bufSub:"将翻新费用控制在97% — 防止15%陷阱",
  bufSanL:"最高翻新费用",bufSanS:"限额的97%",bufBuildL:"推荐建筑物价值",bufBuildS:"翻新 ÷ 15%",bufKpL:"推荐购买价格",bufKpS:"含土地",
  hinTitle:"⚠️ 重要注意事项",
  w1t:"15%陷阱",w2t:"没有节省资金——只是重新分配",w3t:"3年期限严格执行",
  w3x:"所有发票必须在购买合同签订后3年内开具并付款。发票日期为准。",
  w4t:"仅适用于出租房产",w4x:"§6第1款第1a项EStG仅适用于出租房产。自住房产不可享受即时扣除。",
  w5t:"租金收入会降低效果",w5x:"同年的租金收入需要纳税，这会略微降低第1年的净税收优惠。",
  w6t:"税务顾问是必须的",w6x:"此计算仅为粗略参考。合法实施需要税务顾问的协助。",
  emptyTitle:"请输入数据",emptyText:"输入您的所得税和边际税率，计算您需要什么样的房产。",
  disclaimer:"⚠️ 非税务建议。不保证准确性。请咨询税务顾问。"
},
hi:{
  heading:"कर अनुकूलन",subHeading:"§ 6 धारा 1 सं. 1a EStG (जर्मन कर कानून)",
  subtitle:"पिछड़ी गणना: मेरे आयकर को शून्य करने के लिए मुझे किस संपत्ति की आवश्यकता है?",
  inputSec:"इनपुट",
  lsLabel:"वार्षिक आयकर",lsHint:"कर मूल्यांकन नोटिस या वेतन पर्ची से",
  lsTip:"वार्षिक राशि यहाँ पाएं:\n• वेतन पर्ची ('Lohnsteuer' पंक्ति)\n• कर कार्यालय का आयकर मूल्यांकन\n• इलेक्ट्रॉनिक वेतन कर प्रमाणपत्र\n\nसंयुक्त दाखिल के लिए संयुक्त कर बोझ दर्ज करें।",
  gstLabel:"व्यक्तिगत सीमांत कर दर",gstHint:"0–60 % · कर निर्धारण देखें · अनुमान: 66.761€ से ऊपर ~42%",
  gstTip:"सीमांत दर प्रत्येक अतिरिक्त यूरो पर लागू होती है — औसत दर नहीं!\n\nउदाहरण: 45% सीमांत दर → 1€ कटौती = 45 सेंट कर बचत।\n\nमार्गदर्शिका:\n• ~€66,761 से → 42%\n• ~€277,826 से → 45%\n• एकजुटता अधिभार → आयकर पर +5.5%\n\nसटीक मूल्य कर मूल्यांकन में है।",
  grdLabel:"अनुमानित भूमि मूल्य",grdHint:"केवल भूमि — कोई मूल्यह्रास नहीं, §6 तत्काल कटौती संभव नहीं",
  grdTip:"विकसित संपत्ति खरीदते समय मूल्य भवन और भूमि में विभाजित करना होगा। केवल भवन भाग §6 के तहत तत्काल कटौती योग्य है।\n\nकैसे पाएं:\n• भूमि संदर्भ मूल्य × क्षेत्र (BORIS पोर्टल)\n• मूल्यांकन समिति\n• नोटरी मूल्य आवंटन\n\nशहरों में आमतौर पर खरीद मूल्य का 10-30%।",
  howTitle:"गणना कैसे काम करती है",
  step1:"① आयकर ÷ सीमांत दर = आवश्यक कटौती योग्य व्यय",
  step2:"② कटौती योग्य व्यय ÷ 15% = न्यूनतम भवन मूल्य",
  step3:"③ भवन मूल्य + भूमि मूल्य = खरीद मूल्य",
  howFooter:"सभी नवीनीकरण लागत खरीद अनुबंध के 3 वर्षों के भीतर होनी चाहिए और भवन मूल्य के 15% से अधिक नहीं होनी चाहिए।",
  heroLabel:"लक्ष्य: आयकर को पूरी तरह ऑफसेट करें",heroSub:"आवश्यक नवीनीकरण लागत (= भवन मूल्य का 15%)",
  propSec:"आवश्यक संपत्ति",minBuild:"न्यूनतम भवन मूल्य",minBuildSub:"नवीनीकरण लागत ÷ 15%",
  landVal:"भूमि मूल्य",landValSub:"तत्काल कटौती संभव नहीं",
  totalInv:"कुल निवेश",totalInvSub:"न्यूनतम खरीद मूल्य",
  bufTitle:"✅ 3% सुरक्षा बफर के साथ (अनुशंसित)",bufSub:"नवीनीकरण को 97% तक सीमित करें — 15% जाल से सुरक्षा",
  bufSanL:"अधिकतम नवीनीकरण लागत",bufSanS:"सीमा का 97%",bufBuildL:"अनुशंसित भवन मूल्य",bufBuildS:"नवीनीकरण ÷ 15%",bufKpL:"अनुशंसित खरीद मूल्य",bufKpS:"भूमि सहित",
  hinTitle:"⚠️ महत्वपूर्ण जोखिम",
  w1t:"15% जाल",w2t:"कोई बचत नहीं — केवल पुनर्निर्देशन",w3t:"3 साल की समय सीमा सख्त है",
  w3x:"सभी चालान खरीद अनुबंध के 3 वर्षों के भीतर जारी और भुगतान किए जाने चाहिए। चालान तिथि निर्णायक है।",
  w4t:"केवल किराए की संपत्ति के लिए",w4x:"§6 केवल किराए की संपत्तियों पर लागू होता है। स्वयं-उपयोग के लिए कोई तत्काल कटौती नहीं।",
  w5t:"किराये की आय प्रभाव को कम करती है",w5x:"उसी वर्ष की किराये की आय पर कर लगाया जाना चाहिए, जो वर्ष 1 में शुद्ध कर लाभ को थोड़ा कम करता है।",
  w6t:"कर सलाहकार अनिवार्य है",w6x:"यह गणना एक मोटा मार्गदर्शन है। कानूनी कार्यान्वयन के लिए कर सलाहकार अनिवार्य है।",
  emptyTitle:"डेटा दर्ज करें",emptyText:"आपको किस संपत्ति की आवश्यकता है यह जानने के लिए आयकर और सीमांत दर दर्ज करें।",
  disclaimer:"⚠️ कर सलाह नहीं। सटीकता की कोई गारंटी नहीं। कर सलाहकार से परामर्श करें।"
}
};

function InfoTooltip({text}){
  const[open,setOpen]=useState(false);
  const[mPos,setMPos]=useState({top:0,left:0,width:268});
  const wrap=useRef(null);
  const btn=useRef(null);
  const isTch=useRef(typeof window!=="undefined"&&window.matchMedia("(pointer:coarse)").matches);
  useEffect(()=>{
    if(!open)return;
    const h=e=>{if(wrap.current&&!wrap.current.contains(e.target))setOpen(false);};
    const t=setTimeout(()=>document.addEventListener("pointerdown",h),50);
    return()=>{clearTimeout(t);document.removeEventListener("pointerdown",h);};
  },[open]);
  const toggle=()=>{
    if(!open&&isTch.current&&btn.current){
      const r=btn.current.getBoundingClientRect();
      const w=Math.min(268,window.innerWidth-16);
      setMPos({top:r.bottom+8,left:Math.max(8,Math.min(r.left-w/2+8,window.innerWidth-w-8)),width:w});
    }
    setOpen(o=>!o);
  };
  return(
    <span ref={wrap} style={{position:"relative",display:"inline-flex",verticalAlign:"middle",marginLeft:6}}>
      <button ref={btn} type="button"
        onClick={toggle}
        onMouseEnter={!isTch.current?()=>setOpen(true):undefined}
        onMouseLeave={!isTch.current?()=>setOpen(false):undefined}
        style={{width:16,height:16,borderRadius:"50%",border:"1.5px solid",borderColor:open?"var(--ca)":"var(--ch)",background:open?"var(--ca-bg)":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,fontSize:9,fontWeight:800,color:open?"var(--ca)":"var(--ch)",fontFamily:"Georgia,serif",flexShrink:0,lineHeight:1,userSelect:"none"}}
      >?</button>
      {open&&<div style={{
        ...(isTch.current
          ?{position:"fixed",top:mPos.top,left:mPos.left,width:mPos.width,pointerEvents:"auto"}
          :{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",width:260,pointerEvents:"none"}
        ),
        background:"#1E3A5F",color:"#fff",fontSize:11,lineHeight:1.65,padding:"10px 13px",borderRadius:8,
        boxShadow:"0 6px 28px rgba(0,0,0,.25)",zIndex:500,whiteSpace:"pre-line"
      }}>
        {text}
        <div style={{position:"absolute",...(isTch.current?{top:-5,left:16}:{bottom:-5,left:"50%",marginLeft:-5}),width:10,height:10,background:"#1E3A5F",transform:"rotate(45deg)"}}/>
      </div>}
    </span>
  );
}

function SteuerTrick(){
  const{lang}=useContext(Ctx);
  const st=STEUER_T[lang]||STEUER_T.de;
  const[ls,setLs]=useState("50000");
  const[gst,setGst]=useState("42");
  const[grd,setGrd]=useState("100000");
  const lohnsteuer=parseFloat(ls)||0;
  const grenzSatz=parseFloat(String(gst).replace(",","."))||0;
  const grundstueck=parseFloat(grd)||0;
  const valid=lohnsteuer>0&&grenzSatz>0&&grenzSatz<100;
  const sanK=valid?lohnsteuer/(grenzSatz/100):0;
  const gebW=valid?sanK/0.15:0;
  const gesKP=valid?gebW+grundstueck:0;
  const sanKS=sanK*0.97;
  const gebWS=sanKS/0.15;
  const gesKPS=gebWS+grundstueck;
  const grenze15=gebW*0.15;
  const fmt=v=>v.toLocaleString("de-DE",{maximumFractionDigits:0});
  const fE=v=>"€ "+fmt(v);
  const inp={width:"100%",height:42,padding:"0 36px 0 12px",border:"1.5px solid var(--cb)",borderRadius:8,fontSize:16,background:"var(--ci)",color:"var(--ct)",outline:"none"};
  const lbl={fontSize:13,fontWeight:600,color:"var(--cl)",display:"flex",alignItems:"center",marginBottom:6};
  const hint={fontSize:11,color:"var(--ch)",marginTop:4};
  const card={background:"var(--cc)",borderRadius:12,border:"1px solid var(--cb)",padding:"18px 16px",marginBottom:14};
  const secLbl={fontSize:12,fontWeight:700,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.8,marginBottom:14};
  return <div>
    <div style={{marginBottom:18}}>
      <div style={{fontSize:12,color:"var(--ca)",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{st.heading}</div>
      <div style={{fontSize:22,fontWeight:800,color:"var(--ct)",lineHeight:1.2}}>{st.subHeading}</div>
      <div style={{fontSize:13,color:"var(--cl)",marginTop:4}}>{st.subtitle}</div>
    </div>
    <div className="split">
      <div className="inp-pane act">
        <div style={card}>
          <div style={secLbl}>{st.inputSec}</div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>{st.lsLabel}<InfoTooltip text={st.lsTip}/></label>
            <div style={{position:"relative"}}>
              <input type="number" value={ls} onChange={e=>setLs(e.target.value)} style={inp}/>
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ch)"}}>€</span>
            </div>
            <div style={hint}>{st.lsHint}</div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>{st.gstLabel}<InfoTooltip text={st.gstTip}/></label>
            <div style={{position:"relative"}}>
              <input type="number" value={gst} onChange={e=>setGst(e.target.value)} min="0" max="60" step="0.01" style={inp}/>
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ch)"}}>%</span>
            </div>
            <div style={hint}>{st.gstHint}</div>
          </div>
          <div>
            <label style={lbl}>{st.grdLabel}<InfoTooltip text={st.grdTip}/></label>
            <div style={{position:"relative"}}>
              <input type="number" value={grd} onChange={e=>setGrd(e.target.value)} style={inp}/>
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ch)"}}>€</span>
            </div>
            <div style={hint}>{st.grdHint}</div>
          </div>
        </div>
        <div style={{...card,background:"var(--ca-bg)",border:"1px solid var(--ca-bd)"}}>
          <div style={{...secLbl,color:"var(--ca)"}}>{st.howTitle}</div>
          {[st.step1,st.step2,st.step3].map((s,i)=><div key={i} style={{fontSize:12,color:"var(--cl)",background:"rgba(232,96,10,.08)",borderRadius:6,padding:"7px 10px",marginBottom:i<2?8:0,lineHeight:1.5}}>{s}</div>)}
          <div style={{fontSize:11,color:"var(--ch)",marginTop:10,lineHeight:1.5}}>{st.howFooter}</div>
        </div>
      </div>
      <div className="res-pane act">
        {valid?<>
          <div style={{background:"linear-gradient(135deg,#1E3A5F 0%,#163050 100%)",borderRadius:12,padding:"20px 18px",marginBottom:14,color:"#fff"}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",opacity:.7,marginBottom:6}}>{st.heroLabel}</div>
            <div style={{fontSize:13,opacity:.8,marginBottom:4}}>{st.heroSub}</div>
            <div style={{fontSize:38,fontWeight:800,letterSpacing:-1,color:"var(--ca)",lineHeight:1}}>{fE(sanK)}</div>
            <div style={{marginTop:10,fontSize:12,opacity:.65}}>{fmt(lohnsteuer)} € ÷ {String(gst).replace(".",",")} %</div>
          </div>
          <div style={card}>
            <div style={secLbl}>{st.propSec}</div>
            {[{l:st.minBuild,sub:st.minBuildSub,v:fE(gebW)},{l:st.landVal,sub:st.landValSub,v:fE(grundstueck)}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"var(--ci)",borderRadius:8,marginBottom:8}}>
              <div><div style={{fontSize:13,fontWeight:600,color:"var(--ct)"}}>{r.l}</div><div style={{fontSize:11,color:"var(--ch)"}}>{r.sub}</div></div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--ct)"}}>{r.v}</div>
            </div>)}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"var(--ca)",borderRadius:8}}>
              <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{st.totalInv}</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{st.totalInvSub}</div></div>
              <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{fE(gesKP)}</div>
            </div>
          </div>
          <div style={{...card,border:"2px solid #2d8a4e"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#2d8a4e",textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>{st.bufTitle}</div>
            <div style={{fontSize:12,color:"var(--ch)",marginBottom:12}}>{st.bufSub}</div>
            {[{l:st.bufSanL,sub:st.bufSanS,v:fE(sanKS)},{l:st.bufBuildL,sub:st.bufBuildS,v:fE(gebWS)},{l:st.bufKpL,sub:st.bufKpS,v:fE(gesKPS),green:true}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:r.green?"rgba(45,138,78,.1)":"var(--ci)",borderRadius:8,border:r.green?"1px solid rgba(45,138,78,.3)":"none",marginBottom:i<2?8:0}}>
              <div><div style={{fontSize:13,fontWeight:r.green?700:600,color:"var(--ct)"}}>{r.l}</div><div style={{fontSize:11,color:"var(--ch)"}}>{r.sub}</div></div>
              <div style={{fontSize:r.green?18:15,fontWeight:700,color:r.green?"#2d8a4e":"var(--ct)"}}>{r.v}</div>
            </div>)}
          </div>
          <div style={card}>
            <div style={secLbl}>{st.hinTitle}</div>
            {[
              {icon:"🪤",t:st.w1t,x:`${st.w1t}: Die Grenze beträgt exakt ${fE(grenze15)} (15 % von ${fE(gebW)}). Wird sie um 1 € überschritten, entfällt der Sofortabzug komplett — Abschreibung über 50 Jahre.`},
              {icon:"🔄",t:st.w2t,x:`Statt ${fE(lohnsteuer)} ans Finanzamt fließen ${fE(sanK)} an Handwerker. Kurzfristig mehr Liquiditätsbedarf — das Geld steckt als Substanz im Objekt.`},
              {icon:"📅",t:st.w3t,x:st.w3x},
              {icon:"🏠",t:st.w4t,x:st.w4x},
              {icon:"💶",t:st.w5t,x:st.w5x},
              {icon:"👨‍💼",t:st.w6t,x:st.w6x},
            ].map((w,i)=><div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderTop:i>0?"1px solid var(--cb)":"none"}}>
              <div style={{fontSize:18,flexShrink:0,lineHeight:1.4}}>{w.icon}</div>
              <div><div style={{fontSize:13,fontWeight:700,color:"var(--ct)",marginBottom:3}}>{w.t}</div><div style={{fontSize:12,color:"var(--cl)",lineHeight:1.55}}>{w.x}</div></div>
            </div>)}
          </div>
          <div style={{fontSize:11,color:"var(--ch)",textAlign:"center",padding:"4px 16px 8px",lineHeight:1.5}}>{st.disclaimer}</div>
          <ExportPDF title={(T[lang]||T.de).steuer6Full||(T[lang]||T.de).steuer6}/>
        </>:<div style={{...card,textAlign:"center",padding:32}}>
          <div style={{fontSize:32,marginBottom:8}}>🦊</div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--ct)",marginBottom:4}}>{st.emptyTitle}</div>
          <div style={{fontSize:13,color:"var(--ch)"}}>{st.emptyText}</div>
        </div>}
      </div>
    </div>
  </div>;
}



const IC={
  haupt:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  kredit:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  miete:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  sanier:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
steuer6:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
    vfe:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  saved:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
};


// ═══════════ VORFÄLLIGKEITSRECHNER — i18n ═══════════
const VFE_T={
  de:{secEck:"Eckdaten des Darlehens",secKuend:"Kündigung & Marktdaten",lAuszahlung:"Auszahlungsdatum",lZbEnde:"Ende Sollzinsbindung",lRestschuld:"Aktuelle Restschuld",lRestschuldDatum:"Datum der Restschuld",lNominalzins:"Nominalzins p.a.",lRate:"Monatliche Rate",lKuendigung:"Geplanter Kündigungstermin",lSonderJ:"Jährl. Sondertilgung",lSonderGeleistet:"Sondertilgung dies. Jahr geleistet?",lWiederanlage:"Wiederanlagezins (Pfandbrief) p.a.",lBearbeitung:"Bearbeitungsentgelt der Bank",hintFin:"↩ Finanzierungsrechner",hintCalc:"↩ berechnet",hintPfand:"Die Bank darf nur den Zins ansetzen, den sie mit dem zurückgezahlten Geld tatsächlich woanders verdienen könnte — das ist die Pfandbriefrendite. Aktuelle Werte: bundesbank.de oder fmh.de",yes:"Ja",no:"Nein",toResult:"Ergebnis →",emptyTitle:"Wie teuer wird der vorzeitige Ausstieg?",emptyMin:"Die Bank berechnet dir eine Strafe, wenn du deinen Kredit vor Ende der Zinsbindung zurückzahlst — diese heißt Vorfälligkeitsentschädigung (VFE). Wie hoch sie ausfällt, hängt davon ab, wie lange dein Zins noch läuft und wie viel die Bank heute bei einer Neuanlage verdienen würde. Füll einfach die Felder links aus — Beispielwerte sind bereits eingetragen.",freeTitle:"✅ Kostenlose Kündigung möglich (§ 489 BGB)",freeBodyA:"Gute Neuigkeit: Ab dem {date} kannst du diesen Kredit kostenlos kündigen — die Bank darf dann keine VFE mehr verlangen.",freeBodyB:"Das Gesetz (§ 489 BGB) gibt jedem Kreditnehmer das Recht, 10 Jahre nach Auszahlung mit 6 Monaten Frist kostenfrei zu kündigen — egal wie lang die ursprüngliche Zinsbindung war.",resOverview:"Ergebnisübersicht",rZins:"Zinsverschlechterungsschaden",rRisiko:"Risikoersparnis (0,1 %-Punkte p.a.)",rVerw:"Verwaltungskostenersparnis (4 €/Buchung)",rBearb:"Bearbeitungsentgelt Bank",rNetto:"Netto-Vorfälligkeitsentschädigung",negNote:"ℹ️ Interessant: Rechnerisch ist deine VFE negativ — das heißt, die Bank würde mit deiner vorzeitigen Rückzahlung sogar Geld verdienen, weil sie das Kapital heute zu {wa}% anlegen kann, statt dir nur {zp}% zu geben. Leider bedeutet das nicht, dass die Bank dir Geld zurückzahlt. Ein entsprechendes BGH-Urteil gibt es bisher nicht.",explainPosTitle:"💸 Was bedeutet das für dich?",explainPos:"Kurz gesagt: Wenn du deinen Kredit jetzt vorzeitig ablöst, musst du diesen Betrag an deine Bank zahlen. Er heißt Vorfälligkeitsentschädigung — also eine Gebühr dafür, dass du früher aus dem Vertrag aussteigst als vereinbart.\n\nWarum verlangt die Bank das? Sie hatte mit deinen Zinszahlungen bis zum Ende der Zinsbindung fest kalkuliert. Durch die vorzeitige Rückzahlung fallen diese Einnahmen weg — und genau diesen Verlust lässt sie sich ersetzen.\n\nOb sich eine Umschuldung trotz VFE rechnet, hängt von deinem neuen Zinssatz ab. Wenn der aktuelle Marktzins deutlich günstiger ist als dein Vertragszins, kann es sich dennoch lohnen.",explainNegTitle:"🤔 Was bedeutet das für dich?",explainNeg:"Das Ergebnis ist negativ — klingt erstmal gut, ist aber kein Grund zur Freude.\n\nWas steckt dahinter? Die Bank könnte das zurückgezahlte Geld heute zu einem höheren Zins anlegen, als du ihr schuldest. Rechnerisch entsteht ihr also gar kein Schaden — im Gegenteil, sie würde davon profitieren.\n\nTrotzdem bedeutet das nicht, dass die Bank dir etwas erstattet. Es gibt bisher kein BGH-Urteil, das eine Rückzahlung vorschreibt. Sprich das direkt mit deiner Bank an und bestehe auf der detaillierten Berechnung.",planTitle:"📊 Tilgungsplan ab Kündigung",planOpen:"▼ öffnen",planClose:"▲ schließen",planMonths:"Monate",thJahr:"Jahr",thRest:"Restschuld",thTilg:"Tilgung",thZinsOrig:"Zinsen orig.",thZinsWA:"Zinsen WA",thZinsverlust:"Zinsverlust",thAbgezinst:"Abgezinst",sum:"Summe",disclaimer:"⚖️ Dieser Rechner arbeitet nach der vom BGH vorgeschriebenen Aktiv-Passiv-Methode (AZ: XI ZR 285/03) mit Pfandbriefsätzen — genau wie die meisten Banken. Das Ergebnis ist eine belastbare Orientierung, aber keine Rechtsberatung. Die endgültige Berechnung kommt von deiner Bank. Bei Abweichungen lohnt es sich, die Bank nach ihrer detaillierten Aufstellung zu fragen.",phRestschuld:"z.B. 350000",cap489:"§ 489 BGB begrenzt den Schaden: Ab dem {date} hättest du kostenlos kündigen können (10 Jahre + 6 Monate nach Auszahlung). Die Bank darf deshalb nur den Schaden bis zu diesem Datum berechnen — alles danach wird nicht berücksichtigt. Das drückt die VFE in deinem Fall deutlich.",tipAuszahlung:"Datum, an dem das Darlehen vollständig ausgezahlt wurde. Maßgeblich für die §489-Frist (10 Jahre + 6 Monate Karenzzeit).",tipZbEnde:"Ende der vereinbarten Sollzinsbindung. Bis zu diesem Datum entsteht der Bank ein Zinsschaden bei vorzeitiger Ablösung.",tipRestschuld:"Aktueller Darlehenssaldo laut Bank zum unten angegebenen Stichtag.",tipRestschuldDatum:"Stichtag, auf den sich die eingegebene Restschuld bezieht. Von hier wird bis zum Kündigungstermin fortgerechnet.",tipNominalzins:"Vertraglicher Sollzins p.a. (nicht Effektivzins). Wird automatisch aus dem Finanzierungsrechner übernommen, falls dort gesetzt.",tipRate:"Aktuelle monatliche Annuität (Zins + Tilgung). Wird aus dem Finanzierungsrechner geschätzt, falls leer.",tipKuendigung:"Geplanter Termin der vorzeitigen Ablösung. Muss nach dem Restschuld-Stichtag und vor dem Zinsbindungsende liegen.",tipSonderJ:"Vertraglich vereinbarte jährliche Sondertilgung (§ 500 BGB). Reduziert die Restschuld und damit den Zinsschaden. 0 = keine.",tipSonderGeleistet:"Wurde die diesjährige Sondertilgung bereits geleistet? Ja = nächste Sondertilgung erst im Folgejahr. Nein = sie wird für das laufende Jahr berücksichtigt. Nur relevant, wenn eine jährliche Sondertilgung > 0 € eingetragen ist.",tipWiederanlage:"Pfandbriefrendite, zu der die Bank das zurückgezahlte Kapital wiederanlegen kann. Differenz zum Vertragszins = Zinsschaden. Quelle: bundesbank.de / fmh.de.",tipBearbeitung:"Pauschale der Bank für die Bearbeitung der vorzeitigen Ablösung. Üblich 150–300 €."},
  en:{secEck:"Loan key data",secKuend:"Cancellation & market data",lAuszahlung:"Disbursement date",lZbEnde:"End of fixed-rate period",lRestschuld:"Current remaining debt",lRestschuldDatum:"Date of remaining debt",lNominalzins:"Nominal rate p.a.",lRate:"Monthly payment",lKuendigung:"Planned cancellation date",lSonderJ:"Annual extra repayment",lSonderGeleistet:"Extra repayment made this year?",lWiederanlage:"Reinvestment rate (Pfandbrief) p.a.",lBearbeitung:"Bank processing fee",hintFin:"↩ Loan calculator",hintCalc:"↩ calculated",hintPfand:"Current Pfandbrief yields: bundesbank.de or fmh.de",yes:"Yes",no:"No",toResult:"Result →",emptyTitle:"Fill in the fields to calculate the penalty",emptyMin:"At least: disbursement date, end of fixed-rate period, remaining debt, cancellation date, reinvestment rate",freeTitle:"✅ Free cancellation possible (§ 489 BGB)",freeBodyA:"Under § 489 BGB this loan can be cancelled free of charge from {date}.",freeBodyB:"(10 years + 6 months grace period after disbursement)",resOverview:"Result overview",rZins:"Interest deterioration loss",rRisiko:"Risk saving (0.1 pp p.a.)",rVerw:"Administration saving (€4/booking)",rBearb:"Bank processing fee",rNetto:"Net prepayment penalty",negNote:"ℹ️ Negative penalty: the bank profits from early repayment (current reinvestment rate {wa}% > contract rate {zp}%). Banks are nevertheless not obliged to refund (no corresponding BGH ruling).",explainPosTitle:"💸 What does this mean for you?",explainPos:"In short: if you repay your loan early, you must pay this amount to your bank — the prepayment penalty. It is a fee for exiting the contract before the agreed end date.\n\nWhy does the bank charge this? It had counted on receiving your interest payments until the end of the fixed-rate period. Early repayment cuts off those earnings — and the bank passes that loss on to you.\n\nWhether refinancing makes sense despite the penalty depends on your new interest rate. If current rates are significantly lower than your contract rate, it may still be worth it.",explainNegTitle:"🤔 What does this mean for you?",explainNeg:"The result is negative — sounds good at first, but unfortunately it does not mean the bank owes you money.\n\nWhat is going on? The bank could reinvest the repaid capital at a higher rate than you are paying. Mathematically, early repayment actually benefits the bank — it suffers no loss.\n\nThere is currently no BGH ruling requiring the bank to refund anything in this situation. You can still repay early without the bank demanding a penalty — but raise this directly with your bank and ask for their detailed calculation.",planTitle:"📊 Amortization plan from cancellation",planOpen:"▼ open",planClose:"▲ close",planMonths:"months",thJahr:"Year",thRest:"Remaining debt",thTilg:"Repayment",thZinsOrig:"Interest orig.",thZinsWA:"Interest reinv.",thZinsverlust:"Interest loss",thAbgezinst:"Discounted",sum:"Total",disclaimer:"⚖️ Calculation per BGH ruling AZ: XI ZR 285/03 (asset-liability method, Pfandbrief rates). Guidance calculator – does not replace the bank's calculation. No legal advice.",phRestschuld:"e.g. 350000",cap489:"§ 489 BGB: loss calculated only until {date} — from that day free cancellation would be possible (10 years + 6 months grace period after disbursement). The period beyond this date is not counted.",tipAuszahlung:"Date the loan was fully disbursed. Decisive for the § 489 deadline (10 years + 6 months grace period).",tipZbEnde:"End of the agreed fixed-rate period. The bank incurs an interest loss on early repayment up to this date.",tipRestschuld:"Current loan balance per the bank as of the reference date below.",tipRestschuldDatum:"Reference date the entered remaining debt refers to. Calculation runs from here to the cancellation date.",tipNominalzins:"Contractual nominal rate p.a. (not effective rate). Taken automatically from the loan calculator if set there.",tipRate:"Current monthly annuity (interest + repayment). Estimated from the loan calculator if left empty.",tipKuendigung:"Planned date of early repayment. Must be after the remaining-debt reference date and before the end of the fixed-rate period.",tipSonderJ:"Contractually agreed annual extra repayment (§ 500 BGB). Reduces the remaining debt and thus the interest loss. 0 = none.",tipSonderGeleistet:"Has this year's extra repayment already been made? Yes = next extra repayment only next year. No = it is counted for the current year. Only relevant if an annual extra repayment > €0 is entered.",tipWiederanlage:"Pfandbrief yield at which the bank can reinvest the repaid capital. Difference to the contract rate = interest loss. Source: bundesbank.de / fmh.de.",tipBearbeitung:"Bank's flat fee for processing the early repayment. Typically €150–300."},
  tr:{secEck:"Kredinin temel verileri",secKuend:"Fesih & piyasa verileri",lAuszahlung:"Ödeme tarihi",lZbEnde:"Sabit faiz dönemi sonu",lRestschuld:"Güncel kalan borç",lRestschuldDatum:"Kalan borç tarihi",lNominalzins:"Nominal faiz y.b.",lRate:"Aylık taksit",lKuendigung:"Planlanan fesih tarihi",lSonderJ:"Yıllık ek ödeme",lSonderGeleistet:"Bu yıl ek ödeme yapıldı mı?",lWiederanlage:"Yeniden yatırım faizi (Pfandbrief) y.b.",lBearbeitung:"Banka işlem ücreti",hintFin:"↩ Kredi hesaplayıcı",hintCalc:"↩ hesaplandı",hintPfand:"Güncel Pfandbrief getirileri: bundesbank.de veya fmh.de",yes:"Evet",no:"Hayır",toResult:"Sonuç →",emptyTitle:"Cezayı hesaplamak için alanları doldurun",emptyMin:"En az: ödeme tarihi, sabit faiz dönemi sonu, kalan borç, fesih tarihi, yeniden yatırım faizi",freeTitle:"✅ Ücretsiz fesih mümkün (§ 489 BGB)",freeBodyA:"§ 489 BGB uyarınca bu kredi {date} tarihinden itibaren ücretsiz feshedilebilir.",freeBodyB:"(Ödemeden sonra 10 yıl + 6 ay bekleme süresi)",resOverview:"Sonuç özeti",rZins:"Faiz kötüleşme zararı",rRisiko:"Risk tasarrufu (0,1 puan y.b.)",rVerw:"İdari tasarruf (4 €/işlem)",rBearb:"Banka işlem ücreti",rNetto:"Net erken ödeme cezası",negNote:"ℹ️ Negatif ceza: Banka erken geri ödemeden kâr eder (güncel yeniden yatırım faizi {wa}% > sözleşme faizi {zp}%). Yine de bankalar iadeyle yükümlü değildir (ilgili BGH kararı yok).",explainPosTitle:"💸 Bu sizin için ne anlama geliyor?",explainPos:"Kısaca: Kredinizi erken kapatırsanız bu tutarı bankanıza ödemek zorundasınız — erken ödeme cezasıdır.\n\nBanka bunu neden ister? Sabit faiz döneminin sonuna kadar faiz geliri almayı planlamıştı. Erken ödeyince bu gelir kaybolur ve banka bu kaybı sizden tahsil eder.\n\nYeni faiz oranınız sözleşme faizinizden belirgin şekilde düşükse, cezaya rağmen refinansman mantıklı olabilir.",explainNegTitle:"🤔 Bu sizin için ne anlama geliyor?",explainNeg:"Sonuç negatif — kulağa iyi geliyor ama maalesef bankanın size para ödeyeceği anlamına gelmiyor.\n\nNeden? Banka, geri ödenen parayı bugün daha yüksek faizle yatırıma dönüştürebilir. Erken ödeme bankaya zarar vermez, hatta kâr sağlar.\n\nBuna rağmen bankayı geri ödemeye zorlayan bir BGH kararı mevcut değil. Bankadan ayrıntılı hesap dökümü talep etmeniz önerilir.",planTitle:"📊 Fesihten itibaren itfa planı",planOpen:"▼ aç",planClose:"▲ kapat",planMonths:"ay",thJahr:"Yıl",thRest:"Kalan borç",thTilg:"İtfa",thZinsOrig:"Faiz orij.",thZinsWA:"Faiz yen.yat.",thZinsverlust:"Faiz kaybı",thAbgezinst:"İskontolu",sum:"Toplam",disclaimer:"⚖️ Hesaplama BGH kararı AZ: XI ZR 285/03'e göre (aktif-pasif yöntemi, Pfandbrief oranları). Yönlendirme hesaplayıcısı – bankanın hesaplamasının yerini tutmaz. Hukuki tavsiye değildir.",phRestschuld:"örn. 350000",cap489:"§ 489 BGB: zarar yalnızca {date} tarihine kadar hesaplandı — o günden itibaren ücretsiz fesih mümkün olurdu (ödemeden sonra 10 yıl + 6 ay bekleme süresi). Bu tarihten sonraki dönem dikkate alınmaz.",tipAuszahlung:"Kredinin tamamen ödendiği tarih. § 489 süresi için belirleyici (10 yıl + 6 ay bekleme süresi).",tipZbEnde:"Kararlaştırılan sabit faiz döneminin sonu. Bu tarihe kadar erken ödemede bankaya faiz zararı doğar.",tipRestschuld:"Aşağıdaki referans tarihinde bankaya göre güncel kredi bakiyesi.",tipRestschuldDatum:"Girilen kalan borcun ait olduğu referans tarihi. Hesaplama buradan fesih tarihine kadar yürür.",tipNominalzins:"Sözleşmesel nominal faiz y.b. (efektif faiz değil). Orada ayarlanmışsa kredi hesaplayıcıdan otomatik alınır.",tipRate:"Güncel aylık anüite (faiz + itfa). Boş bırakılırsa kredi hesaplayıcıdan tahmin edilir.",tipKuendigung:"Planlanan erken ödeme tarihi. Kalan borç referans tarihinden sonra ve sabit faiz dönemi sonundan önce olmalıdır.",tipSonderJ:"Sözleşmeyle kararlaştırılan yıllık ek ödeme (§ 500 BGB). Kalan borcu ve dolayısıyla faiz zararını azaltır. 0 = yok.",tipSonderGeleistet:"Bu yılki ek ödeme yapıldı mı? Evet = bir sonraki ek ödeme ancak gelecek yıl. Hayır = içinde bulunulan yıl için sayılır. Yalnızca yıllık ek ödeme > 0 € girilmişse geçerlidir.",tipWiederanlage:"Bankanın geri ödenen sermayeyi yeniden yatırabileceği Pfandbrief getirisi. Sözleşme faiziyle fark = faiz kaybı. Kaynak: bundesbank.de / fmh.de.",tipBearbeitung:"Bankanın erken ödeme işlemi için sabit ücreti. Genellikle 150–300 €."},
  zh:{secEck:"贷款基本数据",secKuend:"解约与市场数据",lAuszahlung:"放款日期",lZbEnde:"固定利率期结束",lRestschuld:"当前剩余债务",lRestschuldDatum:"剩余债务日期",lNominalzins:"年标定利率",lRate:"月供",lKuendigung:"计划解约日期",lSonderJ:"年度额外还款",lSonderGeleistet:"今年是否已额外还款？",lWiederanlage:"再投资利率（Pfandbrief）年",lBearbeitung:"银行手续费",hintFin:"↩ 贷款计算器",hintCalc:"↩ 已计算",hintPfand:"当前 Pfandbrief 收益率：bundesbank.de 或 fmh.de",yes:"是",no:"否",toResult:"结果 →",emptyTitle:"填写字段以计算罚金",emptyMin:"至少：放款日期、固定利率期结束、剩余债务、解约日期、再投资利率",freeTitle:"✅ 可免费解约（§ 489 BGB）",freeBodyA:"根据 § 489 BGB，本贷款自 {date} 起可免费解约。",freeBodyB:"（放款后 10 年 + 6 个月宽限期）",resOverview:"结果概览",rZins:"利息恶化损失",rRisiko:"风险节省（每年 0.1 个百分点）",rVerw:"管理费节省（每笔 4 €）",rBearb:"银行手续费",rNetto:"净提前还款罚金",negNote:"ℹ️ 负罚金：银行从提前还款中获益（当前再投资利率 {wa}% > 合同利率 {zp}%）。但银行仍无退款义务（无相应 BGH 判决）。",explainPosTitle:"💸 这对您意味着什么？",explainPos:"简而言之：提前还清贷款需向银行支付此金额，即提前还款罚金。\n\n为什么？银行原本计划收取固定利率期内全部利息，提前还款使这些收入消失，银行通过罚金弥补损失。\n\n如果当前市场利率明显低于合同利率，即使支付罚金，再融资也可能更划算。",explainNegTitle:"🤔 这对您意味着什么？",explainNeg:"结果为负值——听起来不错，但很遗憾并不意味着银行会退钱。\n\n原因：银行可将您归还的资金以高于合同利率的收益再投资，提前还款对银行实际上有利可图。\n\n目前没有BGH判决要求银行在此情况下退款。建议直接与银行沟通并索取详细计算清单。",planTitle:"📊 解约起的摊销计划",planOpen:"▼ 展开",planClose:"▲ 收起",planMonths:"个月",thJahr:"年份",thRest:"剩余债务",thTilg:"还本",thZinsOrig:"原利息",thZinsWA:"再投资利息",thZinsverlust:"利息损失",thAbgezinst:"折现",sum:"合计",disclaimer:"⚖️ 依据 BGH 判决 AZ: XI ZR 285/03 计算（资产负债法、Pfandbrief 利率）。仅供参考——不能替代银行的计算。非法律建议。",phRestschuld:"例如 350000",cap489:"§ 489 BGB：损失仅计算至 {date}——自该日起可免费解约（放款后 10 年 + 6 个月宽限期）。此日期之后的期间不予计入。",tipAuszahlung:"贷款全额放款的日期。对 § 489 期限具有决定性（10 年 + 6 个月宽限期）。",tipZbEnde:"约定固定利率期的结束。在此日期前提前还款会给银行造成利息损失。",tipRestschuld:"银行在下方参考日期的当前贷款余额。",tipRestschuldDatum:"所输入剩余债务对应的参考日期。计算从此处推算至解约日期。",tipNominalzins:"合同年标定利率（非实际利率）。若在贷款计算器中已设置则自动采用。",tipRate:"当前月供年金（利息 + 还本）。若留空则由贷款计算器估算。",tipKuendigung:"计划的提前还款日期。必须晚于剩余债务参考日期、早于固定利率期结束。",tipSonderJ:"合同约定的年度额外还款（§ 500 BGB）。减少剩余债务从而减少利息损失。0 = 无。",tipSonderGeleistet:"今年的额外还款是否已完成？是 = 下次额外还款在明年。否 = 计入当年。仅当填入年度额外还款 > 0 € 时相关。",tipWiederanlage:"银行可将所还本金再投资的 Pfandbrief 收益率。与合同利率之差 = 利息损失。来源：bundesbank.de / fmh.de。",tipBearbeitung:"银行办理提前还款的固定费用。通常 150–300 €。"},
  hi:{secEck:"ऋण के मुख्य आंकड़े",secKuend:"रद्दीकरण और बाज़ार डेटा",lAuszahlung:"वितरण तिथि",lZbEnde:"निश्चित दर अवधि का अंत",lRestschuld:"वर्तमान शेष ऋण",lRestschuldDatum:"शेष ऋण की तिथि",lNominalzins:"नाममात्र दर प्रति वर्ष",lRate:"मासिक किस्त",lKuendigung:"नियोजित रद्दीकरण तिथि",lSonderJ:"वार्षिक अतिरिक्त भुगतान",lSonderGeleistet:"इस वर्ष अतिरिक्त भुगतान किया?",lWiederanlage:"पुनर्निवेश दर (Pfandbrief) प्र.व.",lBearbeitung:"बैंक प्रसंस्करण शुल्क",hintFin:"↩ ऋण कैलकुलेटर",hintCalc:"↩ गणना की गई",hintPfand:"वर्तमान Pfandbrief प्रतिफल: bundesbank.de या fmh.de",yes:"हाँ",no:"नहीं",toResult:"परिणाम →",emptyTitle:"शुल्क की गणना हेतु फ़ील्ड भरें",emptyMin:"न्यूनतम: वितरण तिथि, निश्चित दर अवधि का अंत, शेष ऋण, रद्दीकरण तिथि, पुनर्निवेश दर",freeTitle:"✅ निःशुल्क रद्दीकरण संभव (§ 489 BGB)",freeBodyA:"§ 489 BGB के अनुसार यह ऋण {date} से निःशुल्क रद्द किया जा सकता है।",freeBodyB:"(वितरण के बाद 10 वर्ष + 6 माह की रियायत अवधि)",resOverview:"परिणाम अवलोकन",rZins:"ब्याज गिरावट हानि",rRisiko:"जोखिम बचत (0.1 अंक प्र.व.)",rVerw:"प्रशासनिक बचत (4 €/प्रविष्टि)",rBearb:"बैंक प्रसंस्करण शुल्क",rNetto:"शुद्ध अग्रिम भुगतान शुल्क",negNote:"ℹ️ ऋणात्मक शुल्क: बैंक को समय-पूर्व अदायगी से लाभ होता है (वर्तमान पुनर्निवेश दर {wa}% > अनुबंध दर {zp}%)। फिर भी बैंक वापसी हेतु बाध्य नहीं हैं (कोई संगत BGH निर्णय नहीं)।",explainPosTitle:"💸 आपके लिए इसका क्या अर्थ है?",explainPos:"सीधे शब्दों में: यदि आप अभी ऋण जल्दी चुकाते हैं तो यह राशि बैंक को देनी होगी — अग्रिम भुगतान शुल्क।\n\nबैंक यह क्यों लेता है? उसने निश्चित ब्याज अवधि तक ब्याज आय की योजना बनाई थी। समय-पूर्व चुकौती से यह आय समाप्त हो जाती है।\n\nयदि वर्तमान बाजार दर आपकी अनुबंध दर से काफी कम है तो शुल्क के बावजूद पुनर्वित्त लाभदायक हो सकता है।",explainNegTitle:"🤔 आपके लिए इसका क्या अर्थ है?",explainNeg:"परिणाम ऋणात्मक है — यह अच्छा लगता है लेकिन इसका मतलब यह नहीं कि बैंक आपको पैसे देगा।\n\nक्यों? बैंक वापस की गई राशि को आपकी ऋण दर से अधिक ब्याज पर निवेश कर सकता है — समय-पूर्व चुकौती वास्तव में बैंक के लिए लाभदायक है।\n\nकोई BGH निर्णय नहीं है जो बैंक को वापसी के लिए बाध्य करे। अपने बैंक से सीधे बात करें और विस्तृत गणना माँगें।",planTitle:"📊 रद्दीकरण से परिशोधन योजना",planOpen:"▼ खोलें",planClose:"▲ बंद करें",planMonths:"माह",thJahr:"वर्ष",thRest:"शेष ऋण",thTilg:"चुकौती",thZinsOrig:"मूल ब्याज",thZinsWA:"पुनर्निवेश ब्याज",thZinsverlust:"ब्याज हानि",thAbgezinst:"छूट दी गई",sum:"कुल",disclaimer:"⚖️ गणना BGH निर्णय AZ: XI ZR 285/03 के अनुसार (परिसंपत्ति-देयता विधि, Pfandbrief दरें)। मार्गदर्शन कैलकुलेटर – बैंक की गणना का स्थान नहीं लेता। कोई कानूनी सलाह नहीं।",phRestschuld:"उदा. 350000",cap489:"§ 489 BGB: हानि केवल {date} तक गणना की गई — उस दिन से निःशुल्क रद्दीकरण संभव होगा (वितरण के बाद 10 वर्ष + 6 माह रियायत अवधि)। इस तिथि के बाद की अवधि गणना में नहीं ली जाती।",tipAuszahlung:"वह तिथि जब ऋण पूर्णतः वितरित हुआ। § 489 समय-सीमा हेतु निर्णायक (10 वर्ष + 6 माह रियायत)।",tipZbEnde:"सहमत निश्चित दर अवधि का अंत। इस तिथि तक समय-पूर्व अदायगी पर बैंक को ब्याज हानि होती है।",tipRestschuld:"नीचे दी गई संदर्भ तिथि पर बैंक के अनुसार वर्तमान ऋण शेष।",tipRestschuldDatum:"दर्ज शेष ऋण जिस संदर्भ तिथि से संबंधित है। गणना यहाँ से रद्दीकरण तिथि तक चलती है।",tipNominalzins:"अनुबंधगत नाममात्र दर प्र.व. (प्रभावी दर नहीं)। यदि ऋण कैलकुलेटर में सेट हो तो स्वतः लिया जाता है।",tipRate:"वर्तमान मासिक वार्षिकी (ब्याज + चुकौती)। खाली होने पर ऋण कैलकुलेटर से अनुमानित।",tipKuendigung:"समय-पूर्व अदायगी की नियोजित तिथि। शेष-ऋण संदर्भ तिथि के बाद और निश्चित दर अवधि के अंत से पहले होनी चाहिए।",tipSonderJ:"अनुबंध में तय वार्षिक अतिरिक्त भुगतान (§ 500 BGB)। शेष ऋण और इस प्रकार ब्याज हानि घटाता है। 0 = कोई नहीं।",tipSonderGeleistet:"इस वर्ष का अतिरिक्त भुगतान हो चुका? हाँ = अगला अतिरिक्त भुगतान अगले वर्ष। नहीं = चालू वर्ष हेतु गिना जाता है। केवल तब प्रासंगिक जब वार्षिक अतिरिक्त भुगतान > 0 € दर्ज हो।",tipWiederanlage:"वह Pfandbrief प्रतिफल जिस पर बैंक चुकाई गई पूंजी पुनर्निवेश कर सकता है। अनुबंध दर से अंतर = ब्याज हानि। स्रोत: bundesbank.de / fmh.de।",tipBearbeitung:"समय-पूर्व अदायगी के प्रसंस्करण हेतु बैंक का निश्चित शुल्क। सामान्यतः 150–300 €।"}
};

// ═══════════ VORFÄLLIGKEITSRECHNER ═══════════
function Vorfaelligkeit(){
  const{d,set,t,lang}=useApp();
  const vt=VFE_T[lang]||VFE_T.de;
  const loc={de:"de-DE",en:"en-GB",tr:"tr-TR",zh:"zh-CN",hi:"hi-IN"}[lang]||"de-DE";
  const[view,setView]=useState("input");


  // Auto-Rate aus Finanzierungsrechner-Kontext
  const autoRate=useMemo(()=>{
    if(d.vfeMonatsRate&&+d.vfeMonatsRate>0)return +d.vfeMonatsRate;
    const da=Math.max(0,(+d.kaufpreis||0)-(+d.eigenkapital||0));
    const zP=+d.zinssatz||0,tP=+d.tilgung||0;
    const mz=zP/100/12;
    if(!da||!mz)return 0;
    return da*(zP+tP)/100/12;
  },[d]);

  // Beispiel-Defaults beim ersten Öffnen setzen
  useEffect(()=>{
    if(!d.vfeAuszahlung)set("vfeAuszahlung","2019-03-01");
    if(!d.vfeSollzinsbindungsEnde)set("vfeSollzinsbindungsEnde","2029-03-01");
    if(!d.vfeRestschuld){const da=Math.max(0,(+d.kaufpreis||300000)-(+d.eigenkapital||60000));set("vfeRestschuld",String(da||240000));}
    if(!d.vfeSollzinssatz&&!d.zinssatz)set("vfeSollzinssatz","1.85");
    if(!d.vfeMonatsRate){const da=Math.max(0,(+d.kaufpreis||300000)-(+d.eigenkapital||60000));const zP=+(d.zinssatz||MARKET_RATES.avg),tP=+(d.tilgung||1);const r=Math.round(da*(zP+tP)/100/12);if(r>0)set("vfeMonatsRate",String(r));}
    if(!d.vfeAbloeseTermin)set("vfeAbloeseTermin","2026-09-01");
    if(!d.vfeRestschuldDatum)set("vfeRestschuldDatum",new Date().toISOString().split("T")[0]);
  },[]);

  const R=useMemo(()=>{
    const ablT=d.vfeAbloeseTermin?new Date(d.vfeAbloeseTermin):null;
    const auszT=d.vfeAuszahlung?new Date(d.vfeAuszahlung):null;
    const zbEnde=d.vfeSollzinsbindungsEnde?new Date(d.vfeSollzinsbindungsEnde):null;
    const rsDateStr=d.vfeRestschuldDatum||new Date().toISOString().split("T")[0];
    const rsDate=new Date(rsDateStr);
    const rs0=+d.vfeRestschuld||0;
    const effZP=+(d.vfeSollzinssatz||d.zinssatz)||0;
    const effRate=+(d.vfeMonatsRate||(autoRate>0?String(Math.round(autoRate)):""))||0;
    const wa=+(d.vfeWiederanlagezins||String(PFANDBRIEF.zins))||0;
    const bearbeit=+d.vfeBearbeitungsentgelt||0;
    const sondJ=+d.vfeSondertilgung||0;
    const sondGeleistet=d.vfeSondertilgungGeleistet==="ja";
    if(!ablT||!auszT||!zbEnde||!rs0||!effRate||!effZP||!wa)return null;
    if(ablT<=rsDate||zbEnde<=ablT)return null;

    // §489 BGB: 10 Jahre + 6 Monate Karenzzeit nach Auszahlung
    const freeCancelDate=new Date(auszT);
    freeCancelDate.setMonth(freeCancelDate.getMonth()+126);
    const is489Free=ablT>=freeCancelDate;

    // Restschuld zum Ablösetermin berechnen
    const mz=effZP/100/12;
    // Sondertilgung wird einmal pro Kalenderjahr angesetzt. Der Ja/Nein-Toggle
    // steuert das laufende Jahr: "Ja" (bereits geleistet) → nächste Sondertilgung
    // erst im Folgejahr; "Nein" → sie wird sofort für das aktuelle Jahr verrechnet.
    let rs=rs0,cur=new Date(rsDate);
    let lastSondYear=sondGeleistet?rsDate.getFullYear():rsDate.getFullYear()-1;
    while(cur<ablT){
      const y=cur.getFullYear();
      if(sondJ>0&&y>lastSondYear){rs=Math.max(0,rs-sondJ);lastSondYear=y;}
      const zi=rs*mz,ti=Math.max(0,effRate-zi);
      rs=Math.max(0,rs-ti);
      cur.setMonth(cur.getMonth()+1);
      if(rs<=0)break;
    }
    const rsKuend=rs;
    if(is489Free)return{is489Free:true,rsKuend,freeCancelDate};

    // Tilgungsplan ab Kündigungstermin. §489 BGB: Die Bank kann den Zinsschaden nur bis
    // zu dem Tag verlangen, an dem der Darlehensnehmer kostenlos hätte kündigen können
    // (Auszahlung + 10 J. + 6 Mon. Karenzzeit). Schadenshorizont = min(Zinsbindungsende, freeCancelDate).
    const horizon=freeCancelDate<zbEnde?freeCancelDate:zbEnde;
    const capped=freeCancelDate<zbEnde;
    const waMon=wa/100/12;
    let rsL=rsKuend,curL=new Date(ablT),month=0;
    let totalZinsV=0,totalRisiko=0,totalVerwaltung=0;
    const rows=[];
    let yrKey=ablT.getFullYear();
    let yrRs=rsKuend,yrTilg=0,yrZinsV=0,yrZinsWA=0,yrZinsverlust=0,yrAbg=0;

    while(rsL>0.01&&curL<horizon){
      month++;
      const yS=curL.getFullYear();
      if(sondJ>0&&yS>lastSondYear){rsL=Math.max(0,rsL-sondJ);lastSondYear=yS;}
      const zV=rsL*mz,zWA=rsL*waMon;
      const ti=Math.max(0,effRate-zV);
      const zinsverlust=zV-zWA;
      const df=1/Math.pow(1+waMon,month);
      const zinsverlustAbg=zinsverlust*df;
      totalZinsV+=zinsverlustAbg;
      totalRisiko+=rsL*(0.001/12)*df;
      totalVerwaltung+=4;
      yrZinsV+=zV;yrZinsWA+=zWA;yrTilg+=ti;yrZinsverlust+=zinsverlust;yrAbg+=zinsverlustAbg;
      rsL=Math.max(0,rsL-ti);
      curL.setMonth(curL.getMonth()+1);
      const yr=curL.getFullYear();
      if(yr!==yrKey||!(curL<horizon)||rsL<=0.01){
        rows.push({datum:yrKey,rs:rsL,tilg:yrTilg,zinsV:yrZinsV,zinsWA:yrZinsWA,zinsverlust:yrZinsverlust,abgezinst:yrAbg});
        yrKey=yr;yrTilg=0;yrZinsV=0;yrZinsWA=0;yrZinsverlust=0;yrAbg=0;
      }
    }
    const nettovfe=totalZinsV-totalRisiko-totalVerwaltung+bearbeit;
    return{is489Free:false,rsKuend,zinsverschlSchaden:totalZinsV,risikoersparnis:totalRisiko,verwaltungsersparnis:totalVerwaltung,bearbeitungsentgelt:bearbeit,nettovfe,rows,months:month,effZP,wa,capped,freeCancelDate};
  },[d,autoRate]);

  const today2=new Date().toISOString().split("T")[0];
  const effZinsDisp=d.vfeSollzinssatz||d.zinssatz||"";
  const effRateDisp=d.vfeMonatsRate||(autoRate>0?String(Math.round(autoRate)):"");

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={vt.secEck} icon="🏦"/>
      <Row>
        <F label={vt.lAuszahlung} type="date" value={d.vfeAuszahlung||""} onChange={v=>set("vfeAuszahlung",v)} tip={vt.tipAuszahlung}/>
        <F label={vt.lZbEnde} type="date" value={d.vfeSollzinsbindungsEnde||""} onChange={v=>set("vfeSollzinsbindungsEnde",v)} tip={vt.tipZbEnde}/>
      </Row>
      <Row>
        <F label={vt.lRestschuld} unit="€" value={d.vfeRestschuld||""} onChange={v=>set("vfeRestschuld",v)} placeholder={vt.phRestschuld} tip={vt.tipRestschuld}/>
        <F label={vt.lRestschuldDatum} type="date" value={d.vfeRestschuldDatum||today2} onChange={v=>set("vfeRestschuldDatum",v)} tip={vt.tipRestschuldDatum}/>
      </Row>
      <Row>
        <F label={vt.lNominalzins} unit="%" value={effZinsDisp} onChange={v=>set("vfeSollzinssatz",v)} step="0.01" tip={vt.tipNominalzins} hint={!d.vfeSollzinssatz&&d.zinssatz?vt.hintFin:""}/>
        <F label={vt.lRate} unit="€" value={effRateDisp} onChange={v=>set("vfeMonatsRate",v)} step="1" tip={vt.tipRate} hint={!d.vfeMonatsRate&&autoRate>0?vt.hintCalc:""}/>
      </Row>
      <Sec title={vt.secKuend} icon="📋"/>
      <F label={vt.lKuendigung} type="date" value={d.vfeAbloeseTermin||""} onChange={v=>set("vfeAbloeseTermin",v)} tip={vt.tipKuendigung}/>
      <Row>
        <F label={vt.lSonderJ} unit="€" value={d.vfeSondertilgung||"0"} onChange={v=>set("vfeSondertilgung",v)} tip={vt.tipSonderJ}/>
        <F label={vt.lSonderGeleistet} tip={vt.tipSonderGeleistet}>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            {["nein","ja"].map(v=><button key={v} onClick={()=>set("vfeSondertilgungGeleistet",v)} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${(d.vfeSondertilgungGeleistet||"nein")===v?"var(--ca)":"var(--cb)"}`,background:(d.vfeSondertilgungGeleistet||"nein")===v?"var(--ca-bg)":"var(--ci)",color:(d.vfeSondertilgungGeleistet||"nein")===v?"var(--ca)":"var(--cl)",fontWeight:600,fontSize:14,cursor:"pointer"}}>{v==="ja"?vt.yes:vt.no}</button>)}
          </div>
        </F>
      </Row>
      <F label={vt.lWiederanlage} unit="%" value={d.vfeWiederanlagezins||String(PFANDBRIEF.zins)} onChange={v=>set("vfeWiederanlagezins",v)} step="0.01" tip={vt.tipWiederanlage} hint={vt.hintPfand}/>
      <F label={vt.lBearbeitung} unit="€" value={d.vfeBearbeitungsentgelt||"150"} onChange={v=>set("vfeBearbeitungsentgelt",v)} tip={vt.tipBearbeitung}/>
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{vt.toResult}</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R
        ?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}>
            <div style={{fontSize:48,marginBottom:12}}>✂️</div>
            <div style={{fontSize:14}}>{vt.emptyTitle}</div>
            <div style={{fontSize:12,marginTop:8,lineHeight:1.6}}>{vt.emptyMin}</div>
          </div>
        :R.is489Free
        ?<div style={{background:"#F0FAF3",border:"2px solid #86EFAC",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:18,fontWeight:700,color:"#15803d",marginBottom:8}}>{vt.freeTitle}</div>
            <div style={{fontSize:13,color:"#166534",lineHeight:1.7}}>
              {vt.freeBodyA.split("{date}")[0]}<strong>{R.freeCancelDate.toLocaleDateString(loc)}</strong>{vt.freeBodyA.split("{date}")[1]}<br/>
              {vt.freeBodyB}
            </div>
          </div>
        :<>
          <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:14,overflow:"hidden",marginBottom:14}}>
            <div style={{background:"var(--cro)",padding:"12px 16px",borderBottom:"1px solid var(--cb)",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"var(--ca)"}}>{vt.resOverview}</div>
            {[
              {l:vt.rZins,v:R.zinsverschlSchaden},
              {l:vt.rRisiko,v:-R.risikoersparnis},
              {l:vt.rVerw,v:-R.verwaltungsersparnis},
              {l:vt.rBearb,v:R.bearbeitungsentgelt},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:"1px solid var(--cb)",fontSize:13}}>
                <span style={{color:"var(--cl)"}}>{row.l}</span>
                <span style={{fontWeight:600,fontVariantNumeric:"tabular-nums",color:row.v<0?"#16a34a":"#dc2626"}}>{row.v<0?"−":"+"}{ fmtE(Math.abs(row.v)) }</span>
              </div>
            ))}
            <div style={{background:"var(--ca)",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:13}}>{vt.rNetto}</span>
              <span style={{color:"#fff",fontWeight:800,fontSize:22,fontVariantNumeric:"tabular-nums"}}>{R.nettovfe<0?"−":"+"}{fmtE(Math.abs(R.nettovfe))}</span>
            </div>
          </div>
          {R.nettovfe<0&&<div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#1e40af",lineHeight:1.6}}>
            {vt.negNote.replace("{wa}",R.wa).replace("{zp}",R.effZP)}
          </div>}
          {R.nettovfe>=0
            ?<div style={{background:"#FFF7ED",border:"2px solid #FED7AA",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:15,color:"#9a3412",marginBottom:12}}>{vt.explainPosTitle}</div>
                {(vt.explainPos||"").split("\n\n").map((para,i)=>(
                  <p key={i} style={{fontSize:13,color:"#7c2d12",lineHeight:1.75,margin:i===0?"0 0 10px":"10px 0 0"}}>{para}</p>
                ))}
              </div>
            :<div style={{background:"#F0FDF4",border:"2px solid #BBF7D0",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:15,color:"#14532d",marginBottom:12}}>{vt.explainNegTitle}</div>
                {(vt.explainNeg||"").split("\n\n").map((para,i)=>(
                  <p key={i} style={{fontSize:13,color:"#166534",lineHeight:1.75,margin:i===0?"0 0 10px":"10px 0 0"}}>{para}</p>
                ))}
              </div>
          }
          <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:14,overflow:"hidden",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",fontSize:14,fontWeight:600,color:"var(--ct)",borderBottom:"1px solid var(--cb)"}}>
              <span>{vt.planTitle}</span>
              <span style={{fontSize:11,color:"var(--ch)"}}>({R.months} {vt.planMonths})</span>
            </div>
            <div style={{padding:"0 0 12px",overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:480}}>
                <thead><tr style={{background:"var(--cro)"}}>
                  {[vt.thJahr,vt.thRest,vt.thTilg,vt.thZinsOrig,vt.thZinsWA,vt.thZinsverlust,vt.thAbgezinst].map((h,i)=>(
                    <th key={i} style={{padding:"6px 10px",textAlign:i===0?"left":"right",color:"var(--ch)",fontWeight:600,borderBottom:"1px solid var(--cb)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {R.rows.map((row,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid var(--cb)"}}>
                      <td style={{padding:"5px 10px"}}>{row.datum}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(row.rs)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(row.tilg)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(row.zinsV)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(row.zinsWA)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:row.zinsverlust<0?"#16a34a":"#dc2626"}}>{fmtE(row.zinsverlust)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:row.abgezinst<0?"#16a34a":"#dc2626"}}>{fmtE(row.abgezinst)}</td>
                    </tr>
                  ))}
                  <tr style={{fontWeight:700,background:"var(--cro)"}}>
                    <td style={{padding:"6px 10px"}}>{vt.sum}</td>
                    <td style={{padding:"6px 10px",textAlign:"right"}}>—</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.tilg,0))}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.zinsV,0))}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.zinsWA,0))}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.zinsverlust,0))}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.abgezinst,0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {R.capped&&<div style={{fontSize:12,color:"#1e40af",lineHeight:1.6,padding:"10px 12px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,marginBottom:10}}>
            ⏱️ {vt.cap489.replace("{date}",R.freeCancelDate.toLocaleDateString(loc))}
          </div>}
          <div style={{fontSize:11,color:"var(--ch)",lineHeight:1.6,padding:"10px 12px",background:"var(--cro)",borderRadius:10}}>
            {vt.disclaimer}
          </div>
          <ExportPDF title={t.vfeFull||t.vfe}/>
        </>
      }
    </div>
  </div></div>;
}

// ═══════════ LANDING PAGE ═══════════
function Landing({onStart,zinsen,openDatenschutz,openImpressum,lang,setLang}){
  const l=TL[lang]||TL.de;
  const zD=zinsen&&zinsen.datum?zinsen.datum:null;
  const zB=zinsen?.bundesanleihe_10j;
  const [tipOpen,setTipOpen]=useState(false);
  const [navOpen,setNavOpen]=useState(false);

  const scrollTo=(id)=>{const el=document.getElementById(id);if(el){const y=el.getBoundingClientRect().top+window.scrollY-80;window.scrollTo({top:y,behavior:"smooth"});setNavOpen(false)}};

  return <div style={{minHeight:"100dvh",background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",paddingTop:"calc(80px + env(safe-area-inset-top))",overflowX:"hidden",position:"relative",width:"100%"}}>


    {/* ═══════════ STICKY HEADER WITH NAV + CTA ═══════════ */}
    <header style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"rgba(245,245,240,.92)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderBottom:"1px solid var(--cb)",paddingTop:"env(safe-area-inset-top)"}}>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:24}}>

        {/* Logo */}
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{display:"flex",alignItems:"center",gap:14,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
          <img src="/icon-192.png" alt="Immofuchs" style={{width:52,height:52,objectFit:"contain",flexShrink:0,borderRadius:10}}/>
          <div style={{fontSize:23,fontWeight:800,letterSpacing:-.5,lineHeight:1,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)",fontWeight:700}}>.info</span></div>
        </button>

        {/* Desktop Nav */}
        <nav className="lp-nav" style={{display:"flex",alignItems:"center",gap:28}}>
          <button onClick={()=>scrollTo("rechner")} style={navLink}>{l.navRechner}</button>
          <button onClick={()=>scrollTo("funktioniert")} style={navLink}>{l.navHow}</button>
          <button onClick={()=>scrollTo("zinsen")} style={navLink}>{l.navZinsen}</button>
        </nav>

        {/* Right side: lang + CTA */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <LangSel lang={lang} setLang={setLang}/>
          <button onClick={()=>scrollTo("rechner")} className="lp-cta" style={{padding:"10px 18px",background:"var(--ca)",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 12px rgba(232,96,10,.25)",letterSpacing:.2,whiteSpace:"nowrap"}}>{l.heroCtaPrimary}</button>
          {/* Mobile nav toggle */}
          <button onClick={()=>setNavOpen(o=>!o)} className="lp-burger" style={{display:"none",width:40,height:40,padding:0,background:"none",border:"1px solid var(--cb)",borderRadius:8,cursor:"pointer",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18}}>☰</span>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen&&<div className="lp-nav-mobile" style={{borderTop:"1px solid var(--cb)",padding:"12px 24px 18px",display:"flex",flexDirection:"column",gap:4,background:"var(--cc)"}}>
        <button onClick={()=>scrollTo("rechner")} style={navLinkMobile}>{l.navRechner}</button>
        <button onClick={()=>scrollTo("funktioniert")} style={navLinkMobile}>{l.navHow}</button>
        <button onClick={()=>scrollTo("zinsen")} style={navLinkMobile}>{l.navZinsen}</button>
      </div>}
    </header>

    {/* ═══════════ HERO ═══════════ */}
    <section style={{maxWidth:1280,margin:"0 auto",padding:"clamp(32px,6vw,80px) 16px clamp(32px,5vw,60px)",width:"100%",boxSizing:"border-box"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:"clamp(28px,5vw,48px)",alignItems:"center",justifyItems:"center"}}>

        {/* LEFT: Headline + CTAs */}
        <div style={{width:"100%"}}>
          <h1 style={{fontSize:"clamp(34px,5vw,56px)",fontWeight:800,color:"var(--ct)",letterSpacing:-1,lineHeight:1.05,margin:"0 0 18px"}}>
            {l.h1a}<span style={{color:"var(--ca)"}}>{l.h1b}</span>{l.h1c}
          </h1>

          <p style={{fontSize:"clamp(16px,1.6vw,19px)",color:"var(--ch)",lineHeight:1.55,margin:"0 0 28px",maxWidth:540}}>{l.subShort}</p>

          {/* CTAs */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:28}}>
            <button onClick={()=>scrollTo("rechner")} style={{padding:"14px 26px",background:"var(--ca)",color:"#fff",border:"none",borderRadius:11,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 20px rgba(232,96,10,.28)",letterSpacing:.2,display:"inline-flex",alignItems:"center",gap:8}}>{l.heroCtaPrimary} <span style={{fontSize:18,marginTop:-2}}>→</span></button>
            <button onClick={()=>scrollTo("funktioniert")} style={{padding:"14px 24px",background:"var(--cc)",color:"var(--ct)",border:"1.5px solid var(--cb)",borderRadius:11,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:.2}}>{l.heroCtaSecondary}</button>
          </div>

          {/* Trust elements */}
          <div style={{display:"flex",flexWrap:"wrap",gap:"10px 24px",fontSize:13,color:"var(--ch)"}}>
            {[
              {ic:"✓",t:l.trust1},
              {ic:"✓",t:l.trust2},
              {ic:"✓",t:l.trust4}
            ].map((tr,i)=><div key={i} style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{width:18,height:18,borderRadius:"50%",background:"#22c55e",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{tr.ic}</span>
              <span style={{fontWeight:500,color:"var(--cl)"}}>{tr.t}</span>
            </div>)}
          </div>
        </div>

        {/* RIGHT: Browser Mockup (larger, more polished) */}
        <div style={{position:"relative",width:"100%",maxWidth:"100%",overflow:"hidden"}}>

          <div style={{background:"#1a1a1a",borderRadius:"14px 14px 0 0",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 30px 60px -10px rgba(0,0,0,.18)"}}>
            <div style={{display:"flex",gap:7}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#ff5f56"}}/>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#ffbd2e"}}/>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#27c93f"}}/>
            </div>
            <div style={{flex:1,background:"#2a2a2a",borderRadius:7,padding:"5px 14px",fontSize:12,color:"#aaa",textAlign:"center",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span style={{color:"#27c93f",fontSize:10}}>🔒</span> immofuchs.info
            </div>
          </div>
          <div style={{background:"var(--cc)",borderRadius:"0 0 14px 14px",padding:"20px",boxShadow:"0 30px 60px -10px rgba(0,0,0,.18)",border:"1px solid var(--cb)",borderTop:"none"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:11}}>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockKauf}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>350.000 €</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockMiete}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>1.200 €</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockZins}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>{(zinsen?.avg||MARKET_RATES.avg)} % p.a.</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockEK}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>70.000 €</div></div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{padding:"10px 11px",background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8}}>
                    <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--ca)",fontWeight:700}}>{l.mockBrutto}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--ca)",marginTop:3}}>4,11 %</div>
                  </div>
                  <div style={{padding:"10px 11px",background:"#e7f7ee",border:"1px solid #b7e4c7",borderRadius:8}}>
                    <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"#1a7f3e",fontWeight:700}}>{l.mockNetto}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#1a7f3e",marginTop:3}}>2,98 %</div>
                  </div>
                </div>
                <div style={{padding:"10px 12px",border:"1px solid var(--cb)",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:11,color:"var(--cl)",fontWeight:600}}>{l.mockRate}</div><div style={{fontSize:9,color:"var(--ch)"}}>{l.mockRateSub}</div></div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1d6af5"}}>1.154 €</div>
                </div>
                <div style={{padding:"10px 12px",background:"#e7f7ee",border:"1px solid #b7e4c7",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:11,color:"#1a7f3e",fontWeight:600}}>{l.mockCF}</div><div style={{fontSize:9,color:"#5a8a6f"}}>{l.mockCFSub}</div></div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1a7f3e"}}>+46 €</div>
                </div>
                <div style={{padding:"10px 12px",border:"1px solid var(--cb)",borderRadius:8}}>
                  <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--ch)",fontWeight:700,marginBottom:7}}>{l.mockChart}</div>
                  <div style={{display:"flex",gap:3,alignItems:"flex-end",height:42}}>
                    {[30,36,42,50,56,64,70,78,85,92,100].map((h,i)=><div key={i} style={{flex:1,height:h+"%",background:"var(--ca)",borderRadius:"2px 2px 0 0",opacity:.3+i*0.07}}/>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    {/* ═══════════ HOW IT WORKS ═══════════ */}
    <section id="funktioniert" style={{padding:"clamp(40px,5vw,72px) 24px",background:"var(--cc)",borderTop:"1px solid var(--cb)",borderBottom:"1px solid var(--cb)"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.howTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.howShort}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24}}>
          {[
            {n:"1",icon:"📍",t:l.step1H,d:l.step1P},
            {n:"2",icon:"📊",t:l.step2H,d:l.step2P},
            {n:"3",icon:"💡",t:l.step3H,d:l.step3P}
          ].map((s,i)=><div key={i} style={{background:"var(--bg)",borderRadius:14,padding:"28px 24px",border:"1px solid var(--cb)",position:"relative",transition:"transform .2s, box-shadow .2s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 30px rgba(0,0,0,.06)"}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:42,height:42,background:"var(--ca-bg)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:"1px solid var(--ca-bd)"}}>{s.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--ca)",letterSpacing:1}}>STEP {s.n}</div>
            </div>
            <h3 style={{fontSize:18,fontWeight:700,color:"var(--ct)",margin:"0 0 8px",letterSpacing:-.2}}>{s.t}</h3>
            <p style={{fontSize:14,color:"var(--ch)",lineHeight:1.6,margin:0}}>{s.d}</p>
          </div>)}
        </div>
      </div>
    </section>

    {/* ═══════════ CALCULATOR CARDS ═══════════ */}
    <section id="rechner" style={{padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.cardsTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.cardsSub}</h2>
        </div>

        {/* ── HERO: Renditerechner ── */}
        <button onClick={()=>onStart("haupt")} style={{display:"block",background:"transparent",border:"1.5px solid var(--cb)",borderRadius:14,textAlign:"left",cursor:"pointer",transition:"all .2s",padding:0,fontFamily:"inherit",width:"100%",marginBottom:16,WebkitAppearance:"none"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--ca)";e.currentTarget.style.boxShadow="0 8px 28px rgba(232,96,10,.14)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--cb)";e.currentTarget.style.boxShadow=""}}>
          <div className="calc-hero-card" style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:"var(--cc)",borderRadius:13,overflow:"hidden",width:"100%"}}>
            <div style={{overflow:"hidden",background:"linear-gradient(135deg,#fff1e8 0%,#ffd9b8 100%)",minHeight:200}}>
              <img src="/card-rendite.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>
            </div>
            <div style={{padding:"28px 28px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{display:"inline-block",fontSize:9,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:"var(--ca)",background:"var(--ca-bg)",padding:"3px 8px",borderRadius:4,marginBottom:12,width:"fit-content"}}>★ {l.fullBadge}</div>
              <h3 style={{fontSize:22,fontWeight:700,color:"var(--ct)",margin:"0 0 10px",letterSpacing:-.3}}>{l.fullTitle}</h3>
              <p style={{fontSize:13,color:"var(--ch)",lineHeight:1.6,margin:0}}>{l.fullDesc}</p>
            </div>
          </div>
        </button>

        {/* ── SUPPORT: 5 Ergänzungs-Rechner ── */}
        <div className="calc-cards-support">
          {[
            {tab:"kredit",title:l.finTitle,badge:l.finBadge,desc:l.finDesc,feats:[l.finF1,l.finF2,l.finF3],bg:"linear-gradient(135deg,#e8f5ed 0%,#bce4ce 100%)",illus:<img src="/card-kredit.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>},
            {tab:"miete",title:l.rentTitle,badge:l.rentBadge,desc:l.rentDesc,feats:[l.rentF1,l.rentF2,l.rentF3],bg:"linear-gradient(135deg,#fff5e8 0%,#ffd5b8 100%)",illus:<img src="/card-miete.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>},
            {tab:"sanier",title:l.sanTitle,badge:l.sanBadge,desc:l.sanDesc,feats:[l.sanF1,l.sanF2,l.sanF3],bg:"linear-gradient(135deg,#e8f0f5 0%,#bcd4e6 100%)",illus:<img src="/card-sanierung.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>},
            {tab:"steuer6",title:l.st6Title,badge:l.st6Badge,desc:l.st6Desc,feats:[l.st6F1,l.st6F2,l.st6F3],bg:"linear-gradient(135deg,#e8eef5 0%,#c2d3e8 100%)",illus:<img src="/card-steuer.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>},
            {tab:"vfe",title:l.vfeTitle,badge:l.vfeBadge,desc:l.vfeDesc,feats:[l.vfeF1,l.vfeF2,l.vfeF3],bg:"linear-gradient(135deg,#f0eafa 0%,#d4c5f0 100%)",illus:<img src="/card-vorfaelligkeit.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>}
          ].map((c,i)=><button key={i} onClick={()=>onStart(c.tab)} style={{display:"flex",flexDirection:"column",background:"var(--cc)",border:"1.5px solid var(--cb)",borderRadius:14,overflow:"hidden",textAlign:"left",cursor:"pointer",transition:"all .2s",padding:0,fontFamily:"inherit",width:"100%"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="var(--ca)";e.currentTarget.style.boxShadow="0 8px 24px rgba(232,96,10,.12)"}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor="var(--cb)";e.currentTarget.style.boxShadow=""}}>
            <div style={{aspectRatio:"1200/520",width:"100%",overflow:"hidden",borderRadius:"13px 13px 0 0",borderBottom:"1px solid rgba(0,0,0,.05)",flexShrink:0,background:c.bg}}>
              {c.illus}
            </div>
            <div style={{padding:"16px 16px",flex:1}}>
              <div style={{display:"inline-block",fontSize:9,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:"var(--ca)",background:"var(--ca-bg)",padding:"3px 8px",borderRadius:4,marginBottom:8}}>{c.badge}</div>
              <h3 style={{fontSize:15,fontWeight:700,color:"var(--ct)",margin:"0 0 6px",letterSpacing:-.2}}>{c.title}</h3>
              <p style={{fontSize:11,color:"var(--ch)",lineHeight:1.5,margin:0}}>{c.desc}</p>
            </div>
          </button>)}
        </div>
      </div>
    </section>

    {/* ═══════════ DATEN-ABSCHNITT ═══════════ */}
    <section style={{background:"var(--bg)",borderTop:"1px solid var(--cb)",padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.dataEyebrow}</div>
          <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:800,color:"var(--ct)",margin:"0 0 14px",letterSpacing:-.5,lineHeight:1.15}}>{l.dataTitle}</h2>
          <p style={{fontSize:15,color:"var(--ch)",maxWidth:520,margin:"0 auto",lineHeight:1.6}}>{l.dataSub}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:28}}>
          {[
            {ic:"💰",label:l.dc1L,val:`${MARKET_RATES.avg.toLocaleString("de-DE",{minimumFractionDigits:2})} %`,sub:l.dc1S},
            {ic:"📊",label:l.dc2L,val:"+2,1 %/Jahr",sub:l.dc2S},
            {ic:"🏠",label:l.dc3L,val:"+2,0 %/Jahr",sub:l.dc3S},
            {ic:"🏛️",label:l.dc4L,val:l.dc4V,sub:l.dc4S},
            {ic:"⚖️",label:l.dc5L,val:l.dc5V,sub:l.dc5S},
            {ic:"🏗️",label:l.dc6L,val:l.dc6V,sub:l.dc6S},
            {ic:"🌱",label:l.dc7L,val:l.dc7V,sub:l.dc7S},
            {ic:"📋",label:l.dc8L,val:l.dc8V,sub:l.dc8S},
            {ic:"💶",label:l.dc9L,val:l.dc9V,sub:l.dc9S,green:true}
          ].map((d,i)=><div key={i} style={{background:"var(--cc)",borderRadius:12,border:"1px solid var(--cb)",padding:"14px 16px"}}>
            <div style={{fontSize:20,marginBottom:6}}>{d.ic}</div>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,marginBottom:4}}>{d.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:d.green?"#22c55e":"var(--ca)",lineHeight:1.1,marginBottom:3}}>{d.val}</div>
            <div style={{fontSize:11,color:"var(--ch)"}}>{d.sub}</div>
          </div>)}
        </div>
        <div style={{textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:"var(--ch)"}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0}}/>
          <span>{(()=>{const n=new Date();return l.dataStand+" "+n.toLocaleDateString(LANG_LOCALE[lang]||"de-DE",{month:"long",year:"numeric"});})()}</span>
        </div>
      </div>
    </section>

    {/* ═══════════ USP ═══════════ */}
    <section style={{background:"var(--cc)",borderTop:"1px solid var(--cb)",borderBottom:"1px solid var(--cb)",padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.uspTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.uspSub}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:24}}>
          {[
            {ic:"⚖️",h:l.usp2H,p:l.usp2P},
            {ic:"🔒",h:l.usp5H,p:l.usp5P},
            {ic:"🌐",h:l.usp6H,p:l.usp6P},
            {ic:"💻",h:l.usp4H,p:l.usp4P}
          ].map((u,i)=><div key={i}>
            <div style={{fontSize:28,marginBottom:12}}>{u.ic}</div>
            <h3 style={{fontSize:15,fontWeight:700,color:"var(--ct)",margin:"0 0 6px"}}>{u.h}</h3>
            <p style={{fontSize:13,color:"var(--ch)",lineHeight:1.6,margin:0}}>{u.p}</p>
          </div>)}
        </div>
      </div>
    </section>

    {/* ═══════════ ZINSEN — discreet ticker section ═══════════ */}
    <section id="zinsen" style={{padding:"clamp(30px,4vw,50px) 24px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div style={{borderLeft:"3px solid var(--ca)",paddingLeft:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:10,color:"var(--ca)",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>
            <span style={{width:6,height:6,background:"var(--ca)",borderRadius:"50%",animation:"pulse 2s infinite"}}/>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
            📊 {l.ratesTitle} · {l.ratesStand}: {zinsen?.stand||MARKET_RATES.stand}
          </div>
          <p style={{margin:"0 0 6px",fontSize:13,color:"var(--cl)",lineHeight:1.7}}>
            {l.ratesIntro2} <strong>{l.ratesCompact}: {(zinsen?.avg||MARKET_RATES.avg)} %</strong> · {l.ratesShort}: <strong>{(zinsen?.top||MARKET_RATES.top)} %</strong>
            {zB&&<> · {l.ratesShort3}: <strong>{zB} %</strong></>}
          </p>
          <p style={{margin:0,fontSize:11,color:"var(--ch)",lineHeight:1.5}}>{l.ratesSources}: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank · {l.ratesDisclaim}</p>
          <ZinsAlarm zinsen={zinsen} lang={lang} />
        </div>
      </div>
    </section>

    {/* ═══════════ FOOTER ═══════════ */}
    <footer style={{marginTop:"auto",borderTop:"1px solid var(--cb)",padding:"32px 24px 28px",background:"var(--cc)"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/icon-192.png" alt="Immofuchs" style={{width:36,height:36,objectFit:"contain",borderRadius:8}}/>
            <div style={{fontSize:17,fontWeight:800,letterSpacing:-.3,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)"}}>.info</span></div>
          </div>
          <div style={{display:"flex",gap:24,fontSize:13,color:"var(--cl)",flexWrap:"wrap"}}>
            <button onClick={openImpressum} style={{...navLink,fontSize:13}}>{l.imp}</button>
            <button onClick={openDatenschutz} style={{...navLink,fontSize:13}}>{l.dse}</button>
          </div>
        </div>
        <div style={{paddingTop:18,borderTop:"1px solid var(--cb)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,fontSize:11,color:"var(--ch)"}}>
          <div>{l.footerCr}</div>
          <div style={{maxWidth:600,lineHeight:1.6,opacity:.85}}>{l.footerNote}</div>
        </div>
      </div>
    </footer>

    {/* Responsive nav styles */}
    <style>{`
      .calc-hero-card{grid-template-columns:1fr!important}
      @media(min-width:640px){.calc-hero-card{grid-template-columns:1fr 1fr!important}}
      .calc-hero-card>div:first-child{min-height:200px}
      @media(min-width:640px){.calc-hero-card>div:first-child{min-height:0;height:100%}}
      .calc-cards-support{display:grid;grid-template-columns:1fr;gap:12px}
      .calc-cards-support>*{width:100%;min-width:0;box-sizing:border-box}
      @media(min-width:640px){.calc-cards-support{grid-template-columns:repeat(3,1fr)}}
      @media(min-width:900px){.calc-cards-support{grid-template-columns:repeat(5,1fr)}}
      @media(max-width:880px){
        .lp-nav{display:none!important}
        .lp-burger{display:inline-flex!important}
      }
      @media(min-width:881px){
        .lp-nav-mobile{display:none!important}
      }
      @media(max-width:560px){
        .lp-cta{display:none!important}
      }
    `}</style>
  </div>;
}

// Helper styles for nav links (used in Landing component)
const navLink={background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:"var(--cl)",padding:"6px 0",letterSpacing:.1,transition:"color .15s"};
const navLinkMobile={...navLink,padding:"12px 4px",fontSize:15,textAlign:"left",borderBottom:"1px solid var(--cb)"};


// ═══════════ LEGAL MODAL (Datenschutz / Impressum) ═══════════
function LegalModal({type,onClose}){
  if(!type)return null;
  const content=type==="impressum"?{
    title:"Impressum",
    sub:"Anbieterkennzeichnung nach § 5 TMG",
    body:<>
      <h3 style={lmH3}>Angaben zum Betreiber</h3>
      <div style={{background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:10,padding:"16px 20px",margin:"12px 0",fontSize:13,lineHeight:1.8}}>
        <strong>Engin Celenk</strong><br/>
        Kontakt per E-Mail: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a>
      </div>
      <div style={{background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#7a3800",margin:"16px 0"}}>
        ℹ️ Diese Website stellt kostenlose Rechner-Tools für private Nutzung bereit. Es werden keine Produkte oder Dienstleistungen verkauft. Es besteht kein Handelsgewerbe.
      </div>
      <h3 style={lmH3}>Verantwortlich i. S. d. § 18 Abs. 2 MStV</h3>
      <p style={lmP}>Der Websitebetreiber (Kontaktadresse wie oben).</p>
      <h3 style={lmH3}>Haftung für Inhalte</h3>
      <p style={lmP}>Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
      <p style={lmP}>Die Berechnungen auf dieser Website dienen ausschließlich der Orientierung und ersetzen keine professionelle Rechts-, Steuer- oder Finanzberatung. Für die Richtigkeit der Ergebnisse wird keine Gewähr übernommen.</p>
      <h3 style={lmH3}>Haftung für Links</h3>
      <p style={lmP}>Diese Website enthält keine bezahlten Affiliate-Links und keine Werbung. Sollten externe Links vorhanden sein, haben wir auf deren Inhalte keinen Einfluss. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.</p>
      <h3 style={lmH3}>Urheberrecht</h3>
      <p style={lmP}>Die erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Rechner dürfen frei genutzt, jedoch nicht ohne Erlaubnis kopiert oder kommerziell verwertet werden.</p>
      <h3 style={lmH3}>Verbraucherstreitbeilegung</h3>
      <p style={lmP}>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={lmA}>https://ec.europa.eu/consumers/odr</a>. Ich bin weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, da kein Verbrauchervertrag besteht.</p>
    </>
  }:{
    title:"Datenschutzerklärung",
    sub:null,
    body:<>
      <div style={{background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#7a3800",margin:"16px 0"}}>
        <strong>Kurz &amp; klar:</strong> immofuchs.info verzichtet vollständig auf Tracking, Analytics, Werbung und Affiliate-Links. Alle Berechnungen laufen ausschließlich lokal in Ihrem Browser. Es werden keine personenbezogenen Daten an Server übertragen.
      </div>
      <h3 style={lmH3}>1. Verantwortliche Stelle</h3>
      <p style={lmP}>Engin Celenk.<br/>Kontakt: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a></p>
      <h3 style={lmH3}>2. Datenverarbeitung auf einen Blick</h3>
      <p style={lmP}>Immofuchs ist eine rein clientseitige Webanwendung. Alle Berechnungen finden ausschließlich in Ihrem Browser statt. Es werden <strong>keine personenbezogenen Daten an Server übertragen</strong>.</p>
      <h3 style={lmH3}>3. Lokale Datenspeicherung (localStorage)</h3>
      <p style={lmP}>Ihre Eingaben (Kaufpreis, Zinssatz, etc.) werden im localStorage Ihres Browsers gespeichert, damit Sie beim nächsten Besuch fortfahren können. Diese Daten:</p>
      <ul style={lmUl}><li>verlassen niemals Ihren Browser</li><li>sind nur für Sie zugänglich</li><li>können jederzeit über die Browser-Einstellungen gelöscht werden</li></ul>
      <h3 style={lmH3}>4. Cookies</h3>
      <p style={lmP}>Immofuchs setzt <strong>keine Tracking-Cookies</strong>. Es wird lediglich localStorage verwendet (technisch notwendig).</p>
      <h3 style={lmH3}>5. Hosting &amp; Server-Logs</h3>
      <p style={lmP}>Die Website wird bei einem Hosting-Anbieter betrieben. Beim Abrufen der Seiten werden durch den Hosting-Anbieter automatisch technische Zugriffsdaten in Server-Log-Dateien gespeichert (Browsertyp, Betriebssystem, Referrer-URL, Datum/Uhrzeit, IP-Adresse). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
      <h3 style={lmH3}>6. Externe Dienste</h3>
      <p style={lmP}>Zur Darstellung der Website werden Schriftarten von Google Fonts (DM Sans) geladen. Dabei kann die IP-Adresse an Google übertragen werden.</p>
      <p style={lmP}>Optional werden tagesaktuelle Bauzinsen von einer öffentlichen JSON-Datei geladen (GitHub Pages). Diese Datei enthält keine personenbezogenen Daten; beim Abruf wird Ihre IP-Adresse an GitHub übertragen.</p>
      <p style={lmP}>Es werden <strong>keine</strong> weiteren externen Dienste eingebunden — kein Google Analytics, keine Werbung, kein Facebook Pixel, keine Affiliate-Links.</p>
      <h3 style={lmH3}>7. Ihre Rechte (DSGVO)</h3>
      <p style={lmP}>Sie haben das Recht auf:</p>
      <ul style={lmUl}>
        <li>Auskunft über verarbeitete Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO) — Löschen Sie Ihre Browser-Daten</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>
      <p style={lmP}>Für Anfragen: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a></p>
      <h3 style={lmH3}>8. SSL-/TLS-Verschlüsselung</h3>
      <p style={lmP}>Diese Seite nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung.</p>
    </>
  };
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,animation:"lmFade .2s ease"}}>
    <style>{`@keyframes lmFade{from{opacity:0}to{opacity:1}}@keyframes lmSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--cc)",borderRadius:14,maxWidth:720,width:"100%",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"lmSlide .25s ease",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid var(--cb)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:"var(--ca)",margin:0}}>{content.title}</h2>
          <p style={{fontSize:12,color:"var(--ch)",margin:"4px 0 0"}}>{content.sub}</p>
        </div>
        <button onClick={onClose} aria-label="Schließen" style={{background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:8,width:34,height:34,fontSize:18,cursor:"pointer",color:"var(--ch)",display:"flex",alignItems:"center",justifyContent:"center",padding:0,fontFamily:"inherit"}}>×</button>
      </div>
      <div style={{padding:"20px 24px",overflow:"auto",flex:1,fontSize:13,color:"var(--cl)",lineHeight:1.7}}>
        {content.body}
      </div>
      <div style={{padding:"14px 24px",borderTop:"1px solid var(--cb)",background:"var(--ci)",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--ch)",flexShrink:0,flexWrap:"wrap",gap:8}}>
        <span>© 2026 immofuchs.info · Engin Celenk</span>
        <button onClick={onClose} style={{background:"var(--ca)",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Schließen</button>
      </div>
    </div>
  </div>;
}
const lmH3={fontSize:14,fontWeight:700,color:"var(--ct)",marginTop:20,marginBottom:8};
const lmP={fontSize:13,color:"var(--cl)",marginBottom:8,lineHeight:1.7};
const lmUl={paddingLeft:20,marginBottom:8,fontSize:13,color:"var(--cl)",lineHeight:1.8};
const lmA={color:"var(--ca)",textDecoration:"none"};



// ── Statusleiste ─────────────────────────────────────────────────────────────
const Statusleiste=()=>{const {t}=useApp();
  const now=new Date();
  const monat=now.toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  return <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:8,fontSize:12,color:"var(--ch)",marginBottom:14}}>
    <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0}}/>
    <span>{t.datastand}: {monat}</span>
  </div>;
};

// ═══════════ GESPEICHERTE OBJEKTE ═══════════

function useSavedObjects(setData){
  const[savedList,setSavedList]=useState(()=>{try{return JSON.parse(localStorage.getItem('if_saved_v1')||'[]');}catch{return[];}});
  const saveObj=useCallback((name,data,tab)=>{
    const obj={id:Date.now().toString(),name:name.trim()||'Objekt',date:new Date().toLocaleDateString('de-DE'),tab,data:{...data}};
    setSavedList(prev=>{const next=[obj,...prev].slice(0,50);localStorage.setItem('if_saved_v1',JSON.stringify(next));return next;});
  },[]);
  const delObj=useCallback((id)=>{
    setSavedList(prev=>{const next=prev.filter(o=>o.id!==id);localStorage.setItem('if_saved_v1',JSON.stringify(next));return next;});
  },[]);
  const loadObj=useCallback((obj,setTab)=>{setData(obj.data);setTab(obj.tab);},[setData]);
  return{savedList,saveObj,delObj,loadObj};
}

function SaveModal({onClose,onSave,defaultName,lang}){
  const t=T[lang]||T.de;
  const[name,setName]=useState(defaultName||'');
  const inp=useRef(null);
  useEffect(()=>{setTimeout(()=>inp.current?.focus(),100);},[]);
  return createPortal(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--cc)',borderRadius:'16px 16px 0 0',padding:'24px 20px 36px',width:'100%',maxWidth:480}}>
        <div style={{width:40,height:4,background:'var(--cb)',borderRadius:2,margin:'0 auto 20px'}}/>
        <div style={{fontSize:17,fontWeight:700,marginBottom:16,color:'var(--ct)'}}>{t.saveModalTitle||'Objekt speichern'}</div>
        <input ref={inp} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&name.trim())onSave(name);}}
          placeholder={t.savePlaceholder||'z. B. Wohnung München · 2. OG'}
          style={{width:'100%',height:42,padding:'0 12px',borderRadius:12,border:'1.5px solid var(--cb)',background:'var(--ci)',fontSize:16,color:'var(--ct)',boxSizing:'border-box',outline:'none',marginBottom:12}}/>
        <button disabled={!name.trim()} onClick={()=>name.trim()&&onSave(name)}
          style={{width:'100%',height:48,borderRadius:12,border:'none',background:name.trim()?'var(--ca)':'var(--cb)',color:name.trim()?'#fff':'var(--ch)',fontSize:16,fontWeight:700,cursor:name.trim()?'pointer':'default',transition:'background .15s'}}>
          {t.saveConfirm||'Speichern'}
        </button>
      </div>
    </div>,document.body
  );
}

function SaveBtn({tab}){
  const{d,saveObj,lang}=useApp();const t=T[lang]||T.de;const locale=LANG_LOCALE[lang]||'de-DE';
  const[open,setOpen]=useState(false);
  const hasData=d.kaufpreis||d.vergleichsmiete;
  if(!hasData)return null;
  const defaultName=d.ort?`${d.ort}${d.kaufpreis?` · ${Number(d.kaufpreis).toLocaleString('de-DE')} €`:''}`:'' ;
  return(
    <>
      <button className="no-print" onClick={()=>setOpen(true)} style={{width:'100%',padding:'12px',borderRadius:12,border:'1.5px solid var(--ca)',background:'transparent',color:'var(--ca)',fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:8,boxSizing:'border-box'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        {t.saveBtnLabel||'Speichern'}
      </button>
      {open&&<SaveModal lang={lang} defaultName={defaultName} onClose={()=>setOpen(false)} onSave={(name)=>{saveObj(name,d,tab);setOpen(false);}}/>}
    </>
  );
}

function Merkliste(){
  const{savedList,delObj,loadObj,setTabExt,lang}=useApp();const t=T[lang]||T.de;const locale=LANG_LOCALE[lang]||'de-DE';
  const[confirmDel,setConfirmDel]=useState(null);
  const tabLabel={haupt:t.haupt||'Rendite',kredit:t.kredit||'Kredit',miete:t.miete||'Miete',sanier:t.sanier||'Sanierung'};
  const tabColor={haupt:'#1E3A5F',kredit:'#0a7ea4',miete:'#2d8a4e',sanier:'#8a5a0a'};
  const fmt=v=>v?Number(v).toLocaleString(locale):null;
  if(!savedList.length)return(
    <div style={{padding:'60px 20px',textAlign:'center'}}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ch)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:16,display:'block',margin:'0 auto 16px'}}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
      <div style={{fontSize:16,fontWeight:700,color:'var(--ct)',marginBottom:8}}>{t.emptyTitle||'Noch keine Objekte gespeichert'}</div>
      <div style={{fontSize:14,color:'var(--ch)',lineHeight:1.5}}>{t.emptyHint||'Berechne ein Objekt und tippe auf „Speichern", um es hier zu sichern.'}</div>
    </div>
  );
  return(
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{fontSize:13,color:'var(--ch)',marginBottom:12,fontWeight:500}}>{savedList.length} {savedList.length===1?(t.countSingular||'Objekt gespeichert'):(t.countPlural||'Objekte gespeichert')}</div>
      {savedList.map(obj=>{
        const kp=fmt(obj.data.kaufpreis);
        const miete=fmt(obj.data.kaltmiete);
        const ek=fmt(obj.data.eigenkapital);
        return(
          <div key={obj.id} style={{background:'var(--cc)',borderRadius:12,padding:'16px',marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15,color:'var(--ct)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{obj.name}</div>
                <div style={{fontSize:12,color:'var(--ch)',marginTop:2}}>{obj.date}</div>
              </div>
              <span style={{background:tabColor[obj.tab]||'#888',color:'#fff',fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,marginLeft:10,whiteSpace:'nowrap',flexShrink:0}}>{tabLabel[obj.tab]||obj.tab}</span>
            </div>
            {(kp||miete||ek)&&(
              <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12,fontSize:13}}>
                {kp&&<span><span style={{color:'var(--ch)'}}>{t.kaufpreis||'Kaufpreis'} </span><span style={{fontWeight:600,color:'var(--ct)'}}>{kp} €</span></span>}
                {miete&&<span><span style={{color:'var(--ch)'}}>{t.kaltmiete||'Miete'} </span><span style={{fontWeight:600,color:'var(--ct)'}}>{miete} €/Mo.</span></span>}
                {ek&&<span><span style={{color:'var(--ch)'}}>{t.eigenkapital||'EK'} </span><span style={{fontWeight:600,color:'var(--ct)'}}>{ek} €</span></span>}
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>loadObj(obj,setTabExt)} style={{flex:1,height:38,borderRadius:10,border:'1.5px solid var(--ca)',background:'transparent',color:'var(--ca)',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                {t.loadBtn||'↩ Laden'}
              </button>
              <button onClick={()=>setConfirmDel(obj.id)} style={{height:38,width:38,borderRadius:10,border:'1.5px solid var(--cb)',background:'transparent',color:'var(--ch)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                ✕
              </button>
            </div>
          </div>
        );
      })}
      {confirmDel&&createPortal(
        <div onClick={()=>setConfirmDel(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9001,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--cc)',borderRadius:16,padding:'24px 20px',width:'100%',maxWidth:360,textAlign:'center'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--ct)',marginBottom:8}}>{t.deleteTitle||'Objekt löschen?'}</div>
            <div style={{fontSize:14,color:'var(--ch)',marginBottom:20}}>{t.deleteHint||'Diese Berechnung wird unwiderruflich gelöscht.'}</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,height:44,borderRadius:12,border:'1.5px solid var(--cb)',background:'transparent',color:'var(--ct)',fontSize:15,cursor:'pointer'}}>{t.cancelBtn||'Abbrechen'}</button>
              <button onClick={()=>{delObj(confirmDel);setConfirmDel(null);}} style={{flex:1,height:44,borderRadius:12,border:'none',background:'#dc2626',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer'}}>{t.deleteBtn||'Löschen'}</button>
            </div>
          </div>
        </div>,document.body
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════


// ═══════════ ZINSALARM HELPERS ═══════════
function showAlarmNotification(avg, threshold, lang) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const l = TL[lang] || TL.de;
  const body = (l.notifBody || 'Zinsen bei {avg}% – unter {threshold}%')
    .replace('{avg}', avg).replace('{threshold}', threshold);
  try {
    new Notification(l.notifTitle || 'ImmoFuchs Zinsalarm', {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'zinsalarm',
      renotify: true,
    });
  } catch(e) { console.warn('[alarm] Notification failed:', e); }
}

// ═══════════ ZINSALARM COMPONENT ═══════════
function ZinsAlarm({ zinsen, lang }) {
  const l = TL[lang] || TL.de;
  const avg = zinsen?.avg ?? null;

  const [threshold, setThreshold] = useState(() => {
    try { return parseFloat(localStorage.getItem('if_alarm_threshold') || '3.5'); }
    catch { return 3.5; }
  });
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('if_alarm_enabled') === '1'; }
    catch { return false; }
  });
  const [permission, setPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [saved, setSaved] = useState(false);

  const triggered = enabled && avg !== null && avg <= threshold;

  function persistAlarm(en, th) {
    localStorage.setItem('if_alarm_enabled', en ? '1' : '0');
    localStorage.setItem('if_alarm_threshold', String(th));
    // Inform SW
    try {
      navigator.serviceWorker?.controller?.postMessage({
        type: 'SET_ALARM', enabled: en, threshold: th,
        avg, lang,
        notifTitle: l.notifTitle || 'ImmoFuchs Zinsalarm',
        notifBody: (l.notifBody || 'Zinsen bei {avg}% – unter {threshold}%')
          .replace('{avg}', avg).replace('{threshold}', th),
      });
    } catch(e) {}
  }

  async function handleToggle() {
    let perm = permission;
    if (!enabled && perm !== 'granted') {
      if (!('Notification' in window)) return;
      perm = await Notification.requestPermission();
      setPermission(perm);
    }
    if (!enabled && perm !== 'granted') return;
    const next = !enabled;
    setEnabled(next);
    persistAlarm(next, threshold);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Check on zinsen load
  useEffect(() => {
    if (!enabled || avg === null || permission !== 'granted') return;
    if (avg <= threshold) showAlarmNotification(avg, threshold, lang);
  }, [avg]);

  const card = {
    marginTop: 20,
    padding: '18px 20px',
    background: 'var(--cc)',
    border: '1px solid var(--cb)',
    borderRadius: 12,
  };
  const btnStyle = (active) => ({
    background: active ? 'var(--ca)' : 'var(--ca-bg)',
    color: active ? '#fff' : 'var(--ca)',
    border: '1px solid var(--ca-bd)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .2s, color .2s',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ct)' }}>{l.alarmTitle}</div>
          <div style={{ fontSize: 12, color: 'var(--ch)', marginTop: 2 }}>{l.alarmSub}</div>
        </div>
        {triggered && (
          <span style={{
            background: 'var(--ca-bg)', color: 'var(--ca)',
            border: '1px solid var(--ca-bd)', borderRadius: 8,
            padding: '3px 10px', fontSize: 12, fontWeight: 700,
          }}>
            🔔 {l.alarmTriggered}
          </span>
        )}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--cl)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {l.alarmThreshold}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            step="0.05"
            min="1"
            max="8"
            value={threshold}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) { setThreshold(v); if (enabled) persistAlarm(enabled, v); }
            }}
            style={{
              width: 76, height: 38,
              border: '1px solid var(--cb)', borderRadius: 8,
              padding: '0 10px', fontSize: 15,
              background: 'var(--ci)', color: 'var(--ct)',
              fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--ch)' }}>%</span>
        </div>

        {permission === 'denied'
          ? <span style={{ fontSize: 12, color: '#e74c3c', marginLeft: 'auto' }}>{l.alarmDenied}</span>
          : (
            <button style={{ ...btnStyle(enabled), marginLeft: 'auto' }} onClick={handleToggle}>
              {!enabled && permission !== 'granted'
                ? l.alarmPermission
                : enabled ? l.alarmBtnOff : l.alarmBtn}
            </button>
          )
        }

        {saved && <span style={{ fontSize: 12, color: '#27ae60' }}>{l.alarmSaved}</span>}
        {!saved && enabled && permission === 'granted' && (
          <span style={{ fontSize: 12, color: 'var(--ch)' }}>{l.alarmGranted}</span>
        )}
      </div>

      {/* Disclaimer */}
      <p style={{
        margin: '14px 0 0',
        fontSize: 11, color: 'var(--ch)', lineHeight: 1.6,
        borderTop: '1px solid var(--cb)', paddingTop: 12,
      }}>
        ℹ️ {l.alarmHint}
      </p>
    </div>
  );
}


// ── Offline-Banner ────────────────────────────────────────────────────────
function OfflineBanner({bottom}){
  const date=useMemo(()=>{
    try{const c=localStorage.getItem("if_zinsen_v3");if(c){const{ts}=JSON.parse(c);return new Date(ts).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});}}catch(e){}
    return null;
  },[]);
  return(
    <div style={{position:"fixed",left:0,right:0,bottom,zIndex:150,background:"#1E3A5F",color:"rgba(255,255,255,0.88)",padding:"7px 16px",textAlign:"center",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:6,letterSpacing:.2}}>
      <span>📴</span>
      <span>Offline · Alle Rechner funktionieren{date?` · Daten vom ${date}`:""}</span>
    </div>
  );
}

const TAB_LABELS={haupt:"Renditerechner",kredit:"Finanzierungsrechner",miete:"Mieterhöhungsrechner",sanier:"Sanierungsrechner",steuer6:"Steuerrechner",saved:"Merkliste"};
export default function App(){const[tab,setTab]=useState("haupt");const[lang,setLang]=useState("de");
  const[landed,setLanded]=useState(()=>sessionStorage.getItem("if_landed")==="1");
  const[zinsen,setZinsen]=useState(null); // holds the raw zinsen.json config (with live BBK)
  const[isOnline,setIsOnline]=useState(()=>typeof navigator!=="undefined"?navigator.onLine:true);
  useEffect(()=>{const up=()=>setIsOnline(true);const dn=()=>setIsOnline(false);window.addEventListener("online",up);window.addEventListener("offline",dn);return()=>{window.removeEventListener("online",up);window.removeEventListener("offline",dn);};},[]);
  useEffect(()=>{if(typeof window.gtag==='function'){window.gtag('event','tab_view',{tab_id:tab,tab_name:TAB_LABELS[tab]||tab});}},[tab]);
  const[legalModal,setLegalModal]=useState(null);
  const zinssatzTouchedRef=useRef(false); // true once user manually edits the field

  // ── Zinsen laden: zinsen.json (lokal, kein Bundesbank-API-Call wegen CORS) ──
  useEffect(()=>{
    async function loadZinsen(){
      // 1. Cache check (max 60 Minuten)
      try{
        const cached=localStorage.getItem("if_zinsen_v3");
        if(cached){
          const{ts,data}=JSON.parse(cached);
          if(Date.now()-ts < 60*60*1000){setZinsen(data);return;}
        }
      }catch(e){}

      // 2. zinsen.json von eigenem Server laden (Bundesbank-API entfällt wegen CORS)
      let config=null;
      try{
        const res=await fetch("/zinsen.json");
        if(res.ok) config=await res.json();
      }catch(e){console.warn("[zinsen] zinsen.json nicht geladen:",e);}
      if(!config){setZinsen(null);return;}

      // 3. Durchschnitt berechnen (nur positive Werte, auto=false ignoriert Bundesbank-Platzhalter)
      const werte=config.quellen.map(q=>q.wert).filter(v=>v>0);
      const avg=werte.reduce((a,b)=>a+b,0)/werte.length;
      config.avg=Math.round(avg*20)/20; // auf 0.05 runden
      config.top=Math.min(...werte);    // bester (niedrigster) Wert

      setZinsen(config);
      try{localStorage.setItem("if_zinsen_v3",JSON.stringify({ts:Date.now(),data:config}));}catch(e){}
    }
    loadZinsen();
  },[]);

  // ── Wenn Live-Durchschnitt kommt und User hat nichts getippt → Default setzen ──
  useEffect(()=>{
    if(zinssatzTouchedRef.current) return;
    if(zinsen?.avg){
      const live=String(zinsen.avg);
      setData(p=>({...p,zinssatz:live}));
    }
  },[zinsen]);

  const[data,setData]=useState({bundesland:"BW",plz:"70173",ort:"Stuttgart",kaufpreis:"300000",flaeche:"60",kaltmiete:"900",eigenkapital:"60000",zinssatz:String(MARKET_RATES.avg),tilgung:"1",zinsbindung:"10",notar:"2.0",makler:"3.57",steuersatz:"30",afaSatz:"2",grundAnteil:"20",gebAnteil:"80",wertP:"2",jahre:"10",sonder:"3000",renovierung:"15000",nichtUml:"100",leerstand:"2",vergleichsmiete:"14",letzteErhDatum:new Date(new Date().getFullYear(),new Date().getMonth()+4,1).toISOString().split("T")[0],letzteErhMiete:"0",mietJahre:"10",sanFl:"60",baujahr:"1981",sanHt:"heizoel",sanHa:"alt",sanPe:"3",sanIsfp:false,garage:"20000",mieteQm:"15",vermietet:"ja",immLeer:"nein"});
  const set=useCallback((k,v)=>{
    if(k==="zinssatz") zinssatzTouchedRef.current=true;
    setData(p=>({...p,[k]:v}));
  },[]);
  const{savedList,saveObj,delObj,loadObj}=useSavedObjects(setData);
  const t=T[lang];
  const tabs=[{id:"haupt",l:t.haupt,ic:IC.haupt},{id:"kredit",l:t.kredit,ic:IC.kredit},{id:"miete",l:t.miete,ic:IC.miete},{id:"sanier",l:t.sanier,ic:IC.sanier},{id:"steuer6",l:t.steuer6,ic:IC.steuer6},{id:"vfe",l:t.vfe,ic:IC.vfe},{id:"saved",l:t.merkliste,ic:IC.saved}];

  const startApp=(startTab)=>{if(startTab&&tabs.find(x=>x.id===startTab))setTab(startTab);sessionStorage.setItem("if_landed","1");setLanded(true);window.scrollTo({top:0,behavior:"instant"});};
  if(!landed)return <><style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');:root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100%;overscroll-behavior-x:none;touch-action:pan-y}*{box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased;position:relative}section,footer,header{min-width:0;max-width:100%}`}</style><Landing onStart={startApp} zinsen={zinsen} lang={lang} setLang={setLang} openDatenschutz={()=>setLegalModal("datenschutz")} openImpressum={()=>setLegalModal("impressum")}/><LegalModal type={legalModal} onClose={()=>setLegalModal(null)}/>{!isOnline&&<OfflineBanner bottom={"calc(16px + env(safe-area-inset-bottom))"}/>}</>;

  return <Ctx.Provider value={{d:data,set,t,lang,zinsen,tip:k=>(TIPS[lang]||TIPS.de)[k],savedList,saveObj,delObj,loadObj,setTabExt:(id)=>{setTab(id);setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50);}}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      :root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--cro:#f0f0ea;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}
      html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100%;-webkit-text-size-adjust:100%}body{position:relative}
      *{box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased}
      input,select,button,textarea{font-family:inherit;font-size:16px}
      input[type="number"]::-webkit-inner-spin-button{opacity:.3}
      .shell{max-width:1400px;margin:0 auto;padding:calc(78px + env(safe-area-inset-top)) 0 calc(72px + env(safe-area-inset-bottom));min-height:100dvh;overflow-x:hidden;position:relative;width:100%}
      .hdr{position:fixed;top:0;left:0;right:0;z-index:50;padding:10px 16px;background:rgba(245,245,240,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--cb);display:flex;justify-content:space-between;align-items:center;height:78px;padding-top:calc(10px + env(safe-area-inset-top))}
      .hdr{height:calc(78px + env(safe-area-inset-top))}
      .hdr-inner{max-width:1400px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;width:100%}
      .tbar{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--cc);border-top:1px solid var(--cb);padding:6px 0 calc(6px + env(safe-area-inset-bottom));display:flex;justify-content:center}
      .tbtn{flex:1;max-width:110px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border:none;background:none;cursor:pointer;min-height:48px}
      .tbtn span{font-size:11px;font-weight:600;letter-spacing:.3px}
      .content{padding:14px 14px;max-width:1400px;margin:0 auto;width:100%;overflow-x:hidden}
      .ls{font-size:14px;padding:8px 10px;border:1px solid var(--cb);border-radius:8px;background:var(--ci);color:var(--ct);cursor:pointer;font-family:inherit;min-height:38px}
      /* MOBILE-FIRST DEFAULTS — apply to all viewports < 700px */
      .if-row{display:grid;grid-template-columns:1fr;gap:0}
      .if-row > *{margin-bottom:14px}
      .mob-toggle{display:flex;background:var(--cc);border:1px solid var(--cb);border-radius:12px;padding:4px;margin-bottom:14px;gap:4px}
      .mob-toggle button{flex:1;padding:11px 12px;font-size:15px;font-weight:600;border:none;border-radius:9px;background:transparent;color:var(--cl);cursor:pointer;font-family:inherit;min-height:44px}
      .mob-toggle button.act{background:var(--ca);color:#fff}
      .mob-next-btn{display:none;width:100%;padding:14px;font-size:16px;font-weight:700;background:var(--ca);color:#fff;border:none;border-radius:12px;cursor:pointer;font-family:inherit;margin-top:16px;letter-spacing:.3px}
      .hdr-tag{display:none}
      /* TABLET / DESKTOP — overrides */
      @media(min-width:760px){
        .hdr-tag{display:block!important}
      }
      /* TABLET / DESKTOP — overrides */
      @media(min-width:700px){
        .mob-toggle{display:none!important}
        .if-row{grid-template-columns:1fr 1fr;gap:12px}
        .if-row > *{margin-bottom:14px}
        .split{display:grid;grid-template-columns:1fr 1.15fr;gap:24px;align-items:start}
        .inp-pane,.res-pane{display:block!important}
        .res-pane{position:sticky;top:94px;max-width:100%;overflow-x:hidden}
        .content{padding:24px 28px}
        .tbar{max-width:640px;margin:0 auto;left:0;right:0;border-radius:16px 16px 0 0;box-shadow:0 -2px 12px rgba(0,0,0,.05)}
      }
      @media(min-width:1100px){
        .split{grid-template-columns:1fr 1.25fr;gap:32px}
        .content{padding:28px 40px}
      }
      @media(max-width:699px){
        .inp-pane,.res-pane{display:none}
        .inp-pane.act,.res-pane.act{display:block}
        .mob-next-btn{display:block}
      }
      @media print{
        .tbar,.hdr,.mob-toggle,.inp-pane,.no-print{display:none!important}
        .res-pane{display:block!important}
        .split{display:block!important}
        .shell{padding:0;max-width:100%}
        .content{padding:10px}
        body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        svg{max-width:100%}
      }`}
    </style>
    <div className="shell" dir="ltr">
      <div className="hdr">
        <div className="hdr-inner">
          <button onClick={()=>{sessionStorage.removeItem("if_landed");setLanded(false);setTimeout(()=>window.scrollTo({top:0,behavior:"instant"}),0)}} title="Zur Startseite" style={{display:"flex",alignItems:"center",gap:14,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
            <img src="/icon-192.png" alt="Immofuchs" style={{width:54,height:54,objectFit:"contain",flexShrink:0}}/>
            <div style={{fontSize:24,fontWeight:800,letterSpacing:-.5,lineHeight:1,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)",fontWeight:700}}>.info</span></div>
          </button>
          <LangSel lang={lang} setLang={setLang}/>
        </div>
      </div>
      <div className="content">
        <Statusleiste/>
        {tab==="haupt"&&<Haupt/>}{tab==="kredit"&&<Kredit/>}{tab==="miete"&&<Miete/>}{tab==="sanier"&&<Sanier/>}{tab==="steuer6"&&<SteuerTrick/>}{tab==="vfe"&&<Vorfaelligkeit/>}{tab==="saved"&&<Merkliste/>}
        <div style={{marginTop:32,paddingTop:18,borderTop:"1px solid var(--cb)",fontSize:10,color:"var(--ch)",textAlign:"center",display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
          <button onClick={()=>{sessionStorage.removeItem("if_landed");setLanded(false);setTimeout(()=>window.scrollTo({top:0,behavior:"instant"}),0)}} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>← Startseite</button>
          <span style={{opacity:.4}}>·</span>
          <button onClick={()=>setLegalModal("impressum")} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>Impressum</button>
          <span style={{opacity:.4}}>·</span>
          <button onClick={()=>setLegalModal("datenschutz")} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>Datenschutz</button>
        </div>
      </div>
      <div className="tbar">{tabs.map(tb=><button key={tb.id} className="tbtn" onClick={()=>{setTab(tb.id);window.scrollTo({top:0,behavior:"smooth"});}}>{tb.ic(tab===tb.id)}<span style={{color:tab===tb.id?"var(--ca)":"var(--ch)"}}>{tb.l}</span></button>)}</div>
      <div className="tbar">{tabs.map(tb=><button key={tb.id} className="tbtn" onClick={()=>{setTab(tb.id);window.scrollTo({top:0,behavior:"smooth"});}}>{tb.ic(tab===tb.id)}<span style={{color:tab===tb.id?"var(--ca)":"var(--ch)"}}>{tb.l}</span></button>)}</div>
    </div>
    <LegalModal type={legalModal} onClose={()=>setLegalModal(null)}/>
    {!isOnline&&<OfflineBanner bottom={"calc(72px + env(safe-area-inset-bottom))"}/>}
  </Ctx.Provider>;
}
