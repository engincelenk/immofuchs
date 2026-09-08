"""Erzeugt public/mieten-fortschreibung.json: Fortschreibungsfaktor je
Bundesland, um die eingefrorene Zensus-2022-Ortsmiete (siehe
scripts/build_miete_referenz.py) auf das aktuelle Jahr hochzurechnen.

Warum das noetig ist: miete-referenz.txt ist eine Momentaufnahme zum
Stichtag 15.05.2022. Seitdem sind die Mieten gestiegen - eine 2022er Zahl,
die 2026 unkommentiert als "Ortsniveau" auftaucht, unterschaetzt die
Marktmiete zunehmend. Diese Datei traegt keine neue Erhebung nach, sondern
skaliert die vorhandene Zensuszahl mit der Preisentwicklung seit 2022.

Quelle: GENESIS-Tabelle 61111-0020 "Index der Nettokaltmieten:
Bundeslaender, Jahre", Statistisches Bundesamt (Destatis), Basis 2020=100.
https://www-genesis.destatis.de/genesisWS/downloads/00/tables/61111-0020_00.csv
Oeffentlich abrufbar, kein Login, kein API-Schluessel. Lizenz dl-de/by-2.0
(Namensnennungspflicht "© Statistisches Bundesamt (Destatis), <Jahr>") -
dieselbe Lizenzfamilie wie die Zensus-Gitterdaten, die miete-referenz.txt
zugrunde liegen.

Warum dieser Index und nicht der Haeuserpreisindex: Der Haeuserpreisindex
misst KAUFPREISE, nicht Mieten - er waere die falsche Groesse fuer eine
Mietreferenz, egal wie gut er sonst gepflegt ist. 61111-0020 misst exakt
das, was fortgeschrieben werden soll: die Entwicklung der Nettokaltmiete,
je Bundesland, jaehrlich.

Warum gegen 2022 und nicht gegen 2020 fortgeschrieben: 2020 ist nur die
technische Indexbasis (=100). Der Zensus, den mietReferenz.js ausliefert,
hat Stichtag 15.05.2022 - der Fortschreibungsfaktor muss deshalb
Endjahr/2022 sein, sonst wuerde bereits die 2020->2022-Steigerung doppelt
eingerechnet (einmal im Zensuswert selbst, einmal im Faktor).

Warum ein Faktor je Bundesland und nicht bundesweit einer: Die Mietentwicklung
laeuft regional deutlich auseinander (siehe 2025-Werte: Bremen +14,4 % seit
2022er-Basis-Vergleichsjahr, Sachsen-Anhalt nur +5,7 %) - ein bundesweiter
Schnitt wuerde Ballungsraeume und laendliche Flaeche in denselben Topf werfen,
genau der Fehler, den miete-referenz.txt mit dem 1-km-Gitter gerade vermeidet.

Warum normales JSON und keine base36-Packung wie bei den PLZ-Tabellen:
16 Werte sind keine Datei, die eine Kompression rechtfertigt - lesbares JSON
ist hier die einfachere und damit richtige Wahl.

Einmalig bzw. gelegentlich (z.B. jaehrlich nach Erscheinen neuer
Indexwerte) auszufuehren:
    python scripts/build_mieten_fortschreibung.py
"""

import datetime
import json
import os
import re
import sys
import urllib.request

QUELLE = "https://www-genesis.destatis.de/genesisWS/downloads/00/tables/61111-0020_00.csv"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ImmoFuchsBot/1.0; +https://immofuchs.info)"}

# Zensus-Stichtag, gegen den fortgeschrieben wird (siehe Docstring oben -
# NICHT die Indexbasis 2020).
BASISJAHR = 2022

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(WURZEL, "public", "mieten-fortschreibung.json")

# Spaltenreihenfolge der CSV-Kopfzeile -> Kuerzel wie in src/data.js (BL_N).
# Die Reihenfolge ist in der CSV fest (alphabetisch nach Bundesland) und
# deckt sich zufaellig mit der Reihenfolge in BL_N - trotzdem explizit
# aufgefuehrt statt stillschweigend per Index verlassen, damit eine
# kuenftige Spaltenumsortierung bei Destatis sofort auffiele (KeyError statt
# stiller Fehlzuordnung).
LAENDER = [
    ("Baden-Württemberg", "BW"),
    ("Bayern", "BY"),
    ("Berlin", "BE"),
    ("Brandenburg", "BB"),
    ("Bremen", "HB"),
    ("Hamburg", "HH"),
    ("Hessen", "HE"),
    ("Mecklenburg-Vorpommern", "MV"),
    ("Niedersachsen", "NI"),
    ("Nordrhein-Westfalen", "NW"),
    ("Rheinland-Pfalz", "RP"),
    ("Saarland", "SL"),
    ("Sachsen", "SN"),
    ("Sachsen-Anhalt", "ST"),
    ("Schleswig-Holstein", "SH"),
    ("Thüringen", "TH"),
]


