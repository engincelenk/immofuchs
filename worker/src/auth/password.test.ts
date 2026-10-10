import { describe, it, expect, vi, afterEach } from "vitest";
import { isPasswordLeaked } from "./password";

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
const GELEAKT = "password";

afterEach(() => vi.unstubAllGlobals());

describe("isPasswordLeaked (HIBP, k-Anonymitaet)", () => {
  it("meldet ein Passwort, dessen Hash-Suffix in der Antwort steht", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\r\n"),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await isPasswordLeaked(GELEAKT)).toBe(true);
    // Nur die ersten 5 Zeichen des Hashes verlassen den Worker.
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.pwnedpasswords.com/range/5BAA6");
  });

  it("laesst ein Passwort durch, das nicht in der Antwort steht", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n")));
    expect(await isPasswordLeaked(GELEAKT)).toBe(false);
  });

  it("blockiert bei Ausfall des Dienstes nicht (best effort)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await isPasswordLeaked(GELEAKT)).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("err", { status: 503 })));
    expect(await isPasswordLeaked(GELEAKT)).toBe(false);
  });
});
