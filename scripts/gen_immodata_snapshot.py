#!/usr/bin/env python3
"""
Einmaliger Testlauf (2026-09-09): Rendert den ImmoScout24-Preisatlas
Baden-Wuerttemberg als PDF und legt ihn unter src/immodata/<Jahr>/<Monat>/ ab.

Ist der Testlauf ok, wird daraus der monatliche Automatismus (GitHub-Actions-
Cron, 1. jeden Monats) nach demselben Muster wie scripts/monthly_update.py.
Bewusst nicht unter public/ - die Datei soll ueber die App nicht abrufbar sein.
"""

import os
from datetime import datetime

from playwright.sync_api import sync_playwright

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = (
    "https://www.immobilienscout24.de/immobilienpreise/baden-wuerttemberg"
    "?mapCenter=48.674509%2C9.003545%2C7.466007428469548"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ImmoFuchsBot/1.0; +https://immofuchs.info)"
}


def main():
    now = datetime.now()
    out_dir = os.path.join(REPO_ROOT, "src", "immodata", str(now.year), f"{now.month:02d}")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "immobilienpreise-bw.pdf")

    print(f"Rufe {URL} auf ...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(user_agent=HEADERS["User-Agent"])
        page.goto(URL, timeout=60000, wait_until="load")
        page.wait_for_timeout(5000)
        page.pdf(path=out_path, format="A4", print_background=True)
        browser.close()

    size_kb = os.path.getsize(out_path) / 1024
    print(f"PDF gespeichert: {out_path} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
