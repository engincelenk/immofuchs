-- Passkey/WebAuthn-Login komplett entfernt (Nutzer-Entscheidung 2026-08-28):
-- die UI wurde bereits am 06.08. entfernt, dies raeumt die verbliebene
-- Backend-Infrastruktur ab. Harter Schnitt statt Bestandsschutz - App ist
-- noch in der Testphase, keine produktiven Passkey-only-Konten vorhanden
-- (Nutzer-Bestaetigung, keine DB-Pruefung noetig).
DROP INDEX IF EXISTS idx_passkey_credentials_user_id;
DROP TABLE IF EXISTS passkey_credentials;
DROP TABLE IF EXISTS passkey_challenges;
