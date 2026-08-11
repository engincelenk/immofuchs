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

export function fetchUsers(query, page) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page) params.set("page", String(page));
  const qs = params.toString();
  return request(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function fetchUserDetail(id) {
  return request(`/admin/users/${encodeURIComponent(id)}`);
}

export function setUserStatus(id, status) {
  return request(`/admin/users/${encodeURIComponent(id)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function fetchAuditLog(page) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  const qs = params.toString();
  return request(`/admin/audit-log${qs ? `?${qs}` : ""}`);
}
