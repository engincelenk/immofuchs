import { afterEach, describe, expect, it, vi } from "vitest";
import { betreiberAdresse, sendEmail } from "./email";

function basisEnv(extra: Record<string, unknown> = {}) {
  return {
    MAGIC_LINK_FROM_EMAIL: "ImmoFuchs <login@send.example.com>",
    APP_BASE_URL: "https://example.com",
    DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
    ...extra,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("betreiberAdresse", () => {
  it("nimmt CONTACT_EMAIL, sonst den Standard", () => {
    expect(betreiberAdresse({ CONTACT_EMAIL: "a@b.de" })).toBe("a@b.de");
    expect(betreiberAdresse({})).toBe("info@immofuchs.info");
  });
});

describe("sendEmail: Reply-To und Fusszeile", () => {
  it("setzt reply_to bei Resend auf die Betreiber-Adresse", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail(
      basisEnv({ RESEND_API_KEY: "k", CONTACT_EMAIL: "info@example.com" }) as never,
      "kunde@example.com",
      "Betreff",
      "<p>Hallo</p>",
    );
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.reply_to).toBe("info@example.com");
    expect(body.to).toEqual(["kunde@example.com"]);
    expect(body.from).toBe("ImmoFuchs <login@send.example.com>");
  });
  it("nutzt ohne CONTACT_EMAIL den Standard", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail(basisEnv({ RESEND_API_KEY: "k" }) as never, "kunde@example.com", "B", "<p>x</p>");
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.reply_to).toBe("info@immofuchs.info");
  });
  it("gibt replyTo auch an das Cloudflare-Binding", async () => {
    const send = vi.fn(async () => {});
    await sendEmail(
      basisEnv({ EMAIL: { send }, CONTACT_EMAIL: "info@example.com" }) as never,
      "kunde@example.com",
      "B",
      "<p>x</p>",
    );
    expect((send.mock.calls[0] as unknown as [{ replyTo: string }])[0].replyTo).toBe("info@example.com");
  });
  it("nennt die Antwortadresse in der Fusszeile (HTML und Text)", async () => {
    const send = vi.fn(async () => {});
    await sendEmail(
      basisEnv({ EMAIL: { send }, CONTACT_EMAIL: "info@example.com" }) as never,
      "kunde@example.com",
      "B",
      "<p>x</p>",
    );
    const m = (send.mock.calls[0] as unknown as [{ html: string; text: string }])[0];
    expect(m.html).toContain("Antworten erreichen uns unter");
    expect(m.html).toContain("mailto:info@example.com");
    expect(m.text).toContain("info@example.com");
  });
  it("sendet im Standby nichts", async () => {
    const send = vi.fn(async () => {});
    await sendEmail(basisEnv({ EMAIL: { send }, STANDBY: "true" }) as never, "kunde@example.com", "B", "<p>x</p>");
    expect(send).not.toHaveBeenCalled();
  });
  it("leitet auf dev alles um und behaelt Reply-To", async () => {
    const send = vi.fn(async () => {});
    await sendEmail(
      basisEnv({ EMAIL: { send }, TEST_EMAIL_REDIRECT_TO: "test@example.com", CONTACT_EMAIL: "info@example.com" }) as never,
      "kunde@example.com",
      "B",
      "<p>x</p>",
    );
    const m = (send.mock.calls[0] as unknown as [{ to: string; subject: string; replyTo: string }])[0];
    expect(m.to).toBe("test@example.com");
    expect(m.subject).toBe("[TEST kunde@example.com] B");
    expect(m.replyTo).toBe("info@example.com");
  });
});
