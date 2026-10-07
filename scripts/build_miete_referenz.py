"""Erzeugt public/miete-referenz.txt: ortsübliche Nettokaltmiete je m² pro PLZ.

Quelle: Zensus 2022, "Durchschnittliche Nettokaltmiete" auf dem 1-km-Gitter.
Statistisches Bundesamt (Destatis), Open Data — freie Nutzung mit
Quellenangabe. Stichtag 15.05.2022.
https://www.destatis.de/static/DE/zensus/gitterdaten/Zensus2022_Durchschn_Nettokaltmiete.zip

Warum eine statische Datei und kein Laufzeit-Dienst — dieselbe Begruendung
wie bei plz-geo.txt (src/utils/plzGeo.js):
  - kein Laufzeit-Request je Objekt, also auch kein Datenabfluss darueber
  - keine Rate-Limits, kein API-Schluessel
  - funktioniert offline, was fuer eine PWA zaehlt

Warum PLZ und nicht Gemeinde: Die App kennt vom Objekt PLZ und Ort, keinen
amtlichen Gemeindeschluessel. public/plz-geo.txt liefert bereits PLZ ->
Koordinate; diese Datei haengt nur den Mietwert daran.

Warum das 1-km-Gitter und nicht das 10-km-Gitter: 10 km wirft in Staedten
Innenstadt und Randlage in einen Topf. Warum nicht 100 m: die Datei waere
69 MB gross und die Werte dort so duenn besetzt, dass sie ueberwiegend als
unsicher gekennzeichnet sind.

Einmalig auszufuehren (der Zensus ist eine Momentaufnahme, kein Zeitreihe):
    python scripts/build_miete_referenz.py
"""

import io
import math
import os
import sys
import urllib.request
import zipfile

QUELLE = (
    "https://www.destatis.de/static/DE/zensus/gitterdaten/"
    "Zensus2022_Durchschn_Nettokaltmiete.zip"
)
CSV_IM_ZIP = "Zensus2022_Durchschn_Nettokaltmiete_1km-Gitter.csv"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ImmoFuchsBot/1.0; +https://immofuchs.info)"}

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLZ_GEO = os.path.join(WURZEL, "public", "plz-geo.txt")
ZIEL = os.path.join(WURZEL, "public", "miete-referenz.txt")

# Suchradius um den PLZ-Mittelpunkt. 3 km deckt auch grosse Flaechen-PLZ ab,
# ohne in der Stadt das Nachbarviertel mitzumitteln.
RADIUS_M = 3000
# Unter drei Zellen ist der Mittelwert kein Ortsniveau mehr, sondern ein
# Einzelwert mit Nachkommastelle - dann lieber keine Angabe. Eine fehlende
# Referenz ist ehrlicher als eine, die Genauigkeit vortaeuscht.
MIN_ZELLEN = 3


# ── EPSG:3035 (ETRS89-LAEA) ────────────────────────────────────────────────
# Das Zensus-Gitter liegt in Lambert-Azimutal-flaechentreu auf GRS80. Bewusst
# ohne pyproj: eine einzige Projektion rechtfertigt keine Geo-Abhaengigkeit im
# Build, und die Formeln (Snyder, Map Projections, Kap. 24) sind exakt.
A = 6378137.0
F = 1 / 298.257222101
E2 = 2 * F - F * F
E = math.sqrt(E2)
LAT0 = math.radians(52.0)
LON0 = math.radians(10.0)
X0 = 4321000.0
Y0 = 3210000.0


def _q(phi):
    s = math.sin(phi)
    return (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * E)) * math.log((1 - E * s) / (1 + E * s)))


_QP = _q(math.pi / 2)
_RQ = A * math.sqrt(_QP / 2)
_BETA0 = math.asin(_q(LAT0) / _QP)
_D = A * math.cos(LAT0) / (math.sqrt(1 - E2 * math.sin(LAT0) ** 2) * _RQ * math.cos(_BETA0))


def laea(lat_grad, lon_grad):
    """WGS84/ETRS89 lat,lon (Grad) -> EPSG:3035 x,y (Meter)."""
    phi = math.radians(lat_grad)
    lam = math.radians(lon_grad)
    beta = math.asin(_q(phi) / _QP)
    dl = lam - LON0
    nenner = 1 + math.sin(_BETA0) * math.sin(beta) + math.cos(_BETA0) * math.cos(beta) * math.cos(dl)
    b = _RQ * math.sqrt(2 / nenner)
    x = X0 + b * _D * math.cos(beta) * math.sin(dl)
    y = Y0 + (b / _D) * (
        math.cos(_BETA0) * math.sin(beta) - math.sin(_BETA0) * math.cos(beta) * math.cos(dl)
    )
    return x, y


