-- Sprint 5 (S5-2) — Anonymer, dauerhafter Zähler für den "1 kostenloser
-- Exposé-Scan"-Hook (Spec 4.8, 4.0a). Bewusst getrennt von den
-- Durable-Object-Rate-Limits (EXPOSE_DAILY_LIMIT & Co.): jene sind
-- Tages-Kostenschranken, die täglich zurücksetzen; dies hier ist ein
-- dauerhaftes "schon einmal benutzt"-Flag pro Gerät/Session, das nie
-- zurückgesetzt wird, bis der Nutzer Pro hat.

CREATE TABLE expose_trial_used (
  session_id  TEXT PRIMARY KEY,
  used_at     INTEGER NOT NULL
);
