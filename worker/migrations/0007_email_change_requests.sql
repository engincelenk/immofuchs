-- Sprint 4 (S4-6) — E-Mail-Adresse ändern: Bestätigung geht an die NEUE
-- Adresse, users.email wird erst nach Klick aktualisiert (verhindert
-- Aussperrung/Kaperung, Spec 4.10). Eigene Tabelle statt magic_links, weil
-- hier zusätzlich user_id + die Ziel-E-Mail mitgeführt werden müssen.

CREATE TABLE email_change_requests (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  new_email   TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER
);
