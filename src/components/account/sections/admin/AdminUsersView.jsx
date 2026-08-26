import { useCallback, useEffect, useState } from "react";
import { createUser, fetchUsers } from "./adminApi.js";
import { AdminUserDrawer } from "./AdminUserDrawer.jsx";
import { useAdminToast } from "./AdminToast.jsx";
import {
  PLAN_LABELS,
  ROLE_LABELS,
  ROLE_OPTIONS,
  SUB_STATUS_LABELS,
  cardStyle,
  errorText,
  formatDate,
  labelStyle,
  mutedTextStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
  selectStyle,
  tableStyle,
  tdStyle,
  textInputStyle,
  thStyle,
} from "./adminUiStyles.js";

// Abo-Zustaende, die sich beim Direkt-Anlegen ohne echten Stripe-Kauf setzen
// lassen - nur relevant, wenn "Testuser" angehakt ist (siehe createUser in
// adminApi.js). Eigene Liste statt SUB_STATUS_LABELS direkt zu mappen, weil
// "kein Abo" (Free) als Auswahlwert dazukommt und keinen Server-Wert hat.
const CREATE_SUB_STATUS_OPTIONS = [
  { value: "", label: "Kein Abo (Free)" },
  ...Object.entries(SUB_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const EMPTY_CREATE_FORM = {
  email: "",
  name: "",
  role: "customer",
  isTestUser: false,
  testEmailRedirectTo: "",
  subStatus: "",
  subPlan: "monthly",
};

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

  // "User direkt anlegen" (Nutzer-Entscheidung 2026-08-1X) - nur fuer 'admin'
  // sichtbar, analog zu AdminUserDrawer/AdminDiscountsView. Mit nur noch zwei
  // Rollen ist das aktuell immer wahr (nur 'admin' erreicht diesen Bereich
  // ueberhaupt, siehe accountSections.js), bleibt aber als explizite Pruefung
  // bestehen statt sich implizit darauf zu verlassen.
  const canManage = currentUser?.role === "admin";
  const toast = useAdminToast();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createBusy, setCreateBusy] = useState(false);

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

  async function handleCreateSubmit(e) {
    e.preventDefault();
    const email = createForm.email.trim();
    if (!email) return;
    setCreateBusy(true);
    try {
      const payload = {
        email,
        name: createForm.name.trim(),
        role: createForm.role,
        isTestUser: createForm.isTestUser,
      };
      if (createForm.isTestUser && createForm.testEmailRedirectTo.trim()) {
        payload.testEmailRedirectTo = createForm.testEmailRedirectTo.trim();
      }
      // "Kein Abo" (leerer Wert) heisst: gar kein subscription-Feld schicken,
      // nicht mit leerem Status - der Worker unterscheidet "nicht mitgeschickt"
      // (kein Abo) von einer ungueltigen Angabe.
      if (createForm.isTestUser && createForm.subStatus) {
        payload.subscription = { status: createForm.subStatus, plan: createForm.subPlan };
      }
      const res = await createUser(payload);
      toast.success(
        res.inviteSent
          ? "Nutzer angelegt, Einladungsmail wurde verschickt."
          : "Nutzer angelegt, Einladungsmail konnte aber nicht verschickt werden.",
      );
      setCreateForm(EMPTY_CREATE_FORM);
      setShowCreate(false);
      setPage(1);
      await load();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setCreateBusy(false);
    }
  }

  const hasFilters =
    filters.q || filters.role || filters.status || filters.subscription || filters.sort !== "created_desc";
  const totalPages = Math.max(1, Math.ceil(result.total / (result.pageSize || 20)));

  return (
    <div>
      {canManage && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button type="button" onClick={() => setShowCreate((v) => !v)} style={secondaryBtnStyle}>
            {showCreate ? "Abbrechen" : "+ Nutzer anlegen"}
          </button>
        </div>
      )}

      {canManage && showCreate && (
        <form
          onSubmit={handleCreateSubmit}
          style={{ ...cardStyle, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <label style={labelStyle} htmlFor="create-email">
                E-Mail *
              </label>
              <input
                id="create-email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                style={{ ...textInputStyle, width: "100%" }}
              />
            </div>
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <label style={labelStyle} htmlFor="create-name">
                Name
              </label>
              <input
                id="create-name"
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                style={{ ...textInputStyle, width: "100%" }}
              />
            </div>
            <div style={{ flex: "0 1 160px" }}>
              <label style={labelStyle} htmlFor="create-role">
                Rolle
              </label>
              <select
                id="create-role"
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                style={selectStyle}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={createForm.isTestUser}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    isTestUser: e.target.checked,
                    subStatus: e.target.checked ? f.subStatus : "",
                    testEmailRedirectTo: e.target.checked ? f.testEmailRedirectTo : "",
                  }))
                }
                style={{ width: 18, height: 18, accentColor: "var(--ca)", cursor: "pointer" }}
              />
              <span>Testuser</span>
            </label>
          </div>

          {/* Fuer Testuser mit fiktiver E-Mail (z.B. test.admin@immofuchs.info,
              existiert real nicht): echte Adresse, an die die Einladungs- und
              alle Folgemails stattdessen gehen sollen (Migration 0023). Ohne
              Eintrag verhaelt es sich wie bisher - nur die dev-only
              TEST_EMAIL_REDIRECT_TO-Variable greift, sonst nichts. */}
          {createForm.isTestUser && (
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <label style={labelStyle} htmlFor="create-test-redirect">
                Tatsächliche Empfänger-E-Mail (optional)
              </label>
              <input
                id="create-test-redirect"
                type="email"
                placeholder="useforai@web.de"
                value={createForm.testEmailRedirectTo}
                onChange={(e) => setCreateForm((f) => ({ ...f, testEmailRedirectTo: e.target.value }))}
                style={{ ...textInputStyle, width: "100%" }}
              />
            </div>
          )}

          {/* Ein Abo direkt setzen geht nur bei Testusern - fuer echte Konten
              gibt es dafuer nur den Weg ueber Stripe (siehe adminApi.js). */}
          {createForm.isTestUser && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: "0 1 220px" }}>
                <label style={labelStyle} htmlFor="create-sub-status">
                  Abo-Status (optional, nur Testuser)
                </label>
                <select
                  id="create-sub-status"
                  value={createForm.subStatus}
                  onChange={(e) => setCreateForm((f) => ({ ...f, subStatus: e.target.value }))}
                  style={selectStyle}
                >
                  {CREATE_SUB_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {createForm.subStatus && (
                <div style={{ flex: "0 1 160px" }}>
                  <label style={labelStyle} htmlFor="create-sub-plan">
                    Plan
                  </label>
                  <select
                    id="create-sub-plan"
                    value={createForm.subPlan}
                    onChange={(e) => setCreateForm((f) => ({ ...f, subPlan: e.target.value }))}
                    style={selectStyle}
                  >
                    {Object.entries(PLAN_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <button type="submit" disabled={createBusy || !createForm.email.trim()} style={primaryBtnStyle}>
              Nutzer anlegen
            </button>
          </div>
        </form>
      )}

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
