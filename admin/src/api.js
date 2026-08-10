// admin/src/api.js
const API_BASE = "/api/v1";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok) {
    const err = new Error(body.error || "request_failed");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export function fetchMe() {
  return apiFetch("/me");
}

export function login(email, password) {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function fetchUsers(query, page) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page) params.set("page", String(page));
  const qs = params.toString();
  return apiFetch(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function fetchUserDetail(id) {
  return apiFetch(`/admin/users/${encodeURIComponent(id)}`);
}
