-- Nutzer-Entscheidung 2026-08-19: die bisherige globale TEST_EMAIL_REDIRECT_TO
-- (env.dev.vars, siehe email.ts) leitet auf dev ausnahmslos JEDE Mail an eine
-- feste Adresse um - funktioniert nicht auf qa/prod und laesst sich nicht pro
-- Testuser auf eine andere Adresse einstellen. test_email_redirect_to ist die
-- pro-Nutzer-Alternative dazu: nur wirksam bei is_test_user=1 (siehe
-- resolveRecipient() in email.ts sowie die Validierung in routes/admin.ts).
ALTER TABLE users ADD COLUMN test_email_redirect_to TEXT;
