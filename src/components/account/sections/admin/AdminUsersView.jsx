import { useCallback, useEffect, useState } from "react";
import { fetchUsers } from "./adminApi.js";
import { AdminUserDrawer } from "./AdminUserDrawer.jsx";
import {
  PLAN_LABELS,
  ROLE_LABELS,
  ROLE_OPTIONS,
  SUB_STATUS_LABELS,
  errorText,
  formatDate,
  labelStyle,
  mutedTextStyle,
  secondaryBtnStyle,
  selectStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from "./adminUiStyles.js";

const SORT_OPTIONS = [
  { value: "created_desc", label: "Neueste zuerst" },
  { value: "created_asc", label: "Älteste zuerst" },
  { value: "last_login_desc", label: "Zuletzt angemeldet" },
  { value: "email_asc", label: "E-Mail A–Z" },
];

const EMPTY_FILTERS = { q: "", role: "", status: "", subscription: "", sort: "created_desc" };

export function AdminUsersView({ currentUser }) {
  // Zwei getrennte Zustaende fuer die Suche: `draft` ist das Eingabefeld,
  // `filters.q` der abgeschickte Wert. Ohne die Trennung wuerde jeder
  // Tastenanschlag eine Abfrage ausloesen. Die Dropdowns greifen dagegen
  // sofort - dort gibt es kein Tippen, auf das man warten muesste.
  const [draftQuery, setDraftQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ users: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await fetchUsers(filters, page));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Jede Filteraenderung springt zurueck auf Seite 1 - sonst stuende man
  // nach dem Filtern auf einer Seite, die es im neuen Ergebnis nicht gibt.
  function updateFilter(key, value) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateFilter("q", draftQuery.trim());
  }

  function resetFilters() {
    setDraftQuery("");
    setPage(1);
    setFilters(EMPTY_FILTERS);
  }

  const hasFilters =
    filters.q || filters.role || filters.status || filters.subscription || filters.sort !== "created_desc";
  const totalPages = Math.max(1, Math.ceil(result.total / (result.pageSize || 20)));

  return (
    <div>
      <form
        onSubmit={handleSearchSubmit}
        style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 16 }}
      >
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <label style={labelStyle} htmlFor="admin-search">
            Suche
          </label>
          <input
            id="admin-search"
            type="search"
            placeholder="E-Mail …"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <FilterSelect
          id="admin-filter-role"
          label="Rolle"
          value={filters.role}
          onChange={(v) => updateFilter("role", v)}
          options={ROLE_OPTIONS}
        />
        <FilterSelect
          id="admin-filter-status"
          label="Status"
          value={filters.status}
          onChange={(v) => updateFilter("status", v)}
          options={[
            { value: "ACTIVE", label: "Aktiv" },
            { value: "SUSPENDED", label: "Gesperrt" },
          ]}
        />
        <FilterSelect
          id="admin-filter-sub"
          label="Abo"
          value={filters.subscription}
          onChange={(v) => updateFilter("subscription", v)}
          options={[
            { value: "pro", label: "Pro" },
            { value: "free", label: "Free" },
          ]}
        />
        <FilterSelect
          id="admin-filter-sort"
          label="Sortierung"
          value={filters.sort}
          onChange={(v) => updateFilter("sort", v)}
          options={SORT_OPTIONS}
          allowEmpty={false}
        />
        {/* Der Knopf ist fuer das Suchfeld da (Enter tut dasselbe) - die
            Dropdowns oben haben ihn nicht noetig, sie greifen sofort. */}
        <button type="submit" style={secondaryBtnStyle}>
          Suchen
        </button>
        {hasFilters && (
          <button type="button" onClick={resetFilters} style={secondaryBtnStyle}>
            Zurücksetzen
          </button>
        )}
      </form>

      {error && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--ci)" }}>
              <th style={thStyle}>E-Mail</th>
              <th style={thStyle}>Registriert</th>
              <th style={thStyle}>Letzter Login</th>
              <th style={thStyle}>Rolle</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Abo</th>
            </tr>
          </thead>
          <tbody>
            {result.users.map((u) => (
              <tr
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                style={{
                  borderTop: "1px solid var(--cb)",
                  cursor: "pointer",
                  background: u.id === selectedId ? "var(--ca-bg)" : "transparent",
                }}
              >
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span>{u.email}</span>
                    {/* Die Schalter stehen bewusst als kleine Marker in der
                        E-Mail-Spalte statt in zwei eigenen Spalten - sie sind
                        selten gesetzt, zwei fast immer leere Spalten waeren
                        verschwendete Tabellenbreite. */}
                    {u.isTestUser && <Tag text="Test" />}
                    {u.isBeta && <Tag text="Beta" />}
                  </div>
                </td>
                <td style={tdStyle}>{formatDate(u.createdAt)}</td>
                <td style={tdStyle}>{formatDate(u.lastLoginAt)}</td>
                <td style={tdStyle}>{ROLE_LABELS[u.role] || u.role}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      color: "#fff",
                      whiteSpace: "nowrap",
                      background: u.accountStatus === "SUSPENDED" ? "#c0392b" : "#22c55e",
                    }}
                  >
                    {u.accountStatus === "SUSPENDED" ? "Gesperrt" : "Aktiv"}
                  </span>
                </td>
                <td style={tdStyle}>
                  {u.subscription ? (
                    <span style={{ whiteSpace: "nowrap" }}>
                      {PLAN_LABELS[u.subscription.plan] || u.subscription.plan}
                      <span style={{ color: "var(--ch)" }}>
                        {" · "}
                        {SUB_STATUS_LABELS[u.subscription.status] || u.subscription.status}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "var(--ch)" }}>Free</span>
                  )}
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", ...mutedTextStyle }}>
                  Wird geladen …
                </td>
              </tr>
            )}
            {!loading && !error && result.users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", ...mutedTextStyle }}>
                  Keine Nutzer gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={secondaryBtnStyle}>
          Zurück
        </button>
        <span style={{ color: "var(--ch)" }}>
          Seite {page} von {totalPages} · {result.total} Nutzer
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={secondaryBtnStyle}>
          Weiter
        </button>
      </div>

      {/* Immer gemountet statt `{selectedId && ...}` - AdminUserDrawer leitet
          `open` aus `userId` ab und behaelt die zuletzt gewaehlte ID waehrend
          der Ausstiegs-Animation (siehe dort), nur so kann Sheet.jsx sie
          zeigen. */}
      <AdminUserDrawer
        userId={selectedId}
        currentUser={currentUser}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </div>
  );
}

function FilterSelect({ id, label, value, onChange, options, allowEmpty = true }) {
  return (
    <div>
      <label style={labelStyle} htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        {allowEmpty && <option value="">Alle</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Tag({ text }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "1px 6px",
        borderRadius: 20,
        color: "var(--ca-dk)",
        background: "var(--ca-bg)",
        border: "1px solid var(--ca-bd)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
