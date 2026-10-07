-- Laufzeit-Einstellungen, die der Admin im Admin Panel umschalten kann, ohne
-- Redeploy und ohne dass ein Deploy sie aus wrangler.toml zuruecksetzt.
-- Erste Verwendung: 'checkout_public' ('true' | 'false'), die Kaufsperre aus
-- worker/src/checkoutGate.ts. Fehlt die Zeile, gilt die Variable CHECKOUT_ENABLED.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL  -- Unix-Millisekunden
);
