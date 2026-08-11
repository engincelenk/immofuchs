-- Admin Panel Etappe 2 (Backend Admin Panel Konzept, MVP-Pflicht #7 "Audit
-- Log"): protokolliert jede schreibende Admin-Aktion. Startet minimal - die
-- erste (und aktuell einzige) schreibende Aktion ist Sperren/Entsperren aus
-- Paket 5 (Access Management). Waechst additiv mit, sobald weitere
-- schreibende Admin-Aktionen (Preise, Gutscheine, Feature Flags, ...) in
-- spaeteren Etappen dazukommen - kein Schema-Umbau noetig, nur ein neuer
-- `action`-Wert.
--
-- admin_email denormalisiert (nicht nur admin_user_id): ein Audit-Log muss
-- auch dann noch lesbar sein, wenn der ausfuehrende Admin-Account spaeter
-- gelöscht wird - ein reiner Fremdschluessel wuerde beim Loeschen entweder
-- den Log-Eintrag mitreissen oder verwaist zurücklassen.

CREATE TABLE admin_audit_log (
  id             TEXT PRIMARY KEY,
  admin_user_id  TEXT NOT NULL,
  admin_email    TEXT NOT NULL,
  action         TEXT NOT NULL,   -- z.B. 'user.suspend', 'user.unsuspend'
  target_type    TEXT NOT NULL,   -- z.B. 'user'
  target_id      TEXT NOT NULL,
  details        TEXT,            -- optionales JSON (z.B. {"from":"ACTIVE","to":"SUSPENDED"})
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
