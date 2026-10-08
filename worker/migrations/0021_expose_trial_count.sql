-- Exposé-Scan Free-Limit von 1x auf 3x pro Gerät angehoben (Nutzer-Vorgabe
-- 2026-08-18). Die bestehende Tabelle war ein reines "schon einmal
-- benutzt"-Flag (PRIMARY KEY session_id, INSERT OR IGNORE) - dafür jetzt ein
-- echter Zähler. Bestehende Zeilen (bereits 1x verbraucht) bekommen count=1,
-- der DEFAULT greift für neue Inserts über den bisherigen INSERT-Pfad nicht
-- mehr, markExposeTrialUsed schreibt count ab sofort explizit mit.
ALTER TABLE expose_trial_used ADD COLUMN count INTEGER NOT NULL DEFAULT 1;
