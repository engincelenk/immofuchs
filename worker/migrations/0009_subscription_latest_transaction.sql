-- Sprint 4 (S4-5, Self-Service-Rückerstattung) — Paddles Adjustments-API
-- refundet gegen eine transaction_id, nicht gegen die subscription_id direkt.
-- Ohne dieses Feld müsste der Refund-Endpunkt bei jedem Aufruf zusätzlich bei
-- Paddle nachfragen, welche Transaktion die aktuelle Periode abgerechnet hat.
ALTER TABLE subscriptions ADD COLUMN latest_transaction_id TEXT;
