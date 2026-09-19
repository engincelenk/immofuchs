#!/usr/bin/env python3
"""
Liest aus den ImmoScout24-Datenblaettern (PDF je Bundesland) alles, was
src/immodata/<Jahr>/datenblatter/immodaten.json bisher nicht hatte, und
schreibt es dort in den Block "landeswerte" des jeweiligen Landes:

  - Haus-Trend seit Q2 2022, Gesamt-Durchschnitt Kauf (sofern im PDF)
  - Spannen Kauf (Wohnung, Haus) und Miete (Wohnung, Haus), min/max
  - "verlauf": Kaufpreis-Quartalswerte Q2 2022 bis Q2 2026 (17 je Wohnung und
    Haus), aus dem Liniendiagramm rekonstruiert.

Das Diagramm ist im PDF Vektorgrafik ohne Achsenbeschriftung. Beide Linien
teilen eine y-Achse. Aus den vier Textwerten (Preis Q2 2022 und Q2 2026 je
Wohnung und Haus, FAQ-Absatz) wird eine lineare Abbildung y -> Preis
angepasst und gegen zwei weitere Werte geprueft (Q2 2025 = Q2 2026 / (1 +
Vorjahresveraenderung)). Passt eine Pruefung nicht (mehr als 1 %), gibt es
fuer dieses Land keinen Verlauf. Das faengt auch PDFs ab, in denen statt des
Kaufpreis- das Mietpreis-Diagramm gerendert wurde (Bayern, Berlin, Stand
2026-09): dort steigen beide Linien, die Abbildung waere sinnlos.

Fuer solche Laender gibt es eine gekennzeichnete NAEHERUNG (NACHBAR unten):
die Form kommt vom Nachbarland, Start und Ende sind die echten Preise aus
dem FAQ-Text, im JSON steht "naeherungNach". Liegt spaeter ein echter
Verlauf vor, ersetzt das Skript die Naeherung. Das Skript ist wiederholbar.

Das Diagramm endet im PDF bei Q2 2026 - die gruen hinterlegte Prognose-Zone
rechts davon ist leer. Prognosewerte gibt es in den Datenblaettern nicht.

Aufruf (aus dem Repo-Wurzelverzeichnis):
  pip install pymupdf
  python scripts/extract_datenblatt_zusatz.py             # nur anzeigen
  python scripts/extract_datenblatt_zusatz.py --schreiben # in immodaten.json

Danach: node scripts/build_regionalpreise.mjs
Bewusst nicht in scripts/requirements.txt - nur fuer die manuelle Pflege.
"""

import json
import os
import re
import sys

import pymupdf

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(REPO_ROOT, "src", "immodata", "2026", "Q2")
JSON_PFAD = os.path.join(REPO_ROOT, "src", "immodata", "2026", "datenblatter", "immodaten.json")

NAMEN = {
    "BW": "Baden-Württemberg", "BY": "Bayern", "BE": "Berlin", "BB": "Brandenburg",
    "HB": "Bremen", "HH": "Hamburg", "HE": "Hessen", "MV": "Mecklenburg-Vorpommern",
    "NI": "Niedersachsen", "NW": "Nordrhein-Westfalen", "RP": "Rheinland-Pfalz",
    "SL": "Saarland", "ST": "Sachsen-Anhalt", "SN": "Sachsen",
    "SH": "Schleswig-Holstein", "TH": "Thüringen",
}
QUARTALE = 17                    # Q2 2022 .. Q2 2026
IDX_Q2_2025 = 12
GRUEN = (0.0, 0.851, 0.6941)     # Wohnungen
GRAU = (0.4039, 0.4039, 0.4039)  # Haeuser
TOLERANZ = 0.01                  # 1 % Abweichung bei Anker und Probe


def zahl(s):
    """'3.482' -> 3482, '10,87' -> 10.87"""
    s = s.strip()
    if "," in s:
        return float(s.replace(".", "").replace(",", "."))
    return int(s.replace(".", ""))


