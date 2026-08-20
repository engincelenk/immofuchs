-- Free-Kontingente laufen ab jetzt je Kalendermonat statt dauerhaft
-- (Preispolitik 2026-08-20): Rechner 3/Monat je Rechner, Exposé 2/Monat.
--
-- Beide Zaehlertabellen bekommen die Periode, in der sie gefuellt wurden
-- ("YYYY-MM", siehe worker/src/periode.ts). Gelesen und erhoeht wird nur
-- noch mit passender Periode - ein Zaehler aus einem alten Monat zaehlt als
-- 0 und wird beim naechsten Verbrauch ueberschrieben. Kein Reset-Job noetig.
--
-- DEFAULT '' statt der aktuellen Periode: bestehende Zeilen sollen als
-- "abgelaufen" gelten, damit alle Nutzer mit der Umstellung ein frisches
-- Monatskontingent haben. Das ist die grosszuegige Richtung - niemand
-- verliert durch die Migration ein Kontingent, das er noch hatte.
ALTER TABLE calculator_trial_usage ADD COLUMN period TEXT NOT NULL DEFAULT '';
ALTER TABLE expose_trial_used ADD COLUMN period TEXT NOT NULL DEFAULT '';
