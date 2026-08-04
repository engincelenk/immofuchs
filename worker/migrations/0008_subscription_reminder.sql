-- Sprint 4 (S4-4) — verhindert doppelten Versand der Verlängerungserinnerung,
-- falls der Cron mehrfach in der 7-Tage-Vorlauffrist läuft.
ALTER TABLE subscriptions ADD COLUMN renewal_reminder_sent_at INTEGER;
