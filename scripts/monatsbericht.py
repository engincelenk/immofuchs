#!/usr/bin/env python3
"""
Monatsbericht per Mail (seit 2026-10-22).

Wird als letzter Schritt von .github/workflows/monthly-update.yml aufgerufen (nur fuer PROD+QA)
und schickt einen JSON-Bericht an den Worker (POST /api/v1/internal/monthly-report), der ihn als
Mail an BACKUP_ALERT_EMAIL verschickt. Inhalt: was aktualisiert wurde, welche Quellen fehlten, ob
ein Deploy ausgeloest wurde und welche Handpflege-Themen noch fuer dich fällig sind.

Umgebung (vom Workflow):
  BERICHT_DATEI    Pfad der JSON-Datei, die monthly_update.py geschrieben hat (fehlt sie, ist der Lauf gescheitert)
  UPDATE_OUTCOME   success | failure | cancelled | skipped (Ergebnis des Update-Schritts)
  COMMIT_CHANGED   "true", wenn Daten committet wurden (dann wurde ein Deploy angestossen)
  DEPLOY_SLUGS     z.B. "prod qa"
  REPORT_URL       Endpunkt des Workers
  REPORT_TOKEN     gemeinsames Geheimnis (GitHub-Secret REPORT_TOKEN). Fehlt es, wird nichts gesendet
                   und der Lauf bleibt gruen - der Bericht ist ein Zusatz, kein Pflichtschritt.
  GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID   fuer den Link auf den Lauf
  TROCKEN=ja       nur den JSON-Bericht ausgeben, nichts senden

Das Skript beendet sich immer mit Exit-Code 0: ein Fehler beim Berichten darf den Monatsjob nicht
rot machen, der eigentliche Lauf ist dann schon fertig.
"""

import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import datenpflege_erinnerung as dp  # noqa: E402


def lauf_lesen():
    pfad = os.environ.get("BERICHT_DATEI", "")
    if pfad and os.path.exists(pfad):
        try:
            with open(pfad, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:  # kaputte Datei: wie gescheitert behandeln
            print(f"Lauf-Datei nicht lesbar: {e}")
    return None


def aufgaben(heute):
    out = []
    for t in dp.faellige_themen(heute, leise=True):
        out.append({
            "titel": t["titel"],
            "quelle": t.get("quelle"),
            "datei": t.get("datei"),
            "claude": f"{t['claude']} {dp.ABSCHLUSS}",
        })
    return out


def bericht_bauen():
    heute = dp.jetzt()
    monat = f"{dp.MONATE[heute.month - 1]} {heute.year}"
    lauf = lauf_lesen()
    outcome = os.environ.get("UPDATE_OUTCOME", "")
    lauf_ok = lauf is not None and outcome in ("success", "")
    geaendert = os.environ.get("COMMIT_CHANGED") == "true"
    slugs = os.environ.get("DEPLOY_SLUGS", "").split()
    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    run = os.environ.get("GITHUB_RUN_ID", "")
    bericht = {
        "monat": monat,
        "laufOk": lauf_ok,
        "aenderungen": (lauf or {}).get("aenderungen", []),
        "quellen": (lauf or {}).get("quellen", []),
        "deploy": {"ausgeloest": geaendert, "umgebungen": slugs if geaendert else []},
        "aufgaben": aufgaben(heute),
    }
    if not lauf_ok:
        bericht["fehler"] = (
            f"Der Aktualisierungsschritt endete mit '{outcome or 'unbekannt'}' "
            "und hat keine Ergebnisdatei geschrieben. Details im Lauf in GitHub."
        )
    if repo and run:
        bericht["laufUrl"] = f"{server}/{repo}/actions/runs/{run}"
    return bericht


def senden(bericht):
    url = os.environ.get("REPORT_URL", "")
    token = os.environ.get("REPORT_TOKEN", "")
    if not url or not token:
        print("REPORT_TOKEN oder REPORT_URL fehlt - Bericht wird nicht gesendet "
              "(GitHub-Secret REPORT_TOKEN anlegen, siehe release-notes.txt 1.100.136).")
        return
    req = urllib.request.Request(
        url,
        data=json.dumps(bericht, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}",
                 "User-Agent": "immofuchs-monatsbericht"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"Bericht gesendet: HTTP {r.status}")
    except urllib.error.HTTPError as e:
        print(f"Bericht NICHT gesendet: HTTP {e.code} {e.read()[:200]!r}")
    except Exception as e:
        print(f"Bericht NICHT gesendet: {e}")


def main():
    try:
        bericht = bericht_bauen()
        if os.environ.get("TROCKEN", "").lower() in ("ja", "true", "1"):
            print(json.dumps(bericht, ensure_ascii=False, indent=2))
            return
        senden(bericht)
    except Exception as e:  # nie den Monatsjob rot machen
        print(f"Monatsbericht fehlgeschlagen: {e}")


if __name__ == "__main__":
    main()
