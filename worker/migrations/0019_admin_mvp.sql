-- Admin Panel MVP (Auftrag 2026-08-13), Phase 1 "DB & Backend-Fundament".
--
-- Drei Aenderungen, die zusammengehoeren, weil sie alle aus derselben
-- Vorgabe stammen (Auftrag Abschnitt 6 "Direkt editierbare Nutzerfelder"):
--
-- 1. Rollenmodell: bisher war 'test_user' eine ROLLE (Migration 0001 +
--    entitlement.ts). Der Auftrag verlangt drei Rollen (Customer /
--    Admin-Support / Owner-Admin) UND einen davon unabhaengigen
--    Testuser-Schalter - ein Nutzer soll gleichzeitig Kunde und Testnutzer
--    sein koennen, was mit 'test_user' als Rolle unmoeglich war (eine Zeile
--    hat genau eine Rolle). Deshalb wandert das Merkmal in eine eigene
--    Spalte, und die frei gewordene Rollen-Ebene bekommt stattdessen
--    'support' (Nutzer-Entscheidung 2026-08-13).
--
-- 2. Beta-Zugriff (Auftrag Abschnitt 6) - existierte bisher gar nicht.
--
-- 3. Support-Notizen (Auftrag Abschnitt 6/7): eigene Tabelle statt einer
--    users-Spalte, weil der Auftrag "mit Datum und Admin verknuepft"
--    verlangt - das ist eine 1:n-Historie, kein einzelnes Feld. Analog zu
--    admin_audit_log ist admin_email denormalisiert, damit eine Notiz
--    lesbar bleibt, wenn der schreibende Admin spaeter geloescht wird.
--
-- role bleibt eine reine TEXT-Spalte ohne CHECK-Constraint (wie seit 0001) -
-- die gueltigen Werte stehen in entitlement.ts (Role-Typ) und werden dort
-- serverseitig geprueft.

ALTER TABLE users ADD COLUMN is_test_user INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_beta INTEGER NOT NULL DEFAULT 0;

-- Bestandsdaten umziehen: wer bisher die Rolle 'test_user' hatte, wird
-- Kunde MIT gesetztem Testuser-Schalter. Ohne diese Zeile haetten solche
-- Konten eine Rolle, die es im neuen Modell nicht mehr gibt - hasPermission()
-- liefert fuer unbekannte Rollen `false`, sie waeren also rechtlos.
UPDATE users SET role = 'customer', is_test_user = 1 WHERE role = 'test_user';

CREATE TABLE user_support_notes (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  admin_user_id TEXT NOT NULL,
  admin_email   TEXT NOT NULL,   -- denormalisiert, siehe Kopfkommentar
  note          TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_user_support_notes_user ON user_support_notes(user_id, created_at DESC);
