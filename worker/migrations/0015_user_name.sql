-- Konzept-Dok Abschnitt 1.6/3.3/8.8 (Neue Phase, Namensfeld): der Name wird
-- ab jetzt bei der Passwort-Registrierung abgefragt (Rechnungsstellung).
-- Nullable, da OAuth-/Passkey-/Magic-Link-Konten den Namen nicht ueber ein
-- eigenes Formular erfassen - dort bleibt er zunaechst leer und kann
-- nachtraeglich im Profil ergaenzt werden.

ALTER TABLE users ADD COLUMN name TEXT;
