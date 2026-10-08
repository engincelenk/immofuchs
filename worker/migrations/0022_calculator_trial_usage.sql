-- Gratis-Berechnung von "1x kombiniert über alle 6 Rechner" (0018) auf "3x je
-- Rechner" umgestellt (Nutzer-Vorgabe 2026-08-18). users.calculator_trial_used_at
-- bleibt unangetastet stehen (kein DROP COLUMN) - wird schlicht nicht mehr
-- gelesen/geschrieben, ein Zähler pro Nutzer+Rechner ersetzt das einzelne Flag.
CREATE TABLE calculator_trial_usage (
  user_id  TEXT NOT NULL REFERENCES users(id),
  rechner  TEXT NOT NULL,
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, rechner)
);
