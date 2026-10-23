"""Tests fuer die Teile von monthly_update.py, die ohne Netz laufen (Interhyp-Parser, Zins-Tabelle).

Aufruf (Projektwurzel):  python -m unittest scripts.test_monthly_update -v
(oder:                   python scripts/test_monthly_update.py)
Die Abhaengigkeiten pdfplumber/playwright/requests werden durch Attrappen ersetzt, das Netz wird nie angefasst.
"""
import os
import sys
import types
import unittest

for name in ("pdfplumber", "playwright", "playwright.sync_api", "requests"):
    if name not in sys.modules:
        m = types.ModuleType(name)
        if name == "playwright.sync_api":
            m.sync_playwright = lambda: None
        sys.modules[name] = m

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import monthly_update as mu  # noqa: E402

# Ausschnitt der Seite https://www.interhyp.de/zinsen/ vom 23.10.2026 (Seitentext)
SEITENTEXT_NEU = (
    "Zinstabelle: Effektiver Jahreszins\n\nSollzinsbindung\n\n\t\n\nBeleihungsauslauf unter 70 %\n\n\t\n\n"
    "Beleihungsauslauf bei 80 %\n\n\t\n\nBeleihungsauslauf über 90 %\n\n\n\n\n"
    "5 Jahre\n\n\t\n\n4,20 %\n\n\t\n\n4,29 %\n\n\t\n\n4,53 %\n\n\n\n\n"
    "10 Jahre\n\n\t\n\n4,19 %\n\n\t\n\n4,30 %\n\n\t\n\n4,56 %\n\n\n\n\n"
    "15 Jahre\n\n\t\n\n4,41 %\n\n\t\n\n4,51 %\n\n\t\n\n4,77 %\n\n\n\n\n"
    "20 Jahre\n\n\t\n\n4,49 %\n\n\t\n\n4,60 %\n\n\t\n\n4,69 %\n\n"
)
ZEILEN_NEU = [
    ["Sollzinsbindung", "", "Beleihungsauslauf unter 70 %", "Beleihungsauslauf bei 80 %", "Beleihungsauslauf über 90 %"],
    ["5 Jahre", "", "4,20 %", "", "4,29 %", "", "4,53 %"],
    ["10 Jahre", "", "4,19 %", "", "4,30 %", "", "4,56 %"],
    ["15 Jahre", "", "4,41 %", "", "4,51 %", "", "4,77 %"],
]
# altes Layout, wie es das Skript bis Anfang Oktober gelesen hat
SEITENTEXT_ALT = (
    "Zinsbindung Tranche\n\n<70\n\n80\n\n>90\n\n5\n\n4,0 %\n\n4,1 %\n\n4,3 %\n\n"
    "10\n\n4,10 %\n\n4,20 %\n\n4,40 %\n\n15\n\n4,3 %\n\n4,4 %\n\n4,6 %\n"
)

DATA_JS = '''export const MARKET_RATES = {
  stand: "Oktober 2026",
  avg: 4.32,
};

export const ZINS_ABSTAENDE = {
  stand: "Oktober 2026",
  punkte: [
    [60, -0.3],
    [70, -0.15],
    [80, 0],
    [90, 0.1],
    [100, 0.3],
  ],
};

export const ZINS_NACH_FINANZIERUNG = {
  stand: "September 2026",
  punkte: [
    [60, 3.0],
    [70, 3.1],
    [80, 3.2],
    [90, 3.3],
    [100, 3.4],
  ],
};
'''


