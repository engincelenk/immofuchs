#!/usr/bin/env python3
"""
Datenpflege-Erinnerung (seit 2026-10-01).

Legt fuer jedes Datenthema, das im laufenden Monat faellig ist, ein eigenes
GitHub-Issue an und weist es dem Repo-Besitzer zu - GitHub schickt dann eine
Mail. Jedes Issue sagt, was zu tun ist, und enthaelt einen fertigen Satz, den
man Claude geben kann.

Zwei Arten von Faelligkeit:
  1. Kalender (THEMEN unten): quartalsweise im Jan/Apr/Jul/Okt, halbjaehrlich
     im Jan/Jul, jaehrlich im genannten Monat.
  2. Veraltete Automatik: Werte, die der Monatsjob eigentlich selbst holt
     (PFANDBRIEF, WERTSTEIGERUNG), deren Abruf aber haengt - erkannt am
     "stand" in src/data.js.

Ein Issue bleibt offen, bis es jemand schliesst. Ist ein Thema wieder faellig,
waehrend das alte Issue noch offen ist, gibt es einen Kommentar statt eines
zweiten Issues.

Aufruf (vom Workflow .github/workflows/datenpflege-erinnerung.yml):
  python scripts/datenpflege_erinnerung.py
Umgebung:
  GH_TOKEN, GITHUB_REPOSITORY, GITHUB_REPOSITORY_OWNER  - vom Workflow
  TESTMONAT=1..12   - so tun, als waere dieser Monat (zum Ausprobieren)
  TROCKEN=ja        - nur ausgeben, keine Issues anlegen
"""

import json
import os
import re
import subprocess
from datetime import datetime

try:
    from zoneinfo import ZoneInfo

    BERLIN = ZoneInfo("Europe/Berlin")
except Exception:  # pragma: no cover - aeltere Python-Versionen
    BERLIN = None

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS = os.path.join(REPO_ROOT, "src", "data.js")
LABEL = "datenpflege"

MONATE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]
QUARTAL = [1, 4, 7, 10]
HALBJAHR = [1, 7]

# Gemeinsamer Abschluss jeder Claude-Anweisung - haelt die Projektregeln ein
# (Release-Notes, Doku, Deploy nur auf dev).
ABSCHLUSS = (
    "Setze bei Konstanten das Feld stand auf den aktuellen Monat, passe Tests an, "
    "trage die Aenderung in release-notes.txt und "
    "docs/technical_specs/datenquellen-und-aktualisierung.md ein und deploye auf dev."
)

