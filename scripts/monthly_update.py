#!/usr/bin/env python3
"""
ImmoFuchs Monthly Data Update
Runs on the 1st of each month via GitHub Actions.
Updates src/data.js (MARKET_RATES), src/i18n/translations.js (ratesTip
Stand-Datum) und public/zinsen.json (Live-Datenquelle der Landingpage).

Bauzinsen-Ermittlung (2026-08-24 umgestellt, kein LLM mehr noetig):
  1. Deutsche Bundesbank: Rendite 10J Bundeswertpapier + 0,75 Aufschlag
     (Naeherung Bundesanleihe → Hypothekenzins), aus dem taeglich
     aktualisierten PDF "rendbund-data.pdf" (letzter Handelstag).
  2. Interhyp: Zinstabelle "10 Jahre" Zinsbindung, Eigen-Durchschnitt der
     drei Beleihungsauslauf-Klassen <70 / =80 / >90 (Seite ist
     clientseitig gerendert, daher Playwright statt requests).
  avg  = Durchschnitt aus 1. und 2. - die einzige Zinsangabe (kein
         separater "Topzins" mehr, siehe 2026-08-24 Folge-Anpassung).
Grund fuer die Umstellung: die vorherigen 7 Marketing-Webseiten liefern
groesstenteils nur clientseitig gerendertes JS/CSS ohne Zahlenwerte an
einen simplen requests.get() - das liess Claude fast jeden Monat
"unchanged" antworten (siehe Vorfall 24.08.2026: main/QA zeigten
monatelang Mai-Zinsen trotz laufendem Job).
"""

import os, re, json
from datetime import date, datetime

import requests
import pdfplumber
from playwright.sync_api import sync_playwright

# ── Paths ──────────────────────────────────────────────────────────────────
REPO_ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS         = os.path.join(REPO_ROOT, "src", "data.js")
TRANSLATIONS_JS = os.path.join(REPO_ROOT, "src", "i18n", "translations.js")
ZINSEN_JSON     = os.path.join(REPO_ROOT, "public", "zinsen.json")
DATENSTATUS_HTML = os.path.join(REPO_ROOT, "public", "datenstatus.html")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ImmoFuchsBot/1.0; +https://immofuchs.info)"
}

BUNDESBANK_PDF_URL = (
    "https://www.bundesbank.de/resource/blob/772218/"
    "ea383861edaaf9516c5e1a3e20fa93f0/472B63F073F071307366337C94F8C870/rendbund-data.pdf"
)
INTERHYP_URL = "https://www.interhyp.de/zinsen/"

# GENESIS-Online (Statistisches Bundesamt), Haeuserpreisindex nach Quartalen.
# Liefert die Wertsteigerung fuer die Landingpage-Datentafel und zugleich die
# Vorbelegung des Renditerechner-Eingabefelds (data.js WERTSTEIGERUNG).
GENESIS_URL = "https://www-genesis.destatis.de/genesisWS/rest/2020/data/tablefile"
GENESIS_TABLE = "61262-0002"

# Faelligkeitspruefung: Konstante -> Pflegeintervall in Monaten. Erfasst sind
# nur Konstanten mit einem stand-Feld in data.js. Das Skript aktualisiert
# diese Werte nicht selbst (ausser MARKET_RATES, PFANDBRIEF und
# WERTSTEIGERUNG), sondern meldet, was ueberfaellig ist - damit die
# Intervall-Angaben in data.js nicht folgenlos bleiben.
# Die Quartalsreihen stehen auf 6 Monate statt 3: Destatis und BDEW
# veroeffentlichen mit rund zwei Monaten Verzug, ein Quartalswert ist also
# regulaer bis zu ~5 Monate alt. Bei 3 Monaten wuerde die Pruefung jeden
# Monat Alarm schlagen, ohne dass etwas zu tun waere.
PFLEGE_INTERVALL = {
    "MARKET_RATES": 1,
    "PFANDBRIEF": 1,
    "WERTSTEIGERUNG": 6,
    "MIET_P": 6,
    "KFW": 3,
    "BAFA": 3,
    "SAN_ENERGIE": 6,
    "KFW_KREDIT": 3,
    "SAN_TIERS": 6,
}

