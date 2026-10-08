-- Investment-Briefing-Umbau (Spec docs/technical_specs/investment-briefing.md,
-- Abschnitt 10, Entscheidung E2): analyse/hebel/preis sind durch das eine
-- Produkt "briefing" ersetzt, der Worker beantwortet Anfragen auf die drei
-- alten Produkte seit Stufe 2 nicht mehr (400 unbekanntes_produkt). Entfernt
-- ihre alten Ergebnisse aus result_data.ai, damit kein Objekt tote Schluessel
-- mitschleppt, die kein Client-Code mehr liest (aiEngine.js ignoriert sie
-- zwar bereits defensiv, siehe ergebnisseLesen()/mitErgebnis(), aber die
-- Zeilen sollen nicht dauerhaft als JSON-Leichen liegen bleiben).
--
-- Kein D1-Export vor der Ausfuehrung noetig: Stand 2026-09-18 gibt es keine
-- aktiven Nutzer (Nutzer-Aussage), alle betroffenen Ergebnisse sind
-- Testdaten. Reihenfolge beim Ausrollen: dev, dann qa, dann prod.
UPDATE objects
SET result_data = json_remove(result_data, '$.ai.analyse', '$.ai.hebel', '$.ai.preis')
WHERE json_type(result_data, '$.ai') = 'object';
