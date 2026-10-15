import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "./types";

const sendEmailMock = vi.fn();
vi.mock("./email", () => ({ sendEmail: (...a: unknown[]) => sendEmailMock(...a) }));
const pushMock = vi.fn();
vi.mock("./push", () => ({ sendPushToUser: (...a: unknown[]) => pushMock(...a) }));

import { dispatchNotification } from "./notifications";

const env = {} as Env;
const intent = {
  event: "card_expiring" as const,
  recipientEmail: "a@b.de",
  recipientUserId: "user_1",
  payload: { expiry: "10/2026", last4: "4242", periodEndDate: "15.11.2026" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("card_expiring", () => {
  it("Mail enthaelt Ablaufmonat, Abbuchungsdatum und letzte 4 Ziffern; Push-Text passt", async () => {
    await dispatchNotification(env, intent);
    const [, to, subject, html] = sendEmailMock.mock.calls[0];
    expect(to).toBe("a@b.de");
    expect(subject).toContain("Zahlungskarte");
    expect(html).toContain("10/2026");
    expect(html).toContain("15.11.2026");
    expect(html).toContain("4242");
    const push = pushMock.mock.calls[0][2];
    expect(push.title).toContain("Zahlungskarte");
    expect(push.body).toContain("10/2026");
  });

  it("ohne last4 keine leere Klammer", async () => {
    await dispatchNotification(env, { ...intent, payload: { expiry: "10/2026", periodEndDate: "15.11.2026" } });
    expect(sendEmailMock.mock.calls[0][3]).not.toContain("••••");
  });

  it("liefert true bei erfolgreichem, false bei fehlgeschlagenem Mailversand", async () => {
    sendEmailMock.mockResolvedValueOnce(undefined);
    expect(await dispatchNotification(env, intent)).toBe(true);
    sendEmailMock.mockRejectedValueOnce(new Error("down"));
    expect(await dispatchNotification(env, intent)).toBe(false);
  });
});
