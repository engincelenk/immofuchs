-- Native In-App-Kaeufe (iOS/Android) zusaetzlich zu Stripe (Web), siehe
-- docs/app-store-google-play-setup.md Teil C. `source` unterscheidet, ueber
-- welchen Kanal eine Zeile entstand - entitlement.ts liest weiterhin nur
-- Status/Periodenende und bleibt dadurch unveraendert (Spalte ist rein
-- informativ/fuer Support-Zwecke, keine Gating-Logik haengt daran).
ALTER TABLE subscriptions ADD COLUMN source TEXT NOT NULL DEFAULT 'stripe';
ALTER TABLE subscriptions ADD COLUMN revenuecat_app_user_id TEXT;
ALTER TABLE subscriptions ADD COLUMN revenuecat_original_transaction_id TEXT;