def farbe_gleich(a, b):
    return a is not None and all(abs(x - y) < 0.01 for x, y in zip(a, b))


def lade_pdf(code):
    doc = pymupdf.open(os.path.join(PDF_DIR, f"Immobilienpreise {NAMEN[code]}.pdf"))
    text = re.sub(r"\s+", " ", " ".join(seite.get_text() for seite in doc))
    return doc, text


def suche(text, muster, name):
    m = re.search(muster, text)
    if not m:
        raise ValueError(f"nicht gefunden: {name}")
    return m.groups()


def lies_texte(text):
    out = {}
    # Kopfkarte mit Gesamt-Durchschnitt: in Bayern/Berlin zeigt sie die Miete
    # (Komma-Zahl), dann passt das Muster nicht und das Feld bleibt weg.
    m = re.search(r"Ø\s*([\d.]+)\s*€/m²\s*durchschnittlicher Preis", text)
    out["kaufAlleAvg"] = zahl(m.group(1)) if m else None

    a, b, c = suche(
        text,
        r"Häuser: Der durchschnittliche Kaufpreis liegt in .*? bei ([\d.]+) €/m²\."
        r".*?momentan ([\d.]+) €/m² zahlen.*?niedrigste Quadratmeterpreis liegt hier bei ([\d.]+) €/m²",
        "Kauf Haus",
    )
    out["kaufHausAvg"], out["kaufHausMax"], out["kaufHausMin"] = zahl(a), zahl(b), zahl(c)

    a, b, c = suche(
        text,
        r"Wohnungen: In .*? liegt der Quadratmeterpreis für eine Wohnung bei durchschnittlich ([\d.]+) €/m²\."
        r".*?bis zu ([\d.]+) €/m² erzielen.*?günstigsten Wohnungen bei ([\d.]+) €/m²",
        "Kauf Wohnung",
    )
    out["kaufWohnungAvg"], out["kaufWohnungMax"], out["kaufWohnungMin"] = zahl(a), zahl(b), zahl(c)

    a, b, c = suche(
        text,
        r"Häuser: Der durchschnittliche Preis in .*? liegt bei ([\d.,]+) €/m²\."
        r".*?niedrigsten Mietpreis von ([\d.,]+) €/m² bis zum höchsten Quadratmeterpreis von ([\d.,]+) €/m²",
        "Miete Haus",
    )
    out["mieteHausAvg"], out["mieteHausMin"], out["mieteHausMax"] = zahl(a), zahl(b), zahl(c)

    a, b, c = suche(
        text,
        r"Wohnungen: Der durchschnittliche Mietpreis für Wohnungen liegt in .*? bei ([\d.,]+) €/m²\."
        r".*?niedrigste Preis für Mietwohnungen liegt bei ([\d.,]+) €/m²\."
        r".*?Preisgrenze befindet sich bei ([\d.,]+) €/m²",
        "Miete Wohnung",
    )
    out["mieteWohnungAvg"], out["mieteWohnungMin"], out["mieteWohnungMax"] = zahl(a), zahl(b), zahl(c)
    return out


def lies_trend(text):
    res = {}
    for schluessel, wort in (("wohnung", "Eigentumswohnungen"), ("haus", "Häuser")):
        a, richtung, start, ende = suche(
            text,
            wort + r": Der Quadratmeterpreis für (?:eine Eigentumswohnung|ein Haus) in .*? "
            r"ist seit Q2 2022 um ([\d,]+)\s?% (gefallen|gestiegen)\."
            r" Kostete der Quadratmeter in Q2 2022 noch durchschnittlich ([\d.]+) €/m², sind es heute ([\d.]+) €/m²",
            "Trend " + schluessel,
        )
        pct = zahl(a) * (-1 if richtung == "gefallen" else 1)
        res[schluessel] = {"pct": pct, "start": zahl(start), "ende": zahl(ende)}
    return res


