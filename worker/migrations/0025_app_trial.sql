-- Kartenfreie Testphase statt Free-Tarif (Preispolitik 2026-08-20, Schritt B).
--
-- Bis hierher gab es zwei Zustaende: "Free" (eingeloggt oder anonym, mit
-- Monatskontingenten) und "Pro" (Paddle-Abo). Neu sind es ebenfalls zwei,
-- aber andere: "Testphase" (7 Tage nach der Registrierung, ohne
-- Zahlungsdaten) und "Pro". Danach ist Schluss - gespeicherte Objekte bleiben
-- lesbar, sonst geht nichts mehr.
--
-- Warum eigene Spalten und nicht users.trial_used_at (0013): das ist der
-- BEZAHLTE Paddle-Trial mit Abo-Zeile in subscriptions. Der hier hat keine
-- Zahlungsdaten und keine Paddle-Entsprechung - andere Bedeutung, anderer
-- Lebenszyklus, deshalb getrennt.
ALTER TABLE users ADD COLUMN app_trial_started_at INTEGER;
ALTER TABLE users ADD COLUMN app_trial_ends_at INTEGER;

-- Verbrauchszaehler der Testphase, an den NUTZER gebunden statt an die
-- Session. Vorher hingen Finn- und Exposé-Kontingent an der Session-ID - das
-- war noetig, solange Free anonym nutzbar war, und heisst zugleich: Cookies
-- loeschen, Kontingent wieder voll. Mit geschlossener anonymer Nutzung faellt
-- dieser Weg weg.
--
-- feature: 'rechner' | 'finn' | 'expose' | 'pdf' | 'handout'
-- rechner: Rechner-Id, oder '' fuer alles, was nicht an einem Rechner haengt
--          (Exposé-Scan und Handout gehoeren zum Objekt, nicht zum Rechner).
-- trial_start: Ruecksetzmarke. Beim Start einer Testphase traegt jede neue
--          Zeile deren Startzeitpunkt; Zeilen aelterer Testphasen zaehlen
--          dadurch als 0, ohne dass ein Job sie aufraeumen muesste (gleiche
--          Technik wie der Periodenschluessel aus 0024).
CREATE TABLE trial_usage (
  user_id     TEXT NOT NULL REFERENCES users(id),
  feature     TEXT NOT NULL,
  rechner     TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 0,
  trial_start INTEGER NOT NULL,
  PRIMARY KEY (user_id, feature, rechner)
);

-- Die beiden Vorgaenger-Tabellen entfallen. Free gibt es nicht mehr, und
-- beide zaehlten ausdruecklich Free-Kontingente: calculator_trial_usage (0022,
-- 0024) die Gratis-Berechnungen, expose_trial_used (0006, 0021, 0024) die
-- anonymen Exposé-Scans je Session. Ersatzlos - trial_usage deckt beides ab.
--
-- Ohne Datenuebernahme, weil es zum Umstellungszeitpunkt keine Nutzer gibt
-- (Nutzer-Bestaetigung 2026-08-20).
DROP TABLE IF EXISTS calculator_trial_usage;
DROP TABLE IF EXISTS expose_trial_used;
