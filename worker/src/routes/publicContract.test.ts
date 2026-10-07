import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";

const kuendigen = vi.fn();
const widerrufen = vi.fn();
const sendEmail = vi.fn();
vi.mock("../contractActions", async (orig) => ({
  ...(await orig<typeof import("../contractActions")>()),
  kuendigen: (...a: unknown[]) => kuendigen(...a),
  widerrufen: (...a: unknown[]) => widerrufen(...a),
}));
vi.mock("../email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { publicContractRoutes } from "./publicContract";

let erlaubt = true;
const env = {
  ALLOWED_ORIGIN: "https://dev.immofuchs.info",
  RATE_LIMITER_DO: { getByName: () => ({ checkAndIncrementWindow: async () => ({ allowed: erlaubt }) }) },
} as unknown as Env;

function post(pfad: string, body: unknown, origin: string | null = "https://dev.immofuchs.info") {
  return publicContractRoutes.request(
    pfad,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
      body: JSON.stringify(body),
    },
    env,
  );
}

beforeEach(() => {
  erlaubt = true;
  kuendigen.mockReset().mockResolvedValue({ ok: true, gefunden: true, periodEnd: 1 });
  widerrufen.mockReset().mockResolvedValue({ ok: true, gefunden: true, erstattungCent: 500, wertersatzCent: 100 });
  sendEmail.mockReset().mockResolvedValue(undefined);
});

describe("POST /cancel (ohne Anmeldung)", () => {
  it("antwortet mit Eingangszeitpunkt und ruft die Kuendigung ueber die E-Mail auf", async () => {
    const res = await post("/cancel", { email: "Max@Beispiel.de", name: "Max Muster" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; receivedAt: string };
    expect(json.ok).toBe(true);
    expect(json.receivedAt).toMatch(/Uhr$/);
    expect(kuendigen.mock.calls[0][1]).toMatchObject({ email: "max@beispiel.de", name: "Max Muster", channel: "public" });
  });
  it("antwortet gleich, auch wenn kein Vertrag existiert (kein Abfragen fremder Adressen)", async () => {
    kuendigen.mockResolvedValue({ ok: true, gefunden: false });
    const res = await post("/cancel", { email: "niemand@beispiel.de" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
  });
  it("lehnt unplausible E-Mail, fremde Origin und Ueberlast ab", async () => {
    expect((await post("/cancel", { email: "nein" })).status).toBe(400);
    expect((await post("/cancel", { email: "a@b.de" }, "https://boese.example")).status).toBe(403);
    erlaubt = false;
    expect((await post("/cancel", { email: "a@b.de" })).status).toBe(429);
    expect(kuendigen).not.toHaveBeenCalled();
  });
});

describe("POST /withdraw (ohne Anmeldung)", () => {
  it("verlangt den Namen (§ 356a Abs. 2 BGB)", async () => {
    expect((await post("/withdraw", { email: "a@b.de", name: "" })).status).toBe(400);
    expect(widerrufen).not.toHaveBeenCalled();
  });
  it("nimmt Name und E-Mail an", async () => {
    const res = await post("/withdraw", { email: "a@b.de", name: "Erika Muster" });
    expect(res.status).toBe(200);
    expect(widerrufen.mock.calls[0][1]).toMatchObject({ email: "a@b.de", name: "Erika Muster", channel: "public" });
  });
  it("meldet 502, wenn die Abwicklung scheitert", async () => {
    widerrufen.mockResolvedValue({ ok: false, error: "withdraw_failed" });
    expect((await post("/withdraw", { email: "a@b.de", name: "Erika Muster" })).status).toBe(502);
  });
});

describe("POST /contact", () => {
  const gueltig = { name: "Max Muster", email: "max@beispiel.de", message: "Ich habe eine Frage zur App.", lang: "tr" };
  it("sendet die Nachricht an info@immofuchs.info und maskiert HTML", async () => {
    const res = await post("/contact", { ...gueltig, message: "Hallo <script>alert(1)</script> Welt, das ist ein Test" });
    expect(res.status).toBe(200);
    const [, to, subject, html] = sendEmail.mock.calls[0];
    expect(to).toBe("info@immofuchs.info");
    expect(subject).toContain("Max Muster");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("tr");
  });
  it("Honeypot: Bots bekommen ok, es geht aber nichts raus", async () => {
    const res = await post("/contact", { ...gueltig, website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it("prueft Name, E-Mail, Nachricht und Limits", async () => {
    expect((await post("/contact", { ...gueltig, name: "" })).status).toBe(400);
    expect((await post("/contact", { ...gueltig, email: "x" })).status).toBe(400);
    expect((await post("/contact", { ...gueltig, message: "kurz" })).status).toBe(400);
    erlaubt = false;
    expect((await post("/contact", gueltig)).status).toBe(429);
  });
  it("meldet 502, wenn der Mailversand scheitert", async () => {
    sendEmail.mockRejectedValue(new Error("down"));
    expect((await post("/contact", gueltig)).status).toBe(502);
  });
});