# Anzeige-Metadaten fuer public/datenstatus.html - rein informativ, steuert
# nichts an der eigentlichen Pruefung. "automatisiert" = wird von diesem
# Skript selbst geschrieben (MARKET_RATES/PFANDBRIEF/WERTSTEIGERUNG) oder
# muss von Hand in data.js gepflegt werden (Rest).
DATENSTATUS_META = {
    "MARKET_RATES": {"label": "Bauzinsen", "rechner": "Renditerechner, Kreditrechner", "automatisiert": True},
    "PFANDBRIEF": {"label": "Wiederanlagezins (Pfandbrief)", "rechner": "Vorfälligkeitsrechner", "automatisiert": True},
    "WERTSTEIGERUNG": {"label": "Wertsteigerung Wohnimmobilien", "rechner": "Renditerechner, Landingpage", "automatisiert": True},
    "MIET_P": {"label": "Mietpreisprognose", "rechner": "Mieterhöhungsrechner", "automatisiert": False},
    "KFW": {"label": "KfW-Förderquoten (BEG)", "rechner": "Sanierungsrechner", "automatisiert": False},
    "BAFA": {"label": "BAFA-Förderung", "rechner": "Sanierungsrechner", "automatisiert": False},
    "SAN_ENERGIE": {"label": "Energiepreise & CO₂-Faktoren", "rechner": "Sanierungsrechner", "automatisiert": False},
    "KFW_KREDIT": {"label": "KfW-Förderkredit-Konditionen", "rechner": "Kreditrechner", "automatisiert": False},
    "SAN_TIERS": {"label": "Sanierungs-Maßnahmenkosten", "rechner": "Sanierungsrechner", "automatisiert": False},
}

# ── Month name tables ──────────────────────────────────────────────────────
MONTH_DE = ["Januar","Februar","März","April","Mai","Juni",
            "Juli","August","September","Oktober","November","Dezember"]
MONTH_EN = ["January","February","March","April","May","June",
            "July","August","September","October","November","December"]
MONTH_TR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
            "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"]
MONTH_HI = ["जनवरी","फ़रवरी","मार्च","अप्रैल","मई","जून",
            "जुलाई","अगस्त","सितंबर","अक्टूबर","नवंबर","दिसंबर"]


# ── Helpers ────────────────────────────────────────────────────────────────

def replace_simple(data_js: str, pattern: str, new_val, label: str, changes: list) -> str:
    """Replace a single captured group in data_js, record change."""
    if new_val is None:
        return data_js
    m = re.search(pattern, data_js)
    if not m:
        print(f"  ⚠ Pattern not found: {label}")
        return data_js
    old_val = m.group(1)
    new_str = str(new_val)
    if old_val == new_str:
        return data_js
    changes.append(f"  {label}: {old_val} → {new_str}")
    return data_js[:m.start(1)] + new_str + data_js[m.end(1):]


def replace_market_rates_block(data_js: str, stand: str, avg, changes: list) -> str:
    """Ersetzt den kompletten MARKET_RATES-Block (rows[]/top entfallen seit
    2026-08-24 - eine einzelne ermittelte Zinsangabe statt 5 benannter
    Quellen bzw. separatem Topzins)."""
    if avg is None:
        return data_js
    pattern = re.compile(r"export const MARKET_RATES = \{[\s\S]*?\n\};\n")
    new_block = (
        "export const MARKET_RATES = {\n"
        f'  stand: "{stand}",\n'
        f"  avg: {avg},\n"
        "};\n"
    )
    m = pattern.search(data_js)
    if not m:
        print("  ⚠ MARKET_RATES-Block nicht gefunden")
        return data_js
    if m.group(0) == new_block:
        return data_js
    changes.append(f"  MARKET_RATES: stand={stand}, avg={avg}")
    return data_js[: m.start()] + new_block + data_js[m.end() :]


# ── Quelle 3: Statistisches Bundesamt (GENESIS-Online REST-API) ───────────

