# OBSOLET (2026-08-18): test.free@immofuchs.info wurde geloescht und wird
# nicht mehr verwendet, siehe release-notes.txt. Dieses Skript setzte genau
# dieses Konto nach einem echten Sandbox-Checkout auf "kein Abo" zurueck -
# ohne Ersatz-Fixture gibt es dafuer aktuell keinen Anwendungsfall mehr.
#
# TODO (manuell): diese Datei kann geloescht werden - der
# device_commit_files-Uebertragungsweg kann keine Dateien entfernen, daher
# bewusst nicht automatisch entfernt.
#
# Falls in Zukunft wieder ein Testkonto mit is_test_user=1 fuer
# Sandbox-Checkout-Tests gebraucht wird: der Parameter -SessionId war schon
# immer ueberschreibbar (siehe Git-Historie dieser Datei), das Skript selbst
# war nicht test.free-spezifisch hart codiert - nur sein Standardwert.

Write-Host "OBSOLET: test.free wurde geloescht. Dieses Skript hat aktuell kein Ziel-Testkonto mehr." -ForegroundColor Yellow
Write-Host "Mit -SessionId ein anderes is_test_user=1-Konto angeben, oder diese Datei entfernen." -ForegroundColor Yellow
exit 1
