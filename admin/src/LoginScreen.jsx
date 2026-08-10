// admin/src/LoginScreen.jsx
import { useState } from "react";
import { login } from "./api";

// Schluessel = body.error, wie von POST /api/v1/auth/login zurueckgegeben
// (worker/src/routes/auth.ts) - unveraendert uebernommen, keine neue
// Fehlercodes erfunden.
const ERROR_MESSAGES = {
  locked: "Zu viele Fehlversuche. Bitte später erneut versuchen.",
  email_not_verified: "E-Mail-Adresse noch nicht bestätigt.",
  oauth_only: "Dieses Konto hat kein Passwort hinterlegt.",
  invalid_credentials: "E-Mail oder Passwort falsch.",
};

export default function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      onLoggedIn();
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] || "Login fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <form
        onSubmit={handleSubmit}
        style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, padding: 32, width: 320 }}
      >
        <h1 style={{ fontSize: 18, margin: "0 0 20px" }}>ImmoFuchs Admin</h1>
        <label style={{ display: "block", fontSize: 13, marginBottom: 6 }} htmlFor="admin-login-email">
          E-Mail
        </label>
        <input
          id="admin-login-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            fontSize: 16,
            padding: 10,
            marginBottom: 14,
            border: "1px solid var(--cb)",
            borderRadius: 8,
            background: "var(--ci)",
          }}
        />
        <label style={{ display: "block", fontSize: 13, marginBottom: 6 }} htmlFor="admin-login-password">
          Passwort
        </label>
        <input
          id="admin-login-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            fontSize: 16,
            padding: 10,
            marginBottom: 14,
            border: "1px solid var(--cb)",
            borderRadius: 8,
            background: "var(--ci)",
          }}
        />
        {error && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: 12,
            background: "var(--ca)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: submitting ? "default" : "pointer",
          }}
        >
          {submitting ? "Anmelden..." : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
