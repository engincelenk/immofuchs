// admin/src/api.test.js
import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("gibt das geparste JSON bei Erfolg zurueck", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ hello: "world" }) }),
    );
    const result = await apiFetch("/me");
    expect(result).toEqual({ hello: "world" });
  });

  it("wirft bei Nicht-2xx einen Fehler mit status und body.error als message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "not_authenticated" }) }),
    );
    await expect(apiFetch("/me")).rejects.toMatchObject({ status: 401, message: "not_authenticated" });
  });

  it("wirft bei 403 mit dem Backend-Fehlercode (kein Admin)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "forbidden" }) }),
    );
    await expect(apiFetch("/admin/users")).rejects.toMatchObject({ status: 403, message: "forbidden" });
  });

  it("sendet credentials:'include' an den korrekten /api/v1-Pfad", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    await apiFetch("/me");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/me", expect.objectContaining({ credentials: "include" }));
  });
});
