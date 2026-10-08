-- Rueckbau von Migration 0031: Nutzer-Entscheidung 2026-09-04, kein natives
-- In-App-Kauf-Modell (RevenueCat/StoreKit/Play Billing) - stattdessen bleibt
-- Stripe die einzige Zahlungsquelle, auch fuer die App (siehe
-- src/components/checkout/NativeWebRedirectStep.jsx). Harter Schnitt statt
-- Spalten stehen lassen (gleiches Vorgehen wie beim Paddle-Rueckbau,
-- Migration 0028): keine echten RevenueCat-Zeilen vorhanden, da nie ein
-- echtes RevenueCat-Projekt/Store-Produkt existierte.
ALTER TABLE subscriptions DROP COLUMN source;
ALTER TABLE subscriptions DROP COLUMN revenuecat_app_user_id;
ALTER TABLE subscriptions DROP COLUMN revenuecat_original_transaction_id;