THEMEN = [
    # ── quartalsweise ────────────────────────────────────────────────────
    {
        "key": "KFW_HEIZUNG",
        "konst": "KFW_HEIZUNG",
        "titel": "KfW-Heizungsförderung (Zuschuss 458)",
        "monate": QUARTAL,
        "quelle": "kfw.de → Heizungsförderung für Privatpersonen – Wohngebäude (458), Abschnitt Konditionen",
        "datei": "`src/data.js` → `KFW_HEIZUNG` (Absenkungslogik: `src/utils/begFoerderung.js`)",
        "verwendung": "Sanierungsrechner: Förderung Heizung, Klimabonus-Hinweis, Einkommensbonus",
        "claude": "Datenpflege KFW_HEIZUNG: Prüfe auf kfw.de (Zuschuss 458, Konditionen) Grundförderung, "
        "Klimageschwindigkeitsbonus, Einkommensbonus, Höchstförderung und die förderfähigen Kosten je "
        "Wohneinheit samt angekündigter Absenkungen gegen KFW_HEIZUNG in src/data.js und "
        "src/utils/begFoerderung.js. Trage Abweichungen ein.",
    },
    {
        "key": "BAFA",
        "konst": "BAFA",
        "titel": "BAFA-Förderung Gebäudehülle und Lüftung",
        "monate": QUARTAL,
        "quelle": "bafa.de → Sanierung Wohngebäude → Gebäudehülle und Anlagentechnik (außer Heizung), Merkblatt",
        "datei": "`src/data.js` → `BAFA`",
        "verwendung": "Sanierungsrechner: Förderung Fenster, Fassade, Dach, Tür, Keller, Geschossdecke, Lüftung; iSFP-Schalter",
        "claude": "Datenpflege BAFA: Prüfe auf bafa.de (Sanierung Wohngebäude: Gebäudehülle und Anlagentechnik) "
        "Grundfördersatz, iSFP-Bonus samt Mindestinvestition und die Höchstgrenzen je Wohneinheit gegen BAFA "
        "in src/data.js. Achte auf neue Boni (z. B. WPB-Bonus). Trage Abweichungen ein.",
    },
    {
        "key": "KFW_KREDIT",
        "konst": "KFW_KREDIT",
        "titel": "KfW-Förderkredite 297/298 und 124",
        "monate": QUARTAL,
        "quelle": "kfw.de → Produktseiten 297/298 (Klimafreundlicher Neubau) und 124 (Wohneigentum), Konditionen",
        "datei": "`src/data.js` → `KFW_KREDIT`",
        "verwendung": "Kreditrechner und Renditerechner: KfW-Darlehen (Höchstbetrag, Zins), Tooltips",
        "claude": "Datenpflege KFW_KREDIT: Prüfe auf kfw.de die aktuellen Zinsen, Höchstbeträge je Wohneinheit "
        "und Laufzeiten der Programme 297/298 und 124 gegen KFW_KREDIT in src/data.js. Trage Abweichungen ein.",
    },
    {
        "key": "REGIONALPREISE",
        "titel": "Regionalpreise (ImmoScout24-Datenblätter)",
        "monate": QUARTAL,
        "vorher": "Lade die neuen ImmoScout24-Datenblätter herunter (16× „Immobilienpreise <Bundesland>.pdf“ "
        "und „Immobilien in Deutschland – Investmentchancen.pdf“) und lege sie unter "
        "`src/immodata/<Jahr>/<Quartal>/` ab – wie beim Stand Q2 2026.",
        "quelle": "ImmoScout24-Datenblätter je Bundesland (PDF)",
        "datei": "`public/regionalpreise.json` (aus `src/immodata/2026/datenblatter/immodaten.json`)",
        "verwendung": "Renditerechner (Preis gegen Markt, regionale Wertsteigerung), Mieterhöhungsrechner, "
        "Sanierungsrechner, Objektseite/Investment-Briefing, Merkliste, Exposé, Landingpage",
        "claude": "Datenpflege Regionalpreise: Unter src/immodata/<Jahr>/<Quartal>/ liegen die neuen "
        "ImmoScout24-Datenblätter. Aktualisiere damit immodaten.json, stelle "
        "scripts/extract_datenblatt_zusatz.py auf das neue Quartal um, baue public/regionalpreise.json "
        "mit node scripts/build_regionalpreise.mjs neu und prüfe die Werte stichprobenartig gegen die PDFs.",
    },
    # ── halbjaehrlich ────────────────────────────────────────────────────
    {
        "key": "MIET_P",
        "konst": "MIET_P",
        "titel": "Mietprognose",
        "monate": HALBJAHR,
        "quelle": "Destatis (Verbraucherpreisindex Nettokaltmiete), IW-Institut",
        "datei": "`src/data.js` → `MIET_P`",
        "verwendung": "Mieterhöhungsrechner (Mietentwicklung), Landingpage „Echte Marktdaten“",
        "claude": "Datenpflege MIET_P: Recherchiere die aktuelle Mietpreisentwicklung (Destatis Index der "
        "Nettokaltmieten, IW-Prognosen) und prüfe die Prognosewerte normal und kapp15 in MIET_P in "
        "src/data.js. Nenne mir Quelle und neue Werte, bevor du sie einträgst.",
    },
    {
        "key": "SAN_ENERGIE",
        "konst": "SAN_ENERGIE",
        "titel": "Energiepreise und CO₂-Faktoren",
        "monate": HALBJAHR,
        "quelle": "BDEW-Strompreisanalyse, Destatis Energiepreise, Umweltbundesamt (CO₂-Faktoren)",
        "datei": "`src/data.js` → `SAN_ENERGIE`",
        "verwendung": "Sanierungsrechner: Strom-/Heizpreis-Vorbelegung, Energiekosten, CO₂-Einsparung",
        "claude": "Datenpflege SAN_ENERGIE: Prüfe die aktuellen Energiepreise je Heizungsart und die "
        "Standard-Strom- und Heizpreise (BDEW, Destatis) sowie die CO₂-Faktoren (UBA) gegen SAN_ENERGIE in "
        "src/data.js. Trage Abweichungen mit Quelle ein.",
    },
    {
        "key": "SAN_TIERS",
        "konst": "SAN_TIERS",
        "titel": "Sanierungskosten je Gewerk",
        "monate": HALBJAHR,
        "quelle": "BKI Baukosten, Destatis Baupreisindex Wohngebäude",
        "datei": "`src/data.js` → `SAN_TIERS`",
        "verwendung": "Sanierungsrechner: Kosten je Maßnahme (Standard/Gehoben/Premium)",
        "claude": "Datenpflege SAN_TIERS: Prüfe die Maßnahmenkosten in SAN_TIERS (src/data.js) gegen den "
        "aktuellen Destatis-Baupreisindex für Wohngebäude seit dem letzten Stand und schlage eine "
        "Fortschreibung vor.",
    },
    {
        "key": "KAPPUNGSGRENZE",
        "titel": "Städte mit Kappungsgrenze 15 %",
        "monate": HALBJAHR,
        "quelle": "Kappungsgrenzen-Verordnungen der Länder (§ 558 Abs. 3 BGB)",
        "datei": "`worker/src/data/kappungsgrenze.ts` (Auslieferung über `GET /api/v1/kappungsgrenze`)",
        "verwendung": "Mieterhöhungsrechner (Kappungsgrenze 15/20 %), Objektseite (Mietrecht-Hinweis)",
        "claude": "Datenpflege Kappungsgrenze: Prüfe die aktuellen Kappungsgrenzen-Verordnungen aller "
        "Bundesländer (neue, ausgelaufene, verlängerte) gegen die Liste in "
        "worker/src/data/kappungsgrenze.ts. Trage Änderungen ein und deploye danach auch den Worker "
        "(npx wrangler deploy --env dev).",
    },
    # ── jaehrlich ────────────────────────────────────────────────────────
    {
        "key": "LAND_F",
        "titel": "Landesförderbanken",
        "monate": [1],
        "quelle": "Internetseiten der 16 Landesförderinstitute",
        "datei": "`src/data.js` → `LAND_F`",
        "verwendung": "Sanierungsrechner: Hinweis Landesförderung je Bundesland",
        "claude": "Datenpflege LAND_F: Prüfe für alle 16 Bundesländer, ob die in LAND_F (src/data.js) "
        "genannten Landesförderbanken und Programmnamen noch stimmen.",
    },
    {
        "key": "LAND_BONUS",
        "titel": "Landesbonus je Gewerk und Deckel",
        "monate": [1],
        "quelle": "Förderprogramme der Länder für energetische Sanierung",
        "datei": "`src/data.js` → `LAND_BONUS_FQ`, `LAND_BONUS_CAP`",
        "verwendung": "Sanierungsrechner: Bundesland-Bonus auf die Förderung",
        "claude": "Datenpflege Landesbonus: Prüfe für alle 16 Bundesländer die Landesprogramme zur "
        "energetischen Sanierung gegen LAND_BONUS_FQ und LAND_BONUS_CAP in src/data.js (Quoten je Gewerk, "
        "Deckel, ausgelaufene Programme). Ergänze ein stand-Feld, falls noch keines da ist.",
    },
    {
        "key": "SAN_NORMEN",
        "titel": "Normwerte Sanierung",
        "monate": [1],
        "quelle": "IWU/TABULA (Heizbedarf je Baujahr), DIN V 18599, BDEW (Haushaltsstrom), Fraunhofer ISE (PV-Ertrag)",
        "datei": "`src/data.js` → `SAN_NORMEN`",
        "verwendung": "Sanierungsrechner: Verbrauchsschätzung, PV-Ertrag, Haushaltsstrom",
        "claude": "Datenpflege SAN_NORMEN: Prüfe Heizbedarf je Baujahr, Warmwasser- und Hilfsstromwerte, "
        "Haushaltsstrom nach Personenzahl und den PV-Ertrag je kWp in SAN_NORMEN (src/data.js) gegen die "
        "aktuellen Veröffentlichungen. Ergänze ein stand-Feld, falls noch keines da ist.",
    },
    {
        "key": "NICHT_UML",
        "titel": "Nicht umlagefähige Kosten",
        "monate": [1],
        "quelle": "Branchenrichtwerte (Verwaltung, Instandhaltung, Rücklage)",
        "datei": "`src/data.js` → `NICHT_UML`",
        "verwendung": "Renditerechner: Vorbelegung nicht umlagefähige Kosten",
        "claude": "Datenpflege NICHT_UML: Prüfe die Richtwerte für nicht umlagefähige Kosten (Verwaltung, "
        "Instandhaltung, Rücklage, €/m²/Monat) in NICHT_UML (src/data.js) gegen aktuelle Branchenzahlen.",
    },
    {
        "key": "GESETZE",
        "titel": "Gesetzeswerte (Grunderwerbsteuer, AfA, Energieklassen)",
        "monate": [1],
        "quelle": "Landesgesetze Grunderwerbsteuer, EStG § 7/7b, GEG",
        "datei": "`src/data.js` → `GREST`, `AFA`, `ENERGIE_KLASSEN`",
        "verwendung": "Rendite- und Kreditrechner (Kaufnebenkosten, AfA), Sanierungsrechner (Energieklasse)",
        "claude": "Datenpflege Gesetzeswerte: Prüfe, ob sich zum Jahreswechsel Grunderwerbsteuersätze der "
        "Länder, AfA-Regeln (§ 7, § 7b EStG) oder die GEG-Energieklassen geändert haben, gegen GREST, AFA "
        "und ENERGIE_KLASSEN in src/data.js.",
    },
    {
        "key": "MIETEN_FORTSCHREIBUNG",
        "titel": "Mieten-Fortschreibung je Bundesland",
        "monate": [2],
        "quelle": "Destatis GENESIS 61111-0020 (Index der Nettokaltmieten, neues Kalenderjahr)",
        "datei": "`public/mieten-fortschreibung.json`",
        "verwendung": "Objektseite: KI-Analyse, Ortsmiete hochgerechnet auf heute",
        "claude": "Datenpflege Mieten-Fortschreibung: Baue public/mieten-fortschreibung.json mit "
        "python scripts/build_mieten_fortschreibung.py neu, sobald Destatis das Vorjahr in "
        "Tabelle 61111-0020 veröffentlicht hat, und prüfe die Faktoren auf Plausibilität.",
    },
    {
        "key": "PLZ_DATEN",
        "titel": "PLZ-Zuordnungen und Ortsmiete",
        "monate": [3],
        "quelle": "amtliche PLZ-/Gemeindeverzeichnisse, Zensus",
        "datei": "`public/plz-kreis.txt`, `public/plz-geo.txt`, `public/miete-referenz.txt`",
        "verwendung": "Zuordnung PLZ → Kreis für alle Regionalvergleiche, Karte auf der Objektseite, Ortsmiete",
        "claude": "Datenpflege PLZ-Daten: Prüfe, ob es neue PLZ-/Gemeindezuordnungen oder einen neuen Zensus "
        "gibt, und baue bei Bedarf plz-kreis.txt, plz-geo.txt und miete-referenz.txt mit den Skripten in "
        "scripts/ neu (build_plz_kreis.mjs, build_miete_referenz.py).",
    },
]