class InterhypParser(unittest.TestCase):
    def test_neue_tabelle_aus_zeilen(self):
        self.assertEqual(mu.parse_interhyp_zeilen(ZEILEN_NEU), (4.19, 4.30, 4.56))

    def test_neuer_seitentext(self):
        self.assertEqual(mu.parse_interhyp_text(SEITENTEXT_NEU), (4.19, 4.30, 4.56))

    def test_alter_seitentext_geht_weiter(self):
        self.assertEqual(mu.parse_interhyp_text(SEITENTEXT_ALT), (4.10, 4.20, 4.40))

    def test_zeile_10_ohne_jahre_wird_akzeptiert(self):
        self.assertEqual(mu.parse_interhyp_zeilen([["10", "4,0 %", "4,1 %", "4,2 %"]]), (4.0, 4.1, 4.2))

    def test_andere_laufzeit_wird_nicht_verwechselt(self):
        self.assertIsNone(mu.parse_interhyp_zeilen([["15 Jahre", "4,41 %", "4,51 %", "4,77 %"]]))
        self.assertIsNone(mu.parse_interhyp_zeilen([["110 Jahre", "4,41 %", "4,51 %", "4,77 %"]]))

    def test_unplausible_werte_werden_abgelehnt(self):
        self.assertIsNone(mu.parse_interhyp_zeilen([["10 Jahre", "41 %", "0,1 %", "99 %"]]))
        self.assertIsNone(mu.parse_interhyp_text("10 Jahre\n\n41 %\n\n0,1 %\n\n99 %\n"))

    def test_unbekanntes_layout_gibt_none(self):
        self.assertIsNone(mu.parse_interhyp_text("Irgendein anderer Text ohne Tabelle"))
        self.assertIsNone(mu.parse_interhyp_zeilen([]))


class ZinsTabelle(unittest.TestCase):
    def test_abstaende_werden_gelesen(self):
        self.assertEqual(
            mu.lese_zins_abstaende(DATA_JS),
            [(60, -0.3), (70, -0.15), (80, 0.0), (90, 0.1), (100, 0.3)],
        )

    def test_berechnung_basis_plus_abstand(self):
        stufen = mu.berechne_zins_stufen(4.32, mu.lese_zins_abstaende(DATA_JS))
        self.assertEqual(stufen, [(60, 4.02), (70, 4.17), (80, 4.32), (90, 4.42), (100, 4.62)])

    def test_block_wird_ersetzt_und_gemeldet(self):
        changes = []
        neu = mu.replace_zins_stufen_block(DATA_JS, "Oktober 2026", 4.32, changes)
        self.assertIn("    [60, 4.02],\n", neu)
        self.assertIn("    [100, 4.62],\n", neu)
        self.assertIn('stand: "Oktober 2026"', neu.split("ZINS_NACH_FINANZIERUNG")[1])
        self.assertEqual(len(changes), 1)
        self.assertIn("60 %=4.02", changes[0])
        # Marktzins-Block und Abstaende bleiben unberuehrt
        self.assertIn("avg: 4.32,", neu)
        self.assertIn("[60, -0.3],", neu)

    def test_zweiter_lauf_ohne_aenderung_erzeugt_keinen_commit(self):
        changes = []
        einmal = mu.replace_zins_stufen_block(DATA_JS, "Oktober 2026", 4.32, changes)
        changes2 = []
        zweimal = mu.replace_zins_stufen_block(einmal, "Oktober 2026", 4.32, changes2)
        self.assertEqual(einmal, zweimal)
        self.assertEqual(changes2, [])

    def test_ohne_marktzins_bleibt_alles_wie_es_ist(self):
        changes = []
        self.assertEqual(mu.replace_zins_stufen_block(DATA_JS, "Oktober 2026", None, changes), DATA_JS)
        self.assertEqual(changes, [])

    def test_fehlende_abstaende_aendern_nichts(self):
        ohne = DATA_JS.replace("export const ZINS_ABSTAENDE", "export const ANDERES")
        changes = []
        self.assertEqual(mu.replace_zins_stufen_block(ohne, "Oktober 2026", 4.32, changes), ohne)
        self.assertEqual(changes, [])

    def test_echte_data_js_passt_zur_berechnung(self):
        """Die Tabelle im Projekt entspricht Marktzins + Abstaende - sonst wuerde der naechste Lauf etwas aendern."""
        pfad = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data.js")
        with open(pfad, encoding="utf-8") as f:
            data = f.read()
        changes = []
        self.assertEqual(mu.replace_zins_stufen_block(data, _stand(data), _avg(data), changes), data)
        self.assertEqual(changes, [])


def _avg(data_js):
    import re

    return float(re.search(r"export const MARKET_RATES = \{[^}]*?avg:\s*([\d.]+)", data_js).group(1))


def _stand(data_js):
    import re

    return re.search(r'export const MARKET_RATES = \{[^}]*?stand:\s*"([^"]+)"', data_js).group(1)


if __name__ == "__main__":
    unittest.main()
