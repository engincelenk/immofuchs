-- Spec-v3.0 Kap. 3.0/3.1a (T1): "1 Trial pro Nutzerkonto" muss serverseitig
-- geprüft werden, nicht nur über die Zahlungsmethode (sonst umgehbar über
-- eine neue Karte/PayPal-Adresse). Der Subscription-Status allein reicht
-- dafür nicht, da eine Zeile nach Trial-Ende in-place auf 'active' wechselt
-- (siehe 0012) - die Information "war mal trialing" ginge sonst verloren.
-- Eigene, nie zurückgesetzte Spalte auf users, analog zu expose_trial_used.

ALTER TABLE users ADD COLUMN trial_used_at INTEGER;