def lies_linien(doc):
    """Die zwei 17-Punkte-Pfade des Liniendiagramms, links (Q2 2022) nach rechts."""
    gefunden = {}
    for seite in doc:
        for dr in seite.get_drawings():
            items = dr["items"]
            if dr.get("type") != "s" or dr.get("fill") is not None or len(items) != QUARTALE - 1:
                continue
            if any(i[0] != "l" for i in items):
                continue
            for name, farbe in (("wohnung", GRUEN), ("haus", GRAU)):
                if farbe_gleich(dr.get("color"), farbe):
                    if name in gefunden:
                        raise ValueError(f"Linie {name} mehrfach gefunden")
                    pts = [items[0][1]] + [i[-1] for i in items]
                    gefunden[name] = sorted(pts, key=lambda p: p.x)
    if set(gefunden) != {"wohnung", "haus"}:
        raise ValueError("Diagramm-Linien nicht gefunden")
    return gefunden


def passe_an(punkte):
    """Kleinste Quadrate fuer preis = a * y + b ueber [(y, preis), ...]."""
    n = len(punkte)
    sy = sum(y for y, _ in punkte)
    sp = sum(p for _, p in punkte)
    syy = sum(y * y for y, _ in punkte)
    syp = sum(y * p for y, p in punkte)
    nenner = n * syy - sy * sy
    if abs(nenner) < 1e-9:
        raise ValueError("Anker ohne Hoehenunterschied")
    a = (n * syp - sy * sp) / nenner
    b = (sp - a * sy) / n
    return a, b


def rekonstruiere_verlauf(linien, trend, landeswerte):
    anker = []
    for name in ("wohnung", "haus"):
        pts = linien[name]
        anker.append((pts[0].y, trend[name]["start"]))
        anker.append((pts[-1].y, trend[name]["ende"]))
    a, b = passe_an(anker)
    if a >= 0:
        raise ValueError("Diagramm steigt trotz fallender Preise - vermutlich Mietpreis-Diagramm")
    for y, preis in anker:
        abw = abs(a * y + b - preis) / preis
        if abw > TOLERANZ:
            raise ValueError(f"Anker weicht {abw*100:.1f} % ab - Diagramm passt nicht zu den Preisen")

    proben = {}
    for name, feld in (("wohnung", "kaufWohnungVeraenderung"), ("haus", "kaufHausVeraenderung")):
        vj = landeswerte.get(feld)
        if vj is None:
            continue  # keine Vorjahreszahl im JSON: keine Probe moeglich
        soll = trend[name]["ende"] / (1 + vj / 100)
        ist = a * linien[name][IDX_Q2_2025].y + b
        abw = abs(ist - soll) / soll
        if abw > TOLERANZ:
            raise ValueError(f"Probe Q2 2025 {name}: {abw*100:.2f} % Abweichung")
        proben[name] = abw
    if not proben:
        raise ValueError("keine Probe moeglich (Vorjahresveraenderung fehlt)")

    verlauf = {}
    for name in ("wohnung", "haus"):
        werte = [round(a * p.y + b) for p in linien[name]]
        werte[0], werte[-1] = trend[name]["start"], trend[name]["ende"]  # bekannt, exakt
        verlauf[name] = werte
    return verlauf, proben


