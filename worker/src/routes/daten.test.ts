import { describe, it, expect } from "vitest";
import { datenRoutes, PLZ_LIMIT_PRO_STUNDE } from "./daten";
import type { Env } from "../types";

const ORIGIN = "https://dev.immofuchs.info";

// Minimaler Rate-Limiter: zaehlt je Name, wie checkAndIncrementWindow.
function envMock(): Env {
  const zaehler = new Map<string, number>();
  return {
    ALLOWED_ORIGIN: `http://localhost:5173,${ORIGIN}`,
    RATE_LIMITER_DO: {
      getByName: (name: string) => ({
        checkAndIncrementWindow: async (limit: number) => {
          const n = (zaehler.get(name) ?? 0) + 1;
          zaehler.set(name, n);
          return { allowed: n <= limit, remaining: Math.max(0, limit - n) };
        },
      }),
    },
  } as unknown as Env;
}

function get(env: Env, pfad: string, origin: string | null = ORIGIN, ip = "1.2.3.4") {
  const headers: Record<string, string> = { "CF-Connecting-IP": ip };
  if (origin) headers.Origin = origin;
  return datenRoutes.request(pfad, { headers }, env);
}

describe("/api/v1/daten", () => {
  it("liefert den Kreis zu einer PLZ", async () => {
    const res = await get(envMock(), "/plz-kreis/74385");
    expect(res.status).toBe(200);
    expect((await res.json()) as { kreis: string }).toMatchObject({ kreis: expect.stringMatching(/Ludwigsburg/) });
  });

  it("lehnt Anfragen ohne oder mit fremder Origin ab", async () => {
    expect((await get(envMock(), "/plz-kreis/74385", null)).status).toBe(403);
    expect((await get(envMock(), "/plz-kreis/74385", "https://evil.example")).status).toBe(403);
  });

  it("nimmt same-origin-Aufrufe ohne Origin an (Vite-Proxy im Dev)", async () => {
    const res = await datenRoutes.request(
      "/plz-kreis/74385",
      { headers: { "Sec-Fetch-Site": "same-origin" } },
      envMock(),
    );
    expect(res.status).toBe(200);
  });

  it("validiert die PLZ und das Bundesland", async () => {
    expect((await get(envMock(), "/plz-kreis/abc")).status).toBe(400);
    expect((await get(envMock(), "/regionalpreise/123")).status).toBe(400);
    expect((await get(envMock(), "/regionalpreise/XX")).status).toBe(404);
  });

  it("liefert nur das angefragte Bundesland", async () => {
    const res = await get(envMock(), "/regionalpreise/bw");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { bundesland: { code: string } };
    expect(body.bundesland.code).toBe("BW");
  });

  it("drosselt nach dem Limit je IP, andere IPs bleiben unberuehrt", async () => {
    const env = envMock();
    for (let i = 0; i < PLZ_LIMIT_PRO_STUNDE; i++) {
      expect((await get(env, "/plz-kreis/74385")).status).toBe(200);
    }
    const gedrosselt = await get(env, "/plz-kreis/74385");
    expect(gedrosselt.status).toBe(429);
    expect(gedrosselt.headers.get("Retry-After")).toBe("3600");
    expect((await get(env, "/plz-kreis/74385", ORIGIN, "9.9.9.9")).status).toBe(200);
  });
});
