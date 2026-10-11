import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { Env } from "./types";
import { SECURITY_HEADERS, securityHeaders } from "./securityHeaders";

describe("securityHeaders", () => {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", securityHeaders);
  app.get("/json", (c) => c.json({ ok: true }));
  app.get("/fehler", () => {
    throw new Error("kaputt");
  });
  app.onError((_err, c) => c.json({ error: "internal_error" }, 500));
  // Simuliert eine durchgereichte fetch()-Antwort mit unveraenderlichen Headern.
  app.get("/fest", () => {
    const res = new Response("pdf", { headers: { "Content-Type": "application/pdf" } });
    Object.defineProperty(res, "headers", {
      value: new Proxy(res.headers, {
        get(ziel, prop) {
          if (prop === "set") return () => {
            throw new TypeError("immutable");
          };
          const v = Reflect.get(ziel, prop);
          return typeof v === "function" ? v.bind(ziel) : v;
        },
      }),
    });
    return res;
  });
  app.get("/eigene", (c) => {
    c.header("X-Frame-Options", "SAMEORIGIN");
    return c.text("ok");
  });

  it("setzt alle Header auf normale Antworten", async () => {
    const res = await app.request("https://x.test/json");
    for (const [name, wert] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(name), name).toBe(wert);
  });

  it("setzt sie auch auf Fehlerantworten", async () => {
    const res = await app.request("https://x.test/fehler");
    expect(res.status).toBe(500);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("macht aus unveraenderlichen Headern keinen 500er", async () => {
    const res = await app.request("https://x.test/fest");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("pdf");
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Strict-Transport-Security")).toBe(SECURITY_HEADERS["Strict-Transport-Security"]);
  });

  it("ueberschreibt keinen Header, den eine Route bewusst setzt", async () => {
    const res = await app.request("https://x.test/eigene");
    expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });
});
