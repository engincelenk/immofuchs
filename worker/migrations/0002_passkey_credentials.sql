-- Sprint 2 (S2-2) — Passkey/WebAuthn als vierter passwortloser Login-Weg.
-- Kein externer Provider, daher eigene Tabelle statt oauth_identities.

CREATE TABLE passkey_credentials (
  id                TEXT PRIMARY KEY,        -- uuid
  user_id           TEXT NOT NULL REFERENCES users(id),
  credential_id     TEXT UNIQUE NOT NULL,    -- Base64url, vom Authenticator erzeugt
  public_key        TEXT NOT NULL,           -- COSE-Key, Base64
  sign_count        INTEGER NOT NULL DEFAULT 0,
  device_label      TEXT,                    -- z. B. "iPhone von Max"
  created_at        INTEGER NOT NULL,
  last_used_at      INTEGER
);

CREATE INDEX idx_passkey_credentials_user_id ON passkey_credentials(user_id);

-- Kurzlebige Ablage der WebAuthn-Challenge zwischen "Optionen erzeugen" und
-- "Antwort verifizieren" (zustandslos ohne KV/DO waere sonst nicht moeglich).
-- challenge_key ist entweder eine E-Mail (Registrierung) oder eine temporaere
-- Client-ID (Login, da der Nutzer dort noch nicht bekannt ist).
CREATE TABLE passkey_challenges (
  challenge_key TEXT PRIMARY KEY,
  challenge     TEXT NOT NULL,
  purpose       TEXT NOT NULL,   -- 'register' | 'login'
  expires_at    INTEGER NOT NULL -- 5 Minuten
);

