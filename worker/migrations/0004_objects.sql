-- Sprint 5b (Objekt-Verwaltung) — Kommerzialisierung-Spec Abschnitt 4.17, 4.2.
-- Merkliste/Objekte serverseitig statt localStorage — Kernprinzip "kein
-- Nachteil bei Gerätewechsel für zahlende Nutzer". Nur für Pro-Nutzer relevant.

CREATE TABLE objects (
  id            TEXT PRIMARY KEY,        -- uuid, clientseitig erzeugt (Migrations-Dedupe)
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,        -- für "last write wins"
  title         TEXT,
  plz           TEXT,
  ort           TEXT,
  kaufpreis     REAL,
  wohnflaeche   REAL,
  score         INTEGER,                 -- BANDS-Bewertungssystem
  score_label   TEXT,
  input_data    TEXT NOT NULL,           -- JSON: Rechner-Eingaben
  result_data   TEXT NOT NULL,           -- JSON: berechnete Ergebnisse
  source        TEXT NOT NULL DEFAULT 'manuell', -- 'manuell' | 'expose-scan'
  status        TEXT NOT NULL DEFAULT 'in_pruefung' -- 'in_pruefung' | 'archiviert'
);

CREATE INDEX idx_objects_user_id ON objects(user_id);
