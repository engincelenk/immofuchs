// admin/src/UsersView.jsx
import { useEffect, useState, useCallback } from "react";
import { fetchUsers } from "./api";
import UserDetailView from "./UserDetailView.jsx";

export default function UsersView() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ users: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (q, p) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers(q, p);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    load(query, 1);
  }

  if (selectedId) {
    return <UserDetailView userId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / (result.pageSize || 20)));

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Nutzer</h1>
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Suche nach E-Mail..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ fontSize: 16, padding: 10, width: 320, border: "1px solid var(--cb)", borderRadius: 8, background: "var(--ci)" }}
        />
      </form>
      {loading && <div style={{ color: "var(--ch)" }}>Lade...</div>}
      {error && <div style={{ color: "#c0392b" }}>{error}</div>}
      {!loading && !error && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "var(--cro)", textAlign: "left" }}>
                <th style={{ padding: 10, fontSize: 12, color: "var(--ch)" }}>E-Mail</th>
                <th style={{ padding: 10, fontSize: 12, color: "var(--ch)" }}>Registriert</th>
                <th style={{ padding: 10, fontSize: 12, color: "var(--ch)" }}>Letzter Login</th>
                <th style={{ padding: 10, fontSize: 12, color: "var(--ch)" }}>Rolle</th>
                <th style={{ padding: 10, fontSize: 12, color: "var(--ch)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.users.map((u) => (
                <tr key={u.id} onClick={() => setSelectedId(u.id)} style={{ borderTop: "1px solid var(--cb)", cursor: "pointer" }}>
                  <td style={{ padding: 10, fontSize: 14 }}>{u.email}</td>
                  <td style={{ padding: 10, fontSize: 14 }}>{new Date(u.createdAt).toLocaleDateString("de-DE")}</td>
                  <td style={{ padding: 10, fontSize: 14 }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("de-DE") : "–"}
                  </td>
                  <td style={{ padding: 10, fontSize: 14 }}>{u.role}</td>
                  <td style={{ padding: 10, fontSize: 14 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        color: "#fff",
                        background: u.accountStatus === "SUSPENDED" ? "#c0392b" : "#22c55e",
                      }}
                    >
                      {u.accountStatus === "SUSPENDED" ? "Gesperrt" : "Aktiv"}
                    </span>
                  </td>
                </tr>
              ))}
              {result.users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--ch)" }}>
                    Keine Nutzer gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Zurück
            </button>
            <span>
              Seite {page} von {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Weiter
            </button>
          </div>
        </>
      )}
    </div>
  );
}
