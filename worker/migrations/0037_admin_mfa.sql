-- Zweiter Faktor fuer Admin-Konten per E-Mail-Code (worker/src/auth/adminMfa.ts).
-- Rueckwaertskompatibel: ein aelterer Worker (qa laeuft bewusst eine Version hinter prod,
-- gemeinsame Datenbank) ignoriert Spalte und Tabelle einfach.
ALTER TABLE sessions ADD COLUMN mfa_verified_at INTEGER;  -- Unix-Millisekunden, NULL = nicht bestaetigt

CREATE TABLE IF NOT EXISTS admin_mfa_codes (
  session_id TEXT PRIMARY KEY,   -- ein offener Code je Sitzung
  code_hash  TEXT NOT NULL,      -- SHA-256 ueber "<session_id>:<code>", nie der Code selbst
  expires_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
