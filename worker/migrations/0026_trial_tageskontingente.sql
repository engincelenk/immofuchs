-- Tageskontingente statt Gesamtkontingente (Nutzer-Vorgabe 2026-08-25).
--
-- Bisher zaehlte trial_usage (0025) je (user_id, feature, rechner) EINMAL ueber
-- die gesamte Testphase: "3 Berechnungen je Rechner, insgesamt". Neu gelten
-- Finn, Exposé-Scan und Handout je TAG, Rechnernutzung und PDF gar nicht mehr
-- (unbegrenzt in der Testphase). Dafuer braucht der Schluessel eine
-- Tages-Dimension.
--
-- SQLite kann einen PRIMARY KEY nicht per ALTER TABLE aendern - deshalb neue
-- Tabelle, umkopieren, umbenennen (offizieller Weg laut SQLite-Doku
-- "Making Other Kinds Of Table Schema Changes").
--
-- tag: 'YYYY-MM-DD' (UTC) fuer Tageskontingente, '' fuer alles, was ueber die
--      ganze Phase zaehlt. Der Leerstring statt NULL, weil NULL in SQLite
--      keinen PRIMARY-KEY-Vergleich besteht (NULL != NULL) - genau derselbe
--      Grund, aus dem `rechner` schon in 0025 ein DEFAULT '' hat.
CREATE TABLE trial_usage_neu (
  user_id     TEXT NOT NULL REFERENCES users(id),
  feature     TEXT NOT NULL,
  rechner     TEXT NOT NULL DEFAULT '',
  tag         TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 0,
  trial_start INTEGER NOT NULL,
  PRIMARY KEY (user_id, feature, rechner, tag)
);

-- Bestehende Zeilen wandern als Gesamtzaehler (tag='') mit. Sie laufen damit
-- gegen kein Tageslimit mehr und sind faktisch tot - aufgeraeumt werden sie
-- ohnehin beim naechsten Testphasen-Start ueber trial_start (siehe
-- incrementTrialUsage), ein eigener Loeschjob eruebrigt sich.
INSERT INTO trial_usage_neu (user_id, feature, rechner, tag, count, trial_start)
  SELECT user_id, feature, rechner, '', count, trial_start FROM trial_usage;

DROP TABLE trial_usage;
ALTER TABLE trial_usage_neu RENAME TO trial_usage;
