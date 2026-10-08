-- Wechsel Paddle -> Stripe (Spec 2026-08-26-paddle-zu-stripe-migration-spec.md,
-- Abschnitt 4). Bestehende Tabelle bleibt, keine neue: die Rechteprüfung
-- (entitlement.ts) kennt nur Status/Periodenende, keine Paddle-Spezifika.
--
-- Keine echten Paddle-Bestandskunden vorhanden (Abschnitt 0) - deshalb keine
-- Datenübernahme/Backfill. Die Paddle-Spalten (paddle_customer_id,
-- paddle_subscription_id, latest_transaction_id) bleiben vorerst stehen und
-- werden erst in einer separaten, späteren Aufräum-Migration entfernt.
ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN latest_invoice_id TEXT;
