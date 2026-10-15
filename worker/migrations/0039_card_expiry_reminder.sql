-- Erinnerung an ablaufende Zahlungskarten (Stripe-Benachrichtigungen 2026-10-15).
-- Beide Spalten sind rein additiv und nullable: der laufende Worker (prod UND
-- qa teilen sich die Datenbank) ignoriert sie, bis die neue Version ausgerollt
-- ist - die Migration ist damit abwaertskompatibel.
--
-- card_expiry_checked_at: wann der Cron die Karte dieses Abos zuletzt bei
-- Stripe geprueft hat. Sorgt fuer faire Rotation (Subrequest-Limit je Lauf)
-- und hoechstens eine Pruefung pro Woche und Abo.
-- card_expiry_reminder_for: current_period_end, fuer den bereits gewarnt wurde.
-- Pro Abrechnungsperiode geht so hoechstens eine Mail raus; nach der
-- naechsten Verlaengerung (neuer current_period_end) ist eine neue erlaubt.
ALTER TABLE subscriptions ADD COLUMN card_expiry_checked_at INTEGER;
ALTER TABLE subscriptions ADD COLUMN card_expiry_reminder_for INTEGER;
