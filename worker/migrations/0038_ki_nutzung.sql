-- KI-Kostenzaehler je Nutzer, Tag und Funktion (worker/src/kiBudget.ts).
-- Grundlage fuer das Euro-Budget je Kunde und die taegliche Warn-Mail.
-- Rueckwaertskompatibel: reine neue Tabelle, ein aelterer Worker (prod/qa teilen die Datenbank) ignoriert sie.
-- kosten_mikro = geschaetzte Kosten in Mikro-Euro (1 EUR = 1.000.000), aus den Zeichenlaengen von Prompt und Antwort.
CREATE TABLE IF NOT EXISTS ki_nutzung (
  user_id      TEXT NOT NULL,
  tag          TEXT NOT NULL,      -- UTC-Tag "YYYY-MM-DD", wie trialTag()
  funktion     TEXT NOT NULL,      -- finn | analyse | expose | lage | alternativ
  aufrufe      INTEGER NOT NULL DEFAULT 0,
  kosten_mikro INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, tag, funktion)
);
CREATE INDEX IF NOT EXISTS idx_ki_nutzung_tag ON ki_nutzung (tag);
