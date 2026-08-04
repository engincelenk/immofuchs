-- Sprint 2 (Ergaenzung 04.08.) — E-Mail + Passwort als fuenfter Login-/
-- Registrierungsweg (Spec v8, §4.2, §4.4, §4.5, §4.13). Login-Kennung bleibt
-- die E-Mail, kein separater Benutzername (Entscheidung 04.08.).

ALTER TABLE users ADD COLUMN password_hash TEXT;        -- NULL = Konto hat (noch) kein Passwort
ALTER TABLE users ADD COLUMN password_set_at INTEGER;    -- fuer "Passwort geaendert"-Mail
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;  -- NULL = Double-Opt-In offen -> Passwort-Login blockiert

-- Double-Opt-In fuer die Passwort-Registrierung UND die "Stattdessen Passwort
-- setzen"-Verknuepfung eines bestehenden OAuth-/Passkey-Kontos (Wireframe-
-- Karte 16): pending_password_hash ist NULL bei reiner E-Mail-Bestaetigung,
-- gesetzt bei der Verknuepfung - beim Einloesen des Tokens entscheidet dieses
-- Feld, ob zusaetzlich zum email_verified_at auch password_hash geschrieben
-- wird (siehe worker/src/auth/passwordAuth.ts). Token nur gehasht abgelegt
-- (4.5, 4.13) - Klartext geht ausschliesslich per E-Mail-Link raus.
CREATE TABLE email_verification_tokens (
  token_hash          TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id),
  pending_password_hash TEXT,
  expires_at          INTEGER NOT NULL,        -- 24 Stunden
  used_at             INTEGER,
  created_at          INTEGER NOT NULL
);

CREATE TABLE password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  expires_at  INTEGER NOT NULL,           -- 60 Minuten
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);

-- Gestaffelter Brute-Force-Schutz (4.13): Warnung ab Versuch 3, Sperre 15 Min.
-- ab Versuch 5, gezaehlt pro Konto UND pro IP. ip_hash statt Klartext-IP
-- (Datenminimierung) - Zeilen aelter als 24 Std. raeumt der Renewal-Cron ab
-- (siehe worker/src/scheduled.ts).
CREATE TABLE login_attempts (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  ip_hash      TEXT NOT NULL,
  success      INTEGER NOT NULL DEFAULT 0,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempted_at);
CREATE INDEX idx_login_attempts_ip    ON login_attempts(ip_hash, attempted_at);
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