# ── plz-geo.txt lesen (Format siehe src/utils/plzGeo.js) ───────────────────
def d36(s):
    return -int(s[1:], 36) if s.startswith("-") else int(s, 36)


def lies_plz_geo(pfad):
    with open(pfad, encoding="utf-8") as f:
        text = f.read()
    plz = lat = lon = 0
    out = {}
    for eintrag in text.split("|"):
        teile = eintrag.split(",")
        if len(teile) != 3:
            continue
        plz += d36(teile[0])
        lat += d36(teile[1])
        lon += d36(teile[2])
        out[plz] = (lat / 1000, lon / 1000)
    return out


def hole_gitter(lokal=None):
    """Laedt das Gitter von Destatis - oder aus einer bereits geladenen ZIP,
    wenn der Pfad als Argument uebergeben wird (spart beim Nachrechnen den
    9-MB-Download)."""
    if lokal:
        print(f"Lese {lokal} ...")
        z = zipfile.ZipFile(lokal)
    else:
        print(f"Lade {QUELLE} ...")
        req = urllib.request.Request(QUELLE, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=300) as r:
            roh = r.read()
        z = zipfile.ZipFile(io.BytesIO(roh))
        print(f"  {len(roh) / 1e6:.1f} MB geladen")

    zellen = []
    with z.open(CSV_IM_ZIP) as f:
        for i, zeile in enumerate(io.TextIOWrapper(f, encoding="utf-8")):
            if i == 0:
                continue
            t = zeile.rstrip("\n").split(";")
            if len(t) < 4 or not t[3]:
                continue
            try:
                zellen.append((int(t[1]), int(t[2]), float(t[3].replace(",", "."))))
            except ValueError:
                continue
    print(f"  {len(zellen):,} Gitterzellen mit Mietwert")
    return zellen


def main():
    if not os.path.exists(PLZ_GEO):
        sys.exit(f"FEHLER: {PLZ_GEO} fehlt - ohne PLZ-Koordinaten keine Zuordnung.")

    plz_geo = lies_plz_geo(PLZ_GEO)
    print(f"{len(plz_geo):,} Postleitzahlen aus plz-geo.txt")

    zellen = hole_gitter(sys.argv[1] if len(sys.argv) > 1 else None)

    # Raster-Index: Zellen in 5-km-Kacheln einsortieren, damit je PLZ nur die
    # Nachbarschaft geprueft wird statt aller 200.000 Zellen (sonst 8.200 x
    # 200.000 Vergleiche).
    KACHEL = 5000
    index = {}
    for x, y, miete in zellen:
        index.setdefault((x // KACHEL, y // KACHEL), []).append((x, y, miete))

    ergebnis = {}
    r2 = RADIUS_M * RADIUS_M
    for plz, (lat, lon) in plz_geo.items():
        px, py = laea(lat, lon)
        kx, ky = int(px) // KACHEL, int(py) // KACHEL
        summe = 0.0
        anzahl = 0
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for x, y, miete in index.get((kx + dx, ky + dy), ()):
                    if (x - px) ** 2 + (y - py) ** 2 <= r2:
                        summe += miete
                        anzahl += 1
        if anzahl >= MIN_ZELLEN:
            ergebnis[plz] = summe / anzahl

    print(f"{len(ergebnis):,} PLZ mit Referenzmiete ({len(plz_geo) - len(ergebnis):,} ohne)")

    # Format wie plz-geo.txt: "|"-getrennt, Base36, PLZ als Differenz zum
    # Vorgaenger. Miete in Zehntel-Cent-Schritten waere Scheingenauigkeit -
    # eine Nachkommastelle ist genau das, was der Zensus selbst ausweist.
    teile = []
    vorher = 0
    for plz in sorted(ergebnis):
        d = plz - vorher
        vorher = plz
        zehntel = round(ergebnis[plz] * 10)
        teile.append(f"{format_b36(d)},{format_b36(zehntel)}")
    text = "|".join(teile)

    with open(ZIEL, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    print(f"\n{ZIEL}\n  {len(text) / 1024:.1f} KB")

    beispiele = [10115, 20095, 80331, 70173, 4109]
    print("\nStichprobe:")
    for p in beispiele:
        if p in ergebnis:
            print(f"  {p:05d}: {ergebnis[p]:.2f} EUR/m2")


def format_b36(n):
    if n < 0:
        return "-" + to36(-n)
    return to36(n)


def to36(n):
    if n == 0:
        return "0"
    ziffern = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while n:
        n, r = divmod(n, 36)
        out = ziffern[r] + out
    return out


if __name__ == "__main__":
    main()
