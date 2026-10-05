-- Nachweis fuer Kuendigungs- und Widerrufserklaerungen (§ 312k Abs. 4, § 356a
-- Abs. 4 BGB): wann ist welche Erklaerung mit welchem Inhalt eingegangen, und
-- was wurde daraus. Die Erklaerungen koennen auch ohne Anmeldung ueber die
-- oeffentlichen Seiten /kuendigen.html und /widerruf.html kommen, deshalb steht
-- die E-Mail-Adresse direkt hier und nicht nur ueber user_id.
CREATE TABLE IF NOT EXISTS contract_declarations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- 'cancel' | 'withdraw'
  email TEXT NOT NULL,
  name TEXT,
  received_at INTEGER NOT NULL,  -- Unix-Millisekunden, Zeitpunkt des Zugangs
  user_id TEXT,
  subscription_id TEXT,
  channel TEXT NOT NULL,         -- 'public' | 'account'
  outcome TEXT NOT NULL          -- z. B. 'processed', 'no_contract', 'window_expired', 'failed'
);

CREATE INDEX IF NOT EXISTS idx_contract_declarations_email ON contract_declarations (email, received_at);
