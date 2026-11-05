-- Betriebsueberwachung (worker/src/betrieb.ts, docs/betrieb/monitoring-scope.md).
-- Rueckwaertskompatibel: reine neue Tabellen, ein aelterer Worker (prod/qa teilen die Datenbank) ignoriert sie.
-- Keine personenbezogenen Daten: nur Bereich, Fehlercode, Zeit, Umgebung, kurzer technischer Grund.
CREATE TABLE IF NOT EXISTS betriebs_ereignis (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       INTEGER NOT NULL,      -- Unix-Millisekunden
  umgebung TEXT NOT NULL,         -- prod | qa | dev (aus APP_BASE_URL abgeleitet)
  bereich  TEXT NOT NULL,         -- expose | analyse | login | zahlung | sonde | client:expose ...
  code     TEXT NOT NULL,         -- z.B. modell_ausgefallen, http_502, fallback_workers_ai
  schwere  TEXT NOT NULL,         -- K (kritisch) | W (Warnung) | I (Information)
  detail   TEXT                   -- kurzer technischer Grund, max. 240 Zeichen, ohne Nutzerdaten
);
CREATE INDEX IF NOT EXISTS idx_betriebs_ereignis_ts ON betriebs_ereignis (ts);
CREATE INDEX IF NOT EXISTS idx_betriebs_ereignis_bereich ON betriebs_ereignis (bereich, schwere, ts);

-- Entprellung der Sofortalarme: je Fehlerart hoechstens eine Mail pro Stunde.
CREATE TABLE IF NOT EXISTS betriebs_alarm (
  fingerprint TEXT PRIMARY KEY,
  zuletzt     INTEGER NOT NULL
);
