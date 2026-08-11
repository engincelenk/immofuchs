-- Neuer Login-/Test-/Buchungsflow (Nutzer-Konzept 2026-08-11, Stufe A):
-- kostenloser Erstversuch gilt EINMAL kombiniert fuer alle 6 Rechner, nicht
-- pro Rechner und nicht pro Geraet - eigene, serverseitige Spalte auf dem
-- Nutzerkonto (nie zurueckgesetzt), analog zu trial_used_at (0013) fuer den
-- bezahlten 7-Tage-Trial. Bewusst eine eigene Spalte statt trial_used_at
-- mitzunutzen: unterschiedliche Bedeutung (kostenloser Rechner-Ersttest vs.
-- bezahlter Paddle-Trial), unabhaengige Lebenszyklen.
ALTER TABLE users ADD COLUMN calculator_trial_used_at INTEGER;