def jetzt():
    return datetime.now(BERLIN) if BERLIN else datetime.now()


def stand_lesen(data_js, name):
    m = re.search(rf"export const {name} = \{{.*?stand:\s*\"([^\"]+)\"", data_js, re.S)
    return m.group(1) if m else None


def monate_seit(stand, heute):
    """Alter eines stand-Feldes in Monaten ("Mai 2026" oder "Q1 2026")."""
    if not stand:
        return None
    m = re.match(r"Q([1-4]) (\d{4})", stand)
    if m:
        jahr, monat = int(m.group(2)), int(m.group(1)) * 3  # Quartalsende
    else:
        teile = stand.split()
        if len(teile) != 2 or teile[0] not in MONATE:
            return None
        jahr, monat = int(teile[1]), MONATE.index(teile[0]) + 1
    return (heute.year - jahr) * 12 + heute.month - monat


def veraltete_automatik(heute):
    """Werte, die der Monatsjob selbst holen sollte, deren Abruf aber haengt."""
    data_js = open(DATA_JS, encoding="utf-8").read()
    themen = []
    pf = stand_lesen(data_js, "PFANDBRIEF")
    alter = monate_seit(pf, heute)
    if alter is not None and alter >= 2:
        themen.append({
            "key": "PFANDBRIEF",
            "titel": f"Pfandbrief-Zins veraltet (Stand {pf})",
            "quelle": "Deutsche Bundesbank, Zeitreihen-Datenbank, Reihe BBK01.WU8148 (Hypothekenpfandbriefe 10 J.)",
            "datei": "`src/data.js` → `PFANDBRIEF`",
            "verwendung": "Vorfälligkeitsrechner: Wiederanlagezins",
            "claude": f"Datenpflege PFANDBRIEF: Der automatische Abruf hängt, der Wert steht seit {pf}. "
            "Trage den aktuellen Monatswert der Bundesbank-Reihe BBK01.WU8148 in PFANDBRIEF (src/data.js) ein "
            "und prüfe, warum fetch_pfandbrief() in scripts/monthly_update.py scheitert.",
        })
    ws = stand_lesen(data_js, "WERTSTEIGERUNG")
    alter = monate_seit(ws, heute)
    # Destatis veroeffentlicht ein Quartal rund drei Monate nach seinem Ende.
    if alter is not None and alter > 6:
        themen.append({
            "key": "WERTSTEIGERUNG",
            "titel": f"Wertsteigerung veraltet (Stand {ws})",
            "quelle": "Destatis GENESIS, Häuserpreisindex Tabelle 61262-0002",
            "datei": "`src/data.js` → `WERTSTEIGERUNG`",
            "verwendung": "Renditerechner (Vorbelegung Wertsteigerung), Landingpage „Echte Marktdaten“",
            "vorher": "Prüfe, ob die GitHub-Secrets `GENESIS_USER` und `GENESIS_PASS` hinterlegt sind "
            "(Repo → Settings → Secrets → Actions). Ohne sie kann der Monatsjob den Wert nicht holen.",
            "claude": f"Datenpflege WERTSTEIGERUNG: Der Wert steht seit {ws}. Prüfe im Log des letzten "
            "Monatsjobs, warum der GENESIS-Abruf nichts geschrieben hat, und trage notfalls die aktuelle "
            "Vorjahresveränderung des Häuserpreisindex (61262-0002) von Hand ein.",
        })
    return themen


