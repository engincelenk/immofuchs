-- Beta-Zugriff (users.is_beta, Migration 0019) wieder entfernt (Nutzer-
-- Entscheidung 2026-08-15): das Flag wurde nur in der Admin-Console
-- geschrieben/angezeigt, aber nirgends im Produkt gelesen, um irgendein
-- Feature freizuschalten - totes Feld ohne Wirkung.
--
-- Reihenfolge wichtig: erst Worker + Frontend deployen (lesen/schreiben
-- is_beta nicht mehr), DANACH diese Migration anwenden. Andersherum wuerde
-- noch laufender alter Code gegen eine bereits geloeschte Spalte laufen.

ALTER TABLE users DROP COLUMN is_beta;
