-- Sprint 1 (Login & Session) — Kommerzialisierung-Spec Abschnitt 4.2.
-- Bewusst KEIN Passwort-Feld: alle vier Login-Wege (Google, Apple, E-Mail-Magic-Link,
-- Passkey) sind passwortlos. Passkey-Tabelle folgt in 0002 (eigene Migration, da sie
-- erst in Sprint 2 gebraucht wird).

CREATE TABLE users (
  id            TEXT PRIMARY KEY,        -- uuid
  email         TEXT UNIQUE NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE oauth_identities (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  provider          TEXT NOT NULL,        -- 'google' | 'apple'
  provider_user_id  TEXT NOT NULL,
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE magic_links (
  token       TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,           -- 15 Minuten
  used_at     INTEGER
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,           -- opakes Token, im Cookie UND im Bearer-Header
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,           -- 90 Tage, gleitend
  user_agent  TEXT,                       -- fuer "Geraete verwalten"-Anzeige
  last_seen_at INTEGER
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_oauth_identities_user_id ON oauth_identities(user_id);