def _parse_wert(s):
    """"103,9" -> 103.9, "-" (kein Wert) -> None."""
    s = s.strip()
    if not s or s == "-":
        return None
    return float(s.replace(",", "."))


def hole_csv():
    print(f"Lade {QUELLE} ...")
    req = urllib.request.Request(QUELLE, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as r:
        roh = r.read()
    # Destatis liefert die GENESIS-CSV-Exporte in Latin-1/CP1252 - bei
    # UTF-8-Interpretation werden die Umlaute in den Bundeslandnamen zu
    # Mojibake (siehe Auftragsbeschreibung).
    text = roh.decode("latin-1")
    print(f"  {len(roh):,} Bytes geladen")
    return text


def parse_tabelle(text):
    """Liefert {jahr: [16 Werte in LAENDER-Reihenfolge, None bei '-']}."""
    zeilen = text.splitlines()

    kopf_idx = None
    for i, zeile in enumerate(zeilen):
        erste_spalte = zeile.split(";", 1)[0]
        if erste_spalte == "" and "Baden-W" in zeile:
            kopf_idx = i
            break
    if kopf_idx is None:
        sys.exit("FEHLER: Kopfzeile mit Bundeslandnamen nicht gefunden - Format hat sich geaendert.")

    kopf = zeilen[kopf_idx].split(";")[1:]
    kopf = [s.strip() for s in kopf if s.strip()]
    erwartete_namen = [name for name, _ in LAENDER]
    if kopf[: len(erwartete_namen)] != erwartete_namen:
        sys.exit(
            "FEHLER: Spaltenreihenfolge der CSV weicht von LAENDER ab.\n"
            f"  CSV:      {kopf}\n"
            f"  erwartet: {erwartete_namen}"
        )

    jahre = {}
    for zeile in zeilen[kopf_idx + 1 :]:
        if not zeile or not re.match(r"^\d{4};", zeile):
            # Fusszeile ("__________", Quellenangabe, Stand-Datum) beendet
            # die Datentabelle.
            if jahre:
                break
            continue
        teile = zeile.split(";")
        jahr = int(teile[0])
        werte = [_parse_wert(s) for s in teile[1 : 1 + len(LAENDER)]]
        jahre[jahr] = werte
    return jahre


def main():
    text = hole_csv()
    jahre = parse_tabelle(text)
    print(f"  {len(jahre)} Jahre geparst ({min(jahre)}–{max(jahre)})")

    if BASISJAHR not in jahre:
        sys.exit(f"FEHLER: Basisjahr {BASISJAHR} nicht in der Tabelle enthalten.")
    werte_basis = jahre[BASISJAHR]
    if any(w is None for w in werte_basis):
        sys.exit(f"FEHLER: Basisjahr {BASISJAHR} hat fehlende Werte - Fortschreibung nicht moeglich.")

    # Neuestes Jahr, das fuer ALLE 16 Laender einen Wert hat.
    neuestes_jahr = None
    for jahr in sorted(jahre, reverse=True):
        if all(w is not None for w in jahre[jahr]):
            neuestes_jahr = jahr
            break
    if neuestes_jahr is None:
        sys.exit("FEHLER: kein Jahr mit vollstaendigen Werten fuer alle 16 Laender gefunden.")
    if neuestes_jahr <= BASISJAHR:
        sys.exit(f"FEHLER: neuestes vollstaendiges Jahr ({neuestes_jahr}) liegt nicht nach dem Basisjahr.")

    werte_neu = jahre[neuestes_jahr]
    print(f"  Fortschreibung {BASISJAHR} -> {neuestes_jahr}")

    ergebnis = {}
    for (name, kuerzel), basis, neu in zip(LAENDER, werte_basis, werte_neu):
        faktor = round(neu / basis, 3)
        ergebnis[kuerzel] = faktor

    ergebnis["_meta"] = {
        "basisjahr": BASISJAHR,
        "stand": str(neuestes_jahr),
        "quelle": "Destatis GENESIS 61111-0020",
        "abgerufen": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
    }

    with open(ZIEL, "w", encoding="utf-8", newline="\n") as f:
        json.dump(ergebnis, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

    print(f"\n{ZIEL}")
    print("\nFaktoren:")
    for name, kuerzel in LAENDER:
        print(f"  {kuerzel:3s} {ergebnis[kuerzel]:.3f}  ({name})")


if __name__ == "__main__":
    main()
