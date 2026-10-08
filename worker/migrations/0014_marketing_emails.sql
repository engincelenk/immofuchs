-- Spec-v3.0 Kap. 4.7 (Einstellungen: Benachrichtigungen granular an-/abschaltbar).
-- Transaktionale Mails (Zahlungsfehler, Kuendigung, Trial-Ende, Passwort
-- geaendert usw.) bleiben bewusst PFLICHT und sind hier nicht abschaltbar -
-- nur der optionale Marketing-/Produkt-News-Kanal ist es. Default 0
-- (Opt-in statt Opt-out) - datenschutzfreundlicher Startzustand.

ALTER TABLE users ADD COLUMN marketing_emails_enabled INTEGER NOT NULL DEFAULT 0;