def verarbeite(code, landeswerte):
    doc, text = lade_pdf(code)
    texte = lies_texte(text)
    trend = lies_trend(text)

    # Bestehende Werte im JSON muessen zum PDF passen.
    for feld in ("kaufWohnungAvg", "kaufHausAvg", "mieteWohnungAvg", "mieteHausAvg"):
        if texte[feld] != landeswerte[feld]:
            raise ValueError(f"{feld}: PDF {texte[feld]} != JSON {landeswerte[feld]}")
    if trend["wohnung"]["ende"] != landeswerte["kaufWohnungAvg"]:
        raise ValueError("Trend-Endwert Wohnung != kaufWohnungAvg")
    if trend["haus"]["ende"] != landeswerte["kaufHausAvg"]:
        raise ValueError("Trend-Endwert Haus != kaufHausAvg")

    neu = {"kaufHausVeraenderung4J": trend["haus"]["pct"]}
    if texte["kaufAlleAvg"] is not None:
        neu["kaufAlleAvg"] = texte["kaufAlleAvg"]
    for feld in ("kaufWohnungMin", "kaufWohnungMax", "kaufHausMin", "kaufHausMax",
                 "mieteWohnungMin", "mieteWohnungMax", "mieteHausMin", "mieteHausMax"):
        neu[feld] = texte[feld]

    verlauf, proben, verlauf_fehler = None, {}, None
    try:
        verlauf, proben = rekonstruiere_verlauf(lies_linien(doc), trend, landeswerte)
    except ValueError as e:
        verlauf_fehler = str(e)
    return neu, verlauf, proben, verlauf_fehler, trend


def num(v):
    return str(int(v)) if float(v) == int(v) else repr(float(v))


def baue_zeilen(neu):
    kopf = f'        "kaufHausVeraenderung4J": {num(neu["kaufHausVeraenderung4J"])}'
    if "kaufAlleAvg" in neu:
        kopf += f', "kaufAlleAvg": {num(neu["kaufAlleAvg"])}'
    zeilen = [
        kopf + ",",
        f'        "kaufWohnungMin": {num(neu["kaufWohnungMin"])}, "kaufWohnungMax": {num(neu["kaufWohnungMax"])},',
        f'        "kaufHausMin": {num(neu["kaufHausMin"])}, "kaufHausMax": {num(neu["kaufHausMax"])},',
        f'        "mieteWohnungMin": {num(neu["mieteWohnungMin"])}, "mieteWohnungMax": {num(neu["mieteWohnungMax"])},',
        f'        "mieteHausMin": {num(neu["mieteHausMin"])}, "mieteHausMax": {num(neu["mieteHausMax"])}',
    ]
    return "\n".join(zeilen)


def baue_verlauf(verlauf, nach=None):
    kopf = '        "basis": "Q2 2022", "ende": "Q2 2026", "einheit": "€/m² Kaufpreis, Quartalswerte"'
    if nach:
        kopf += f', "naeherungNach": "{nach}"'
    return (
        '      "verlauf": {\n'
        f"{kopf},\n"
        f'        "wohnung": {json.dumps(verlauf["wohnung"])},\n'
        f'        "haus": {json.dumps(verlauf["haus"])}\n'
        "      },\n"
    )


# Fehlt einem Land der Verlauf (PDF zeigte den falschen Reiter), leihen wir uns
# die FORM der Linie vom Nachbarland und strecken sie auf die echten Endpunkte
# aus dem FAQ-Text. Bayern -> Baden-Wuerttemberg, Berlin -> Brandenburg (das
# Berlin komplett umschliesst).
NACHBAR = {"BY": "BW", "BE": "BB"}


def naeherung_verlauf(trend, nachbar_verlauf):
    """Form des Nachbarn (relativ zu dessen Start), plus eine lineare Korrektur,
    die den echten Endwert trifft. Start und Ende sind exakt, dazwischen ist es
    eine Naeherung - das Feld naeherungNach im JSON markiert das."""
    out = {}
    for name in ("wohnung", "haus"):
        n = nachbar_verlauf[name]
        start, ende = trend[name]["start"], trend[name]["ende"]
        letzter = len(n) - 1
        korrektur = ende - start * n[letzter] / n[0]
        werte = [round(start * n[i] / n[0] + (i / letzter) * korrektur) for i in range(len(n))]
        werte[0], werte[-1] = start, ende
        out[name] = werte
    return out