def parse_genesis_hpi(text: str):
    """Aus der ffcsv-Antwort die juengste Jahresveraenderungsrate des
    Haeuserpreisindex (Wohnimmobilien insgesamt, Deutschland) rechnen.

    Bewusst tolerant und im Zweifel None: lieber keinen Wert schreiben als
    einen falschen. Erkannt wird die Reihe ueber das Merkmalslabel
    ("insgesamt"), die Quartale ueber JAHR/QUARTAL-Spalten.
    """
    import csv, io as _io

    reihe = {}
    try:
        rd = csv.DictReader(_io.StringIO(text), delimiter=";")
        for row in rd:
            low = {(k or "").lower(): (v or "").strip() for k, v in row.items()}
            label = " ".join(v for k, v in low.items() if k.endswith("_label")).lower()
            if "insgesamt" not in label:
                continue
            jahr = next((v for k, v in low.items() if k in ("zeit", "jahr", "time")), "")
            quartal = next((v for k, v in low.items() if "quartal" in k or k == "zeit_label"), "")
            wert = next((v for k, v in low.items() if k in ("value", "wert")), "")
            j = re.search(r"(20\d{2})", str(jahr))
            q = re.search(r"([1-4])", str(quartal))
            w = str(wert).replace(",", ".")
            if not (j and q):
                continue
            try:
                reihe[(int(j.group(1)), int(q.group(1)))] = float(w)
            except ValueError:
                continue
    except Exception as e:
        print(f"  ✗ GENESIS-Antwort nicht lesbar: {e}")
        return None

    if len(reihe) < 5:
        print(f"  ✗ GENESIS: nur {len(reihe)} Quartalswerte erkannt — zu wenig")
        return None

    jahr, quartal = max(reihe)
    vorjahr = reihe.get((jahr - 1, quartal))
    if not vorjahr:
        print(f"  ✗ GENESIS: Vorjahresquartal Q{quartal}/{jahr - 1} fehlt")
        return None
    rate = round((reihe[(jahr, quartal)] / vorjahr - 1) * 100, 1)
    return rate, f"Q{quartal} {jahr}"


def fetch_wertsteigerung():
    """Jahresveraenderungsrate des Haeuserpreisindex aus GENESIS-Tabelle
    61262-0002. Zugangsdaten aus GENESIS_USER/GENESIS_PASS (GitHub-Secrets).

    Fehlen die Zugangsdaten oder schlaegt der Abruf fehl, bleibt
    WERTSTEIGERUNG unveraendert - dieselbe Fail-Safe-Logik wie bei den
    Zinsquellen.

    ACHTUNG (2026-08-25): Bei der Einfuehrung lag noch kein GENESIS-Konto
    vor, die Funktion konnte also nicht gegen die echte API getestet werden.
    Der erste Lauf ist zu pruefen - Wert und Quartal werden vor dem
    Schreiben ausgegeben.
    """
    user, pw = os.environ.get("GENESIS_USER"), os.environ.get("GENESIS_PASS")
    if not user or not pw:
        print("  ⚠ GENESIS_USER/GENESIS_PASS nicht gesetzt — WERTSTEIGERUNG bleibt unveraendert")
        return None
    try:
        r = requests.get(
            GENESIS_URL,
            params={
                "username": user,
                "password": pw,
                "name": GENESIS_TABLE,
                "area": "all",
                "format": "ffcsv",
                "compress": "false",
                "language": "de",
            },
            headers=HEADERS,
            timeout=60,
        )
        r.raise_for_status()
        return parse_genesis_hpi(r.text)
    except Exception as e:
        print(f"  ✗ GENESIS-Abruf fehlgeschlagen: {e}")
        return None


def sammle_konstanten_status(data_js: str, now):
    """Liest fuer jede Konstante in PFLEGE_INTERVALL den stand-Wert aus data.js
    und berechnet ihr Alter in Monaten. Aendert nichts - reine Auswertung,
    Basis fuer die Faelligkeitsmeldung UND fuer public/datenstatus.html."""
    monate = {m: i + 1 for i, m in enumerate(MONTH_DE)}
    status = []
    for name, intervall in PFLEGE_INTERVALL.items():
        m = re.search(
            r"export const " + name + r"\s*=\s*\{[^}]*?stand:\s*\"([^\"]+)\"",
            data_js,
            re.DOTALL,
        )
        if not m:
            continue
        stand = m.group(1)
        q = re.match(r"Q([1-4])\s+(20\d{2})", stand)
        mo = re.match(r"(\w+)\s+(20\d{2})", stand)
        if q:
            jahr, monat = int(q.group(2)), int(q.group(1)) * 3
        elif mo and mo.group(1) in monate:
            jahr, monat = int(mo.group(2)), monate[mo.group(1)]
        else:
            continue
        alter = (now.year - jahr) * 12 + (now.month - monat)
        status.append({
            "name": name,
            "stand": stand,
            "alter": alter,
            "intervall": intervall,
            "ueberfaellig": alter > intervall,
            "bald_faellig": alter == intervall,
            **DATENSTATUS_META.get(name, {"label": name, "rechner": "—", "automatisiert": False}),
        })
    return status


