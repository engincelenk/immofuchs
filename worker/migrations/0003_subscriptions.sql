-- Sprint 3 (Kauf & Rechteprüfung) — Kommerzialisierung-Spec Abschnitt 4.2.
-- Eigene PK statt user_id als PK: mit user_id als PK würde eine zweite
-- Subscription (nach vollständiger Kündigung + späterem Neuabschluss) die
-- erste Zeile überschreiben und first_purchase_at ginge verloren — kritisch
-- für die 14-Tage-Geld-zurück-Logik (4.12). Ein partial UNIQUE-Index
-- erzwingt weiterhin maximal eine aktive Subscription pro Nutzer.

CREATE TABLE subscriptions (
  id                     TEXT PRIMARY KEY,        -- uuid
  user_id                TEXT NOT NULL REFERENCES users(id),
  status                 TEXT NOT NULL,   -- 'active' | 'past_due' | 'cancel_scheduled' | 'canceled'
  plan                   TEXT NOT NULL,   -- 'monthly' | 'yearly'
  paddle_customer_id     TEXT NOT NULL,
  paddle_subscription_id TEXT NOT NULL,
  current_period_end     INTEGER NOT NULL,
  cancel_at_period_end   INTEGER NOT NULL DEFAULT 0,
  first_purchase_at      INTEGER NOT NULL, -- für die 14-Tage-Geld-zurück-Frist
  past_due_since         INTEGER,          -- Beginn der 3-Tage-Kulanzfrist (4.11)
  updated_at             INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_subscriptions_active_user
  ON subscriptions(user_id) WHERE status = 'active';
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
-- für den Renewal-Reminder-Cron (S4-4): ohne Index Full-Table-Scan bei jedem Lauf.

-- Webhook-Idempotenz — Paddle liefert Events "at least once".
CREATE TABLE processed_webhook_events (
  event_id     TEXT PRIMARY KEY,
  processed_at INTEGER NOT NULL
);
