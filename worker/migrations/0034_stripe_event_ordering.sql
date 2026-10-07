-- Reihenfolge-Schutz fuer Stripe-Webhooks (Admin-Sync-Auftrag 2026-09-29).
-- Stripe garantiert die Zustellreihenfolge nicht: ein aelteres
-- customer.subscription.updated, das nach einem neueren eintrifft, wuerde den
-- korrekten Status ueberschreiben. Gespeichert wird `event.created` (Unix-
-- Sekunden) des zuletzt angewendeten Events bzw. der Zeitpunkt des letzten
-- Cron-Abgleichs; aeltere Events werden verworfen. NULL = noch nie ueber
-- Stripe geschrieben (Bestandszeilen, admin-test-Abos) -> jedes Event gilt.
ALTER TABLE subscriptions ADD COLUMN stripe_event_created INTEGER;
