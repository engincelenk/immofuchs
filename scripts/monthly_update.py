#!/usr/bin/env python3
"""
ImmoFuchs Monthly Data Update
Runs on the 1st of each month via GitHub Actions.
Updates src/data.js (Bauzinsen, Energie) and src/App.jsx (ratesTip strings).
"""

import os, json, re, sys
from datetime import datetime

import anthropic
import requests

# ── Paths ──────────────────────────────────────────────────────────────────
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS   = os.path.join(REPO_ROOT, "src", "data.js")
APP_JSX   = os.path.join(REPO_ROOT, "src", "App.jsx")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ImmoFuchsBot/1.0; +https://immofuchs.info)"
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

def fetch(url: str) -> str:
    """Fetch URL, strip HTML tags, limit to 6000 chars."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        text = re.sub(r'<[^>]+>', ' ', r.text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:6000]
    except Exception as e:
        return f"[FETCH_ERROR: {e}]"


def replace_simple(data_js: str, pattern: str, new_val, label: str, changes: list) -> str:
    """Replace a single captured group in data_js, record change."""
    if new_val in (None, "unchanged", ""):
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


def replace_row_rate(data_js: str, source_name: str, new_rate: str, changes: list) -> str:
    """Replace rate field in rows[] entry identified by source name."""
    if not new_rate or new_rate == "unchanged":
        return data_js
    anchor_pos = data_js.find(f'source: "{source_name}"')
    if anchor_pos == -1:
        print(f"  ⚠ Row source not found: {source_name}")
        return data_js
    snippet = data_js[anchor_pos: anchor_pos + 300]
    rate_m = re.search(r'rate:\s*"([^"]*)"', snippet)
    if not rate_m:
        print(f"  ⚠ No rate field near: {source_name}")
        return data_js
    old_rate = rate_m.group(1)
    if old_rate == new_rate:
        return data_js
    abs_start = anchor_pos + rate_m.start(1)
    abs_end   = anchor_pos + rate_m.end(1)
    changes.append(f"  rows[{source_name}].rate: {old_rate} → {new_rate}")
    return data_js[:abs_start] + new_rate + data_js[abs_end:]


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    now   = datetime.now()
    m_idx = now.month - 1   # 0-based
    year  = now.year

    print(f"=== ImmoFuchs Data Update — {now.strftime('%d.%m.%Y')} ===\n")

    # ── 1. Fetch market data pages ─────────────────────────────────────────
    print("Fetching market data pages...")
    pages = {
        "drklein":   fetch("https://www.drklein.de/aktuelle-bauzinsen.html"),
        "interhyp":  fetch("https://www.interhyp.de/zinsen/"),
        "finanztip":  fetch("https://www.finanztip.de/baufinanzierung/hypothekenzinsen/"),
        "bdew":      fetch("https://www.bdew.de/energie/haushaltskunden/strompreise/"),
        "verivox":   fetch("https://www.verivox.de/strom/"),
        "kfw":       fetch("https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestandsimmobilien/"),
        "bafa":      fetch("https://www.bafa.de/DE/Energie/Effizient_Heizen/"),
    }
    for name, content in pages.items():
        status = "✓" if not content.startswith("[FETCH_ERROR") else "✗"
        print(f"  {status} {name}")

    # ── 2. Read current data.js ────────────────────────────────────────────
    current_data_js = open(DATA_JS, encoding="utf-8").read()

    # Extract current values for reference in the prompt
    def get_val(pattern, text):
        m = re.search(pattern, text)
        return m.group(1) if m else "?"

    current = {
        "stand":       get_val(r'stand:\s*"([^"]+)"', current_data_js),
        "avg":         get_val(r'avg:\s*([\d.]+)', current_data_js),
        "top":         get_val(r'top:\s*([\d.]+)', current_data_js),
        "stromCtKwh":  get_val(r'stromCtKwh:\s*([\d.]+)', current_data_js),
        "gasCtKwh":    get_val(r'gasCtKwh:\s*([\d.]+)', current_data_js),
        "heizölCtL":   get_val(r'heiz.lCtL:\s*([\d.]+)', current_data_js),
    }

    # ── 3. Call Claude API ─────────────────────────────────────────────────
    print("\nCalling Claude API for data extraction...")
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""Du extrahierst aktuelle Marktdaten für ImmoFuchs.info aus Webseiteninhalt.

Aktueller Monat: {MONTH_DE[m_idx]} {year}

AKTUELLE WERTE IN data.js:
  stand: "{current['stand']}"
  MARKET_RATES.avg: {current['avg']}  (Interhyp Ø 10J Sollzins)
  MARKET_RATES.top: {current['top']}  (Dr. Klein Topzins 10J)
  ENERGIE.stromCtKwh: {current['stromCtKwh']}  (Cent/kWh)
  ENERGIE.gasCtKwh: {current['gasCtKwh']}  (Cent/kWh)
  ENERGIE.heizölCtL: {current['heizölCtL']}  (Cent/Liter)

WEBSEITENINHALT:

=== Dr. Klein (Bauzinsen) ===
{pages['drklein'][:2500]}

=== Interhyp (Zinsen) ===
{pages['interhyp'][:2000]}

=== Finanztip (Hypothekenzinsen) ===
{pages['finanztip'][:2000]}

=== BDEW (Strompreise) ===
{pages['bdew'][:2000]}

=== Verivox (Strom/Gas) ===
{pages['verivox'][:1500]}

=== KfW (BEG Förderung) ===
{pages['kfw'][:1500]}

=== BAFA (Heizung) ===
{pages['bafa'][:1500]}

Analysiere die Webseiteninhalte und gib NUR ein JSON-Objekt zurück.
Regeln:
- Zahlen als number, nicht string (z.B. 3.80 nicht "3.80")
- Zins-Strings in deutschem Format (z.B. "3,52 % Sollzins")
- Bei nicht extrahierbarem Wert: schreibe "unchanged" (string)
- Kein Markdown, keine Erklärungen — nur JSON

{{
  "MARKET_RATES": {{
    "avg": <Interhyp Durchschnitt 10J Sollzins als Zahl>,
    "top": <Dr. Klein Topzins 10J als Zahl>,
    "row0_rate": "<Dr. Klein Topzins formatiert, z.B. '3,52 % Sollzins'>",
    "row1_rate": "<Interhyp Durchschnitt, z.B. 'ca. 3,90 %'>",
    "row2_rate": "<Finanztip Bandbreite, z.B. '3,9 – 4,4 % (effektiv)'>",
    "row3_rate": "<Vergleich.de Bandbreite, z.B. '3,75 – 4,10 %'>",
    "row4_rate": "<Bundesanleihe 10J mit Datum, z.B. '2,95 % (01.06.2026)'>"
  }},
  "ENERGIE": {{
    "stromCtKwh": <Haushaltsstrom Ø Deutschland Cent/kWh als Zahl>,
    "gasCtKwh": <Erdgas Ø Deutschland Cent/kWh als Zahl>,
    "heizölCtL": <Heizöl Ø Deutschland Cent/Liter als Zahl>
  }},
  "KFW_CHANGED": false,
  "BAFA_CHANGED": false,
  "notes": "<optionale kurze Anmerkungen falls etwas auffällig>"
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip()
    raw = re.sub(r'^```(?:json)?\n?', '', raw)
    raw = re.sub(r'\n?```$', '', raw)

    try:
        updates = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"❌ Claude returned invalid JSON: {e}")
        print(f"   Raw: {raw[:500]}")
        sys.exit(1)

    if updates.get("notes"):
        print(f"  ℹ Claude: {updates['notes']}")

    # ── 4. Apply updates to data.js ────────────────────────────────────────
    print("\nApplying updates to data.js...")
    data_js = current_data_js
    changes = []

    mr = updates.get("MARKET_RATES", {})

    # stand: always set to current month
    new_stand = f"{MONTH_DE[m_idx]} {year}"
    data_js = replace_simple(data_js, r'stand:\s*"([^"]+)"', new_stand, "MARKET_RATES.stand", changes)

    # avg, top (numeric)
    data_js = replace_simple(data_js, r'avg:\s*([\d.]+)',  mr.get("avg"), "MARKET_RATES.avg", changes)
    data_js = replace_simple(data_js, r'top:\s*([\d.]+)',  mr.get("top"), "MARKET_RATES.top", changes)

    # rows
    row_sources = [
        "Dr. Klein Topzins (10J)",
        "Interhyp Durchschnitt (10J)",
        "Finanztip",
        "Vergleich.de",
        "Bundesanleihe 10J (Referenz)",
    ]
    for i, source in enumerate(row_sources):
        val = mr.get(f"row{i}_rate")
        data_js = replace_row_rate(data_js, source, val, changes)

    # ENERGIE (numeric)
    en = updates.get("ENERGIE", {})
    data_js = replace_simple(data_js, r'stromCtKwh:\s*([\d.]+)',   en.get("stromCtKwh"),  "ENERGIE.stromCtKwh", changes)
    data_js = replace_simple(data_js, r'gasCtKwh:\s*([\d.]+)',     en.get("gasCtKwh"),    "ENERGIE.gasCtKwh",   changes)
    data_js = replace_simple(data_js, r'heiz.lCtL:\s*([\d.]+)',    en.get("heizölCtL"),   "ENERGIE.heizölCtL",  changes)

    if data_js != current_data_js:
        open(DATA_JS, "w", encoding="utf-8").write(data_js)
        print(f"✓ data.js — {len(changes)} Änderungen:")
        for c in changes:
            print(c)
    else:
        print("  data.js — keine Änderungen")

    # ── 5. Update App.jsx ratesTip (5 languages) ──────────────────────────
    print("\nUpdating ratesTip in App.jsx...")
    app_content = open(APP_JSX, encoding="utf-8").read()
    app_changed = []

    tip_replacements = [
        # Pattern to find current value         # New value
        (r'Stand [A-Za-zÄÖÜäöüß]+ \d{4}\."',   f'Stand {MONTH_DE[m_idx]} {year}."',       "DE"),
        (r'As of [A-Za-z]+ \d{4}\."',            f'As of {MONTH_EN[m_idx]} {year}."',        "EN"),
        (r'(?:' + '|'.join(MONTH_TR) + r') \d{4}\."', f'{MONTH_TR[m_idx]} {year}."',        "TR"),
        (r'\d{4} 年 \d{1,2} 月。"',              f'{year} 年 {m_idx + 1} 月。"',             "ZH"),
        (r'(?:' + '|'.join(MONTH_HI) + r') \d{4}।"', f'{MONTH_HI[m_idx]} {year}।"',        "HI"),
    ]

    for pattern, new_val, lang in tip_replacements:
        matches = list(re.finditer(pattern, app_content))
        if len(matches) == 1:
            old = matches[0].group(0)
            if old != new_val:
                app_content = app_content[:matches[0].start()] + new_val + app_content[matches[0].end():]
                app_changed.append(f"  ratesTip[{lang}]: {old} → {new_val}")
        elif len(matches) == 0:
            print(f"  ⚠ ratesTip[{lang}]: pattern not found — skipped")
        else:
            print(f"  ⚠ ratesTip[{lang}]: {len(matches)} matches — skipped (safety)")

    if app_content != open(APP_JSX, encoding="utf-8").read():
        open(APP_JSX, "w", encoding="utf-8").write(app_content)
        print(f"✓ App.jsx — {len(app_changed)} Änderungen:")
        for c in app_changed:
            print(c)
    else:
        print("  App.jsx — keine Änderungen")

    # ── Summary ────────────────────────────────────────────────────────────
    total = len(changes) + len(app_changed)
    print(f"\n=== Abgeschlossen — {total} Änderungen gesamt ===")
    if updates.get("KFW_CHANGED"):
        print("⚠ KfW: Programmänderung erkannt — manuelle Prüfung empfohlen!")
    if updates.get("BAFA_CHANGED"):
        print("⚠ BAFA: Programmänderung erkannt — manuelle Prüfung empfohlen!")


if __name__ == "__main__":
    main()
