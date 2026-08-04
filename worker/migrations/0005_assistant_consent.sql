-- Sprint 5 (S5-7) — KI-Assistent-Consent vor erster Finn-Nutzung (Apple
-- Guideline 5.1.2(i), Spec Abschnitt 3.2/4.2). Session-basiert, weil Finn
-- auch anonym (ohne Konto) genutzt wird — kann daher nicht an users hängen.
-- Wird bei späterer Kontoerstellung nicht migriert (rein geräte-/browserbezogen,
-- ein neues Gerät fragt erneut — bewusst einfach, kein Konto-Linking nötig,
-- da die Einwilligung pro Browser/Gerät gilt, nicht pro Person).

CREATE TABLE assistant_consent (
  session_id    TEXT PRIMARY KEY,
  consented_at  INTEGER NOT NULL
);
