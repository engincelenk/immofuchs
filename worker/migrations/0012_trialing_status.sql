-- Phase 3 (Kommerzialisierung) — 'trialing' wird ein eigenstaendiger
-- Subscription-Status statt wie bisher in 'active' zusammenzufallen
-- (siehe worker/src/paddle/webhook.ts, statusFromPaddle). Grund: der echte
-- 7-Tage-Trial muss in der UI und in Auswertungen von einem bezahlten Abo
-- unterscheidbar sein - fuer die Rechtepruefung (4.9) bleibt er dagegen
-- gleichwertig, ein Trial-Nutzer IST ein Pro-Nutzer (siehe computeIsPro).
--
-- Der partielle UNIQUE-Index aus 0003 deckte nur status = 'active' ab. Ohne
-- Erweiterung koennte ein Nutzer zwei Zeilen halten, die beide Pro gewaehren
-- (eine 'trialing', eine 'active') - genau das, was der Index in 0003
-- verhindern sollte. SQLite kann einen partiellen Index nicht per ALTER
-- aendern, daher DROP + CREATE (die Tabellendaten bleiben unberuehrt).

DROP INDEX IF EXISTS idx_subscriptions_active_user;
CREATE UNIQUE INDEX idx_subscriptions_active_user
  ON subscriptions(user_id) WHERE status IN ('active', 'trialing');

-- Eigene Spalte statt Wiederverwendung von renewal_reminder_sent_at: sonst
-- wuerde die Trial-Erinnerung die spaetere Jahres-Verlaengerungserinnerung
-- desselben Abos dauerhaft unterdruecken (die Spalte wird nie zurueckgesetzt).
-- Der Nutzer hat beim Trial-Start eine Zahlungsmethode hinterlegt und wird
-- nach 7 Tagen automatisch belastet - eine Vorwarnung ist Pflichtprogramm,
-- kein Marketing.
ALTER TABLE subscriptions ADD COLUMN trial_reminder_sent_at INTEGER;