def render_datenstatus_html(status: list, now) -> str:
    """Baut public/datenstatus.html - Ampel-Uebersicht aller gepflegten
    Konstanten, im ImmoFuchs-Look (Tokens aus CLAUDE.md)."""
    rows = ""
    for s in sorted(status, key=lambda x: (-x["alter"] / max(x["intervall"], 1))):
        ampel = "🔴" if s["ueberfaellig"] else "🟡" if s["bald_faellig"] else "🟢"
        auto = "automatisch" if s["automatisiert"] else "manuell"
        rows += f"""
        <tr>
          <td>{ampel}</td>
          <td>{s['label']}<br><span class="sub">{s['name']}</span></td>
          <td>{s['rechner']}</td>
          <td>{s['stand']}</td>
          <td>{s['alter']} / {s['intervall']} Monate</td>
          <td>{auto}</td>
        </tr>"""

    return f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ImmoFuchs — Datenstatus</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root {{
    --ca:#E8600A; --ca-dk:#C44D00; --bg:#F5F5F0; --cc:#FFFFFF;
    --ct:#1A1A1A; --ch:#8A8A80; --cb:#E5E5DC;
  }}
  * {{ box-sizing:border-box; }}
  body {{
    margin:0; padding:32px 16px; background:var(--bg); color:var(--ct);
    font-family:'DM Sans', sans-serif;
  }}
  .wrap {{ max-width:900px; margin:0 auto; }}
  h1 {{ font-size:22px; margin:0 0 4px; }}
  .meta {{ color:var(--ch); font-size:13px; margin-bottom:24px; }}
  table {{
    width:100%; border-collapse:collapse; background:var(--cc);
    border:1px solid var(--cb); border-radius:12px; overflow:hidden;
  }}
  th, td {{ text-align:left; padding:10px 12px; font-size:13px; border-bottom:1px solid var(--cb); }}
  th {{ background:#FAFAF7; font-weight:600; color:var(--ch); text-transform:uppercase; font-size:11px; letter-spacing:.5px; }}
  tr:last-child td {{ border-bottom:none; }}
  .sub {{ color:var(--ch); font-size:11px; }}
  .legend {{ margin-top:16px; font-size:12px; color:var(--ch); }}
</style>
</head>
<body>
  <div class="wrap">
    <h1>📊 ImmoFuchs Datenstatus</h1>
    <div class="meta">Letzter Lauf: {now.strftime('%d.%m.%Y %H:%M')} Uhr · scripts/monthly_update.py</div>
    <table>
      <thead>
        <tr><th></th><th>Konstante</th><th>Rechner</th><th>Stand</th><th>Alter</th><th>Pflege</th></tr>
      </thead>
      <tbody>{rows}
      </tbody>
    </table>
    <div class="legend">🟢 aktuell · 🟡 diesen Monat fällig · 🔴 überfällig — automatisch gepflegte Werte werden von diesem Skript geschrieben, manuelle muss ein Mensch in src/data.js aktualisieren.</div>
  </div>
</body>
</html>
"""


def pruefe_faelligkeit(status: list):
    """Formatiert die ueberfaelligen Eintraege aus sammle_konstanten_status
    fuer Log-Ausgabe und GitHub-Issue-Text. Aendert nichts."""
    return [
        f"  ⚠ {s['name']} ({s['label']}): Stand {s['stand']} — {s['alter']} Monate alt (Intervall {s['intervall']})"
        for s in status if s["ueberfaellig"]
    ]


# ── Quelle 1: Deutsche Bundesbank (PDF, taeglich aktualisiert) ─────────────

def fetch_bundesbank_10j():
    """Letzte Tageszeile aus rendbund-data.pdf, Spalte '10 Jahre'."""
    try:
        r = requests.get(BUNDESBANK_PDF_URL, headers=HEADERS, timeout=20)
        r.raise_for_status()
        tmp_path = os.path.join(REPO_ROOT, "_rendbund-tmp.pdf")
        with open(tmp_path, "wb") as f:
            f.write(r.content)
        with pdfplumber.open(tmp_path) as pdf:
            text = pdf.pages[0].extract_text()
        os.remove(tmp_path)

        # Tageszeilen, z.B. "24. 3,75 3,68 3,54 3,24 3,02 2,97 2,84"
        # Spalten: 30J 20J 15J 10J 7J 5J(Bundesobl.) 2J(Bundesschatz)
        pattern = re.compile(
            r"^\s*(\d{1,2})\.\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*$",
            re.MULTILINE,
        )
        matches = pattern.findall(text)
        if not matches:
            print("  ⚠ Bundesbank-PDF: keine Tageszeile gefunden")
            return None
        _, _, _, _, y10, *_ = matches[-1]
        return round(float(y10.replace(",", ".")), 2)
    except Exception as e:
        print(f"  ⚠ Bundesbank-PDF Fehler: {e}")
        return None


# ── Quelle 2: Interhyp (clientseitig gerendert → Playwright) ───────────────

def fetch_interhyp_10j():
    """Zinstabelle 'Effektiver Jahreszins', Zeile '10 Jahre', gibt
    (Beleihungsauslauf<70, =80, >90) als Floats zurueck."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(user_agent=HEADERS["User-Agent"])
            page.goto(INTERHYP_URL, timeout=30000, wait_until="networkidle")
            text = page.inner_text("body")
            browser.close()

        pattern = re.compile(
            r"Zinsbindung Tranche.*?\n\s*10\s*\n+\s*([\d,]+)\s*%\s*\n+\s*([\d,]+)\s*%\s*\n+\s*([\d,]+)\s*%",
            re.DOTALL,
        )
        m = pattern.search(text)
        if not m:
            print("  ⚠ Interhyp: Zinstabelle nicht gefunden/geaendertes Layout")
            return None
        lt70, eq80, gt90 = (float(x.replace(",", ".")) for x in m.groups())
        return lt70, eq80, gt90
    except Exception as e:
        print(f"  ⚠ Interhyp Fehler: {e}")
        return None


# ── Pfandbrief (Wiederanlagezins Vorfaelligkeitsrechner) - unveraendert ────

def fetch_pfandbrief_zins() -> float | None:
    """Fetch current Hypothekenpfandbrief yield (10Y) from Bundesbank API.
    Series: BBK01.WU8148 — Umlaufrendite Hypothekenpfandbriefe 10J"""
    try:
        start = date.today().replace(day=1).isoformat()[:7]  # YYYY-MM
        url = (
            "https://api.bundesbank.de/service/data/BBK/BBK01.WU8148"
            f"?detail=dataonly&startPeriod={start}&format=json"
        )
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        data = r.json()
        obs = data["dataSets"][0]["series"]["0:0:0:0:0"]["observations"]
        latest_key = max(obs.keys(), key=int)
        value = obs[latest_key][0]
        return round(float(value), 2) if value is not None else None
    except Exception as e:
        print(f"  ⚠ Bundesbank API Fehler: {e}")
        return None


def main():
    now   = datetime.now()
    m_idx = now.month - 1   # 0-based
    year  = now.year
    new_stand = f"{MONTH_DE[m_idx]} {year}"

    print(f"=== ImmoFuchs Data Update — {now.strftime('%d.%m.%Y')} ===\n")

    # ── 1. Bauzinsen ermitteln ─────────────────────────────────────────────
    print("Fetching Bundesbank 10J-Rendite (PDF)...")
    bbk_10j = fetch_bundesbank_10j()
    print(f"  {'✓' if bbk_10j is not None else '✗'} Bundesbank 10J: {bbk_10j}")

    print("\nFetching Interhyp 10J-Zinstabelle...")
    interhyp = fetch_interhyp_10j()
    interhyp_avg = None
    if interhyp:
        lt70, eq80, gt90 = interhyp
        interhyp_avg = round((lt70 + eq80 + gt90) / 3, 2)
        print(f"  ✓ Interhyp 10J: <70={lt70}  =80={eq80}  >90={gt90}  (Ø {interhyp_avg})")
    else:
        print("  ✗ Interhyp 10J nicht verfuegbar")

    bbk_adjusted = round(bbk_10j + 0.75, 2) if bbk_10j is not None else None

    final_avg = None
    if bbk_adjusted is not None and interhyp_avg is not None:
        final_avg = round((bbk_adjusted + interhyp_avg) / 2, 2)
        print(f"\n=> Zins (Ø aus Bundesbank+0,75={bbk_adjusted} und Interhyp-Ø={interhyp_avg}): {final_avg} %")
    else:
        print("\n⚠ Mindestens eine Quelle nicht verfuegbar — MARKET_RATES/zinsen.json bleiben unveraendert.")

    # ── 2. data.js aktualisieren ────────────────────────────────────────────
    print("\nApplying updates to data.js...")
    data_js = open(DATA_JS, encoding="utf-8").read()
    changes = []

    data_js = replace_market_rates_block(data_js, new_stand, final_avg, changes)

    # PFANDBRIEF (separate Datenreihe, unveraendert seit jeher ueber die
    # Bundesbank-API BBK01.WU8148, die momentan Verbindungsfehler wirft)
    print("\nFetching Pfandbrief yield from Bundesbank API...")
    pfandbrief_zins = fetch_pfandbrief_zins()
    if pfandbrief_zins:
        print(f"  ✓ Pfandbrief 10J: {pfandbrief_zins} %")
        data_js = replace_simple(
            data_js,
            r"(?s)export const PFANDBRIEF[^{]*\{[^}]*zins:\s*([\d.]+)",
            pfandbrief_zins, "PFANDBRIEF.zins", changes
        )
        pf_stand = new_stand
        pf_match = re.search(r'export const PFANDBRIEF\s*=\s*\{[^}]*stand:\s*"([^"]+)"', data_js, re.DOTALL)
        if pf_match:
            old_pf_stand = pf_match.group(1)
            if old_pf_stand != pf_stand:
                changes.append(f"  PFANDBRIEF.stand: {old_pf_stand} → {pf_stand}")
                data_js = data_js[: pf_match.start(1)] + pf_stand + data_js[pf_match.end(1) :]
    else:
        print("  ⚠ Pfandbrief yield nicht verfügbar — Wert unverändert")

    # WERTSTEIGERUNG (Haeuserpreisindex). Speist zugleich die Vorbelegung des
    # Renditerechner-Feldes, siehe App.jsx defaults.wertP.
    print("\nFetching Haeuserpreisindex from GENESIS (Destatis)...")
    ws = fetch_wertsteigerung()
    if ws:
        ws_rate, ws_stand = ws
        print(f"  ✓ Wertsteigerung {ws_stand}: {ws_rate} % zum Vorjahresquartal")
        data_js = replace_simple(
            data_js,
            r"(?s)export const WERTSTEIGERUNG[^{]*\{[^}]*pA:\s*(-?[\d.]+)",
            ws_rate, "WERTSTEIGERUNG.pA", changes
        )
        data_js = replace_simple(
            data_js,
            r'(?s)export const WERTSTEIGERUNG[^{]*\{[^}]*stand:\s*"([^"]+)"',
            ws_stand, "WERTSTEIGERUNG.stand", changes
        )

    if data_js != open(DATA_JS, encoding="utf-8").read():
        open(DATA_JS, "w", encoding="utf-8").write(data_js)
        print(f"✓ data.js — {len(changes)} Änderungen:")
        for c in changes:
            print(c)
    else:
        print("  data.js — keine Änderungen")

    # ── 3. ratesTip in src/i18n/translations.js (5 languages) ──────────────
    print("\nUpdating ratesTip in translations.js...")
    i18n_content = open(TRANSLATIONS_JS, encoding="utf-8").read()
    i18n_changed = []

    tip_replacements = [
        (r'Stand [A-Za-zÄÖÜäöüß]+ \d{4}\."',   f'Stand {MONTH_DE[m_idx]} {year}."',       "DE"),
        (r'As of [A-Za-z]+ \d{4}\."',            f'As of {MONTH_EN[m_idx]} {year}."',        "EN"),
        (r'(?:' + '|'.join(MONTH_TR) + r') \d{4}\."', f'{MONTH_TR[m_idx]} {year}."',        "TR"),
        (r'\d{4} 年 \d{1,2} 月。"',              f'{year} 年 {m_idx + 1} 月。"',             "ZH"),
        (r'(?:' + '|'.join(MONTH_HI) + r') \d{4}।"', f'{MONTH_HI[m_idx]} {year}।"',        "HI"),
    ]

    for pattern, new_val, lang in tip_replacements:
        matches = list(re.finditer(pattern, i18n_content))
        if len(matches) == 1:
            old = matches[0].group(0)
            if old != new_val:
                i18n_content = i18n_content[:matches[0].start()] + new_val + i18n_content[matches[0].end():]
                i18n_changed.append(f"  ratesTip[{lang}]: {old} → {new_val}")
        elif len(matches) == 0:
            print(f"  ⚠ ratesTip[{lang}]: pattern not found — skipped")
        else:
            print(f"  ⚠ ratesTip[{lang}]: {len(matches)} matches — skipped (safety)")

    if i18n_content != open(TRANSLATIONS_JS, encoding="utf-8").read():
        open(TRANSLATIONS_JS, "w", encoding="utf-8").write(i18n_content)
        print(f"✓ translations.js — {len(i18n_changed)} Änderungen:")
        for c in i18n_changed:
            print(c)
    else:
        print("  translations.js — keine Änderungen")

    # ── 4. public/zinsen.json (Live-Quelle der Landingpage) ────────────────
    print("\nUpdating public/zinsen.json...")
    zinsen = json.loads(open(ZINSEN_JSON, encoding="utf-8").read())
    zinsen_changed = []

    if final_avg is not None:
        new_zinsen_stand = f"{year}-{now.month:02d}"
        new_hinweis = (
            "Bauzinsen (10J): Durchschnitt aus Bundesbank-Rendite Bundeswertpapiere und "
            "Interhyp-Konditionsvergleich. Automatisiert aktualisiert (scripts/monthly_update.py). "
            f"Stand: {new_stand}."
        )
        for key, new_val in (
            ("stand", new_zinsen_stand),
            ("hinweis", new_hinweis),
            ("avg", final_avg),
            ("bundesanleihe_10j", bbk_10j),
        ):
            if zinsen.get(key) != new_val:
                zinsen_changed.append(f"  {key}: {zinsen.get(key)} → {new_val}")
                zinsen[key] = new_val
        # alte, namentliche Quellenliste entfaellt (2026-08-24 umgestellt)
        if "quellen" in zinsen:
            del zinsen["quellen"]
            zinsen_changed.append("  quellen[]: entfernt (keine namentlichen Quellen mehr)")
        # Topzins entfaellt (2026-08-24 Folge-Anpassung) - nur noch eine Zinsangabe
        if "top" in zinsen:
            del zinsen["top"]
            zinsen_changed.append("  top: entfernt (keine separate Topzins-Angabe mehr)")

    if zinsen_changed:
        open(ZINSEN_JSON, "w", encoding="utf-8").write(json.dumps(zinsen, indent=2, ensure_ascii=False) + "\n")
        print(f"✓ zinsen.json — {len(zinsen_changed)} Änderungen:")
        for c in zinsen_changed:
            print(c)
    else:
        print("  zinsen.json — keine Änderungen")

    # ── 5. Faelligkeitspruefung + Datenstatus-Seite (meldet nur, aendert
    #      an data.js nichts) ────────────────────────────────────────────────
    status = sammle_konstanten_status(open(DATA_JS, encoding="utf-8").read(), now)
    faellig = pruefe_faelligkeit(status)
    if faellig:
        print("\nHandpflege ueberfaellig:")
        for f in faellig:
            print(f)
    else:
        print("\nHandpflege: alle Werte innerhalb ihres Intervalls")

    print("\nSchreibe public/datenstatus.html...")
    open(DATENSTATUS_HTML, "w", encoding="utf-8").write(render_datenstatus_html(status, now))
    print("  ✓ datenstatus.html aktualisiert")

    # An den Workflow melden, ob ein Faelligkeits-Issue noetig ist. Ohne
    # GITHUB_OUTPUT (z.B. lokaler Lauf) wird das einfach uebersprungen.
    gh_output = os.environ.get("GITHUB_OUTPUT")
    if gh_output:
        with open(gh_output, "a", encoding="utf-8") as f:
            f.write("overdue<<EOF_OVERDUE\n")
            f.write("\n".join(faellig))
            f.write("\nEOF_OVERDUE\n")

    total = len(changes) + len(i18n_changed) + len(zinsen_changed)
    print(f"\n=== Abgeschlossen — {total} Änderungen gesamt ===")


if __name__ == "__main__":
    main()
