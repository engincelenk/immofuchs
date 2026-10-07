-- Feedback-Modal (Spec docs/plans/neue-phase2/spec-ki-feedback-stripe.md,
-- Abschnitt 2): Freitext-Feedback aus "Mein Konto" -> Hilfe, ersetzt den
-- bisherigen mailto:-Link. Kein Reward-System (bewusst nicht geplant) -
-- category ist optional, kontext_json haelt automatisch mitgeschickte,
-- fuer den Nutzer unsichtbare Einordnungshilfen (aktuell nur Plattform).
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  category TEXT,
  kontext_json TEXT,
  plattform TEXT,
  app_version TEXT,
  erstellt_am INTEGER NOT NULL
);

CREATE INDEX idx_feedback_erstellt_am ON feedback(erstellt_am DESC);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