def body(t, periode):
    teile = [f"<!-- datenpflege:{t['key']}:{periode} -->", f"**Fällig:** {periode}", ""]
    if t.get("vorher"):
        teile += ["### Zuerst du", t["vorher"], ""]
    teile += [
        "### Was",
        f"- **Quelle:** {t['quelle']}",
        f"- **Datei:** {t['datei']}",
        f"- **Verwendet in:** {t['verwendung']}",
        "",
        "### Sag Claude (kopieren)",
        "```",
        f"{t['claude']} {ABSCHLUSS}",
        "```",
        "",
        "Wenn erledigt oder nichts zu ändern ist: dieses Issue schließen.",
        "",
        "_Automatisch erzeugt von `.github/workflows/datenpflege-erinnerung.yml` "
        "(`scripts/datenpflege_erinnerung.py`)._",
    ]
    return "\n".join(teile)


def gh(*args, eingabe=None):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True, input=eingabe).stdout


def main():
    heute = jetzt()
    if os.environ.get("TESTMONAT"):
        heute = heute.replace(month=int(os.environ["TESTMONAT"]), day=1)
    trocken = os.environ.get("TROCKEN", "").lower() in ("ja", "true", "1")
    periode = f"{MONATE[heute.month - 1]} {heute.year}"
    data_js = open(DATA_JS, encoding="utf-8").read()
    faellig = []
    for t in THEMEN:
        if heute.month not in t["monate"]:
            continue
        # Diesen Monat schon gepflegt (stand = laufender Monat) -> keine Erinnerung
        if t.get("konst") and monate_seit(stand_lesen(data_js, t["konst"]), heute) == 0:
            print(f"  ✓ {t['key']}: Stand ist bereits {periode}, übersprungen")
            continue
        faellig.append(t)
    faellig += veraltete_automatik(heute)
    print(f"Monat {periode}: {len(faellig)} Thema/Themen fällig" + (" (TROCKEN)" if trocken else ""))
    for t in faellig:
        print(f"  - {t['key']}: {t['titel']}")
    if trocken or not faellig:
        if trocken:
            for t in faellig:
                print("\n" + "=" * 70 + f"\n🗓️ Datenpflege {periode}: {t['titel']}\n" + body(t, periode))
        return

    repo = os.environ["GITHUB_REPOSITORY"]
    owner = os.environ.get("GITHUB_REPOSITORY_OWNER", "")
    gh("label", "create", LABEL, "--repo", repo, "--color", "E8600A",
       "--description", "Erinnerung an die Datenpflege", "--force")
    offen = json.loads(gh("issue", "list", "--repo", repo, "--label", LABEL, "--state", "open",
                          "--limit", "200", "--json", "number,body"))
    for t in faellig:
        marker = f"<!-- datenpflege:{t['key']}:"
        alt = next((i for i in offen if marker in (i.get("body") or "")), None)
        if alt and f"{marker}{periode} -->" in alt["body"]:
            print(f"  = {t['key']}: Issue #{alt['number']} für {periode} existiert schon")
            continue
        if alt:
            gh("issue", "comment", str(alt["number"]), "--repo", repo, "--body",
               f"Wieder fällig: **{periode}** – dieses Issue ist noch offen. Anweisung siehe oben.")
            print(f"  ↻ {t['key']}: Kommentar an Issue #{alt['number']}")
            continue
        args = ["issue", "create", "--repo", repo, "--title", f"🗓️ Datenpflege {periode}: {t['titel']}",
                "--label", LABEL, "--body-file", "-"]
        if owner:
            args += ["--assignee", owner]
        url = gh(*args, eingabe=body(t, periode)).strip()
        print(f"  + {t['key']}: {url}")


if __name__ == "__main__":
    main()
