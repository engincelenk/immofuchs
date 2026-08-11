-- Konzept-Dok "Access Management ImmoFuchs" Abschnitt 5: Rolle und
-- Account-Status muessen getrennt sein - Rolle (role) definiert
-- Berechtigungen, account_status definiert den Kontozustand. Ohne dieses
-- Feld gab es keine Datengrundlage fuer "Benutzer sperren/entsperren"
-- (ADMIN-Berechtigung laut Konzept-Dok Abschnitt 2).
--
-- 'DELETED' ist hier nur der Vollstaendigkeit halber (Konzept-Dok) mit
-- aufgefuehrt - der bestehende Konto-Loeschen-Flow (accountDeletion.ts)
-- loescht die Zeile vollstaendig (Hard Delete), setzt also nie diesen
-- Status. Kein CHECK-Constraint (Projektkonvention, siehe role-Spalte in
-- Migration 0001) - vermeidet eine spaetere Migration nur wegen eines
-- neuen Statuswerts.

ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'ACTIVE';
