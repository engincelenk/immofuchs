-- Sprint 7 (S7-1) — Capacitor-Push-Plugin andockt an die bestehende
-- Notification-Intent-Logik (S4-4/10.0) als zweiter Versandweg neben E-Mail.
-- Ein Nutzer kann mehrere Geräte registrieren (Handy + Tablet), pro Gerät
-- genau ein aktueller Token - ein erneutes Registrieren desselben Tokens
-- (App-Neustart, Token-Rotation durch FCM/APNs) aktualisiert die Zeile statt
-- einen Duplikat-Eintrag zu erzeugen.

CREATE TABLE push_tokens (
  token       TEXT PRIMARY KEY,       -- FCM- oder APNs-Geräte-Token
  user_id     TEXT NOT NULL REFERENCES users(id),
  platform    TEXT NOT NULL,          -- 'ios' | 'android'
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
