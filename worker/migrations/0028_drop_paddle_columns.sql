-- Harter Schnitt (Nutzer-Entscheidung 2026-08-26, abweichend vom urspruenglichen
-- Spec-Vorschlag "Spalten vorerst stehen lassen"): keine echten
-- Paddle-Bestandskunden vorhanden, deshalb sofortige Entfernung statt einer
-- spaeteren separaten Aufraeum-Migration.
ALTER TABLE subscriptions DROP COLUMN paddle_customer_id;
ALTER TABLE subscriptions DROP COLUMN paddle_subscription_id;
ALTER TABLE subscriptions DROP COLUMN latest_transaction_id;