def setze_verlauf(text, code, block):
    """Ersetzt den vorhandenen "verlauf"-Block eines Landes oder fuegt ihn direkt
    hinter "landeswerte" ein."""
    start = text.index(f'"code": "{code}"')
    naechster = text.find('"code": "', start + 1)
    ende = len(text) if naechster < 0 else naechster
    segment = text[start:ende]
    vorhanden = re.search(r'      "verlauf": \{.*?\n      \},\n', segment, re.S)
    if vorhanden:
        segment = segment[: vorhanden.start()] + block + segment[vorhanden.end():]
    else:
        lw = segment.index('"landeswerte": {')
        schluss = segment.index("\n      },\n", lw) + len("\n      },\n")
        segment = segment[:schluss] + block + segment[schluss:]
    return text[:start] + segment + text[ende:]


def main():
    schreiben = "--schreiben" in sys.argv
    with open(JSON_PFAD, encoding="utf-8") as f:
        roh = f.read()
    daten = json.loads(roh)

    fehler, ergebnisse, trends = [], {}, {}
    for b in daten["bundeslaender"]:
        code = b["code"]
        try:
            neu, verlauf, proben, verlauf_fehler, trend = verarbeite(code, b["landeswerte"])
        except Exception as e:  # noqa: BLE001 - Meldung ist der Zweck
            fehler.append(f"{code}: {e}")
            continue
        ergebnisse[code] = (neu, verlauf, None)
        trends[code] = trend
        if verlauf:
            p = ", ".join(f"{k} {v*100:.2f} %" for k, v in proben.items())
            print(f"{code}  Wohnung {verlauf['wohnung'][0]}->{verlauf['wohnung'][-1]}  "
                  f"Haus {verlauf['haus'][0]}->{verlauf['haus'][-1]}  Probe Q2 2025: {p}")
        else:
            print(f"{code}  KEIN VERLAUF - {verlauf_fehler}")

    # Naeherung fuer Laender ohne echten Verlauf
    for code, nachbar in NACHBAR.items():
        if code in ergebnisse and ergebnisse[code][1] is None and nachbar in ergebnisse:
            nv = ergebnisse[nachbar][1]
            if nv:
                v = naeherung_verlauf(trends[code], nv)
                ergebnisse[code] = (ergebnisse[code][0], v, nachbar)
                print(f"{code}  NAEHERUNG nach {nachbar}  Wohnung {v['wohnung'][0]}->{v['wohnung'][-1]}  "
                      f"Haus {v['haus'][0]}->{v['haus'][-1]}")

    if fehler:
        print("\nFEHLER (Text nicht lesbar, Abbruch):")
        for f in fehler:
            print("  " + f)
    if not schreiben:
        print("\nTrockenlauf - nichts geschrieben. Mit --schreiben uebernehmen.")
        return 1 if fehler else 0
    if fehler:
        return 1

    text = roh
    for b in daten["bundeslaender"]:
        code = b["code"]
        neu, verlauf, nach = ergebnisse[code]
        # Zusatzwerte nur einmal einfuegen (Skript ist wiederholbar)
        if "kaufWohnungMin" not in b["landeswerte"]:
            start = text.index(f'"code": "{code}"')
            muster = re.compile(r'("kaufSpanneMin": [\d.]+, "kaufSpanneMax": [\d.]+)\n(      \},\n)')
            m = muster.search(text, start)
            if not m:
                print(f"{code}: Einfuegestelle nicht gefunden, Abbruch ohne Schreiben.")
                return 1
            text = text[: m.start()] + m.group(1) + ",\n" + baue_zeilen(neu) + "\n" + m.group(2) + text[m.end():]
        # Verlauf: neu setzen, wenn keiner da ist oder nur eine Naeherung, die
        # jetzt durch einen echten ersetzt werden kann. Ein echter Verlauf bleibt.
        vorhanden = b.get("verlauf")
        if verlauf and (vorhanden is None or (vorhanden.get("naeherungNach") and not nach)
                        or (vorhanden.get("naeherungNach") and nach)):
            text = setze_verlauf(text, code, baue_verlauf(verlauf, nach))

    json.loads(text)  # muss gueltiges JSON bleiben
    with open(JSON_PFAD, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    print("\nimmodaten.json aktualisiert. Weiter mit: node scripts/build_regionalpreise.mjs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
