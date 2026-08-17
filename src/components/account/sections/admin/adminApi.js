// Duenner Wrapper um die bestehende apiFetch-Utility (Spec 10.0) - ersetzt
// den frueher eigenstaendigen Fetch-Wrapper aus admin/src/api.js (separates
// Vite-Projekt, siehe Nutzer-Entscheidung 2026-08-11: Admin-Bereich wird
// vollstaendig in die Kunden-App integriert statt als eigene App/eigener
// Login-Screen zu laufen). apiFetch haengt bereits credentials:"include" und
// im nativen Kontext den Bearer-Token-Header an.
import { apiFetch } from "../../../../utils/apiBase.js";

async function request(path, options = {}) {
  const res = await apiFetch(path, options);
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok) {
    const err = new Error(body.error || "request_failed");
    err.status = res.status;
    throw err;
  }
  return body;
}

export function fetchDashboard() {
  return request("/admin/dashboard");
}

export function fetchActivity() {
  return request("/admin/activity");
}

// Alle schreibenden Aufrufe gehen ueber diesen Helfer, damit der
// Content-Type nicht - wie frueher bei den Gutschein-Routen - an einzelnen
// Stellen vergessen wird.
function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

// filters: {q, role, status, subscription, sort} - leere Werte werden
// weggelassen, der Worker behandelt fehlende Parameter als "kein Filter".
export function fetchUsers(filters = {}, page) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.subscription) params.set("subscription", filters.subscription);
  if (filters.sort) params.set("sort", filters.sort);
  if (page) params.set("page", String(page));
  const qs = params.toString();
  return request(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function fetchUserDetail(id) {
  return request(`/admin/users/${encodeURIComponent(id)}`);
}

// input: {email, name?, role, isTestUser?, isBeta?, subscription?: {status, plan}}
// subscription ist nur zusammen mit isTestUser:true gueltig (Worker lehnt es
// sonst ab) - es gibt dafuer keinen echten Paddle-Kauf.
export function createUser(input) {
  return post("/admin/users", input);
}

export function setUserStatus(id, status) {
  return post(`/admin/users/${encodeURIComponent(id)}/status`, { status });
}

export function setUserRole(id, role) {
  return post(`/admin/users/${encodeURIComponent(id)}/role`, { role });
}

// Nur den tatsaechlich umgeschalteten Wert senden - der Worker laesst den
// jeweils anderen Schalter dann unangetastet.
export function setUserFlags(id, flags) {
  return post(`/admin/users/${encodeURIComponent(id)}/flags`, flags);
}

export function addSupportNote(id, note) {
  return post(`/admin/users/${encodeURIComponent(id)}/notes`, { note });
}

export function triggerPasswordReset(id) {
  return post(`/admin/users/${encodeURIComponent(id)}/password-reset`);
}

export function revokeSessions(id) {
  return post(`/admin/users/${encodeURIComponent(id)}/sessions/revoke`);
}

export function deleteUser(id) {
  return post(`/admin/users/${encodeURIComponent(id)}/delete`);
}

export function fetchSubscriptions(status, page) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page) params.set("page", String(page));
  const qs = params.toString();
  return request(`/admin/subscriptions${qs ? `?${qs}` : ""}`);
}

export function fetchSubscriptionDetail(id) {
  return request(`/admin/subscriptions/${encodeURIComponent(id)}`);
}

// filters: {admin, action, target, from, to} - from/to als ms-Zeitstempel.
export function fetchAuditLog(page, filters = {}) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (filters.admin) params.set("admin", filters.admin);
  if (filters.action) params.set("action", filters.action);
  if (filters.target) params.set("target", filters.target);
  if (filters.from) params.set("from", String(filters.from));
  if (filters.to) params.set("to", String(filters.to));
  const qs = params.toString();
  return request(`/admin/audit-log${qs ? `?${qs}` : ""}`);
}

export function fetchDiscounts() {
  return request("/admin/discounts");
}

export function createDiscount(input) {
  return post("/admin/discounts", input);
}

export function setDiscountStatus(id, status) {
  return post(`/admin/discounts/${encodeURIComponent(id)}/status`, { status });
}

// patch: {description?, amount?, usageLimit?, expiresAt?, status?}
// usageLimit/expiresAt duerfen ausdruecklich null sein ("unbegrenzt" bzw.
// "laeuft nicht ab") - weglassen heisst dagegen "unveraendert lassen".
export function updateDiscount(id, patch) {
  return post(`/admin/discounts/${encodeURIComponent(id)}`, patch);
}

export function createDiscountsBulk(input) {
  return post("/admin/discounts/bulk", input);
}
