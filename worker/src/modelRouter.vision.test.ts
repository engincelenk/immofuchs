import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callVisionModel, leseWorkersAiVisionAntwort } from "./modelRouter";
import type { Env, InlineDatei } from "./types";

const DATEIEN: InlineDatei[] = [{ mimeType: "image/png", data: "AAAA" }];
const OK_JSON = '{"kaufpreis":300000}';

function geminiOk(text = OK_JSON): Response {
  return new Response(
    JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] }),
    { status: 200 },
  );
}
function geminiFehler(status: number): Response {
  return new Response("high demand", { status });
}

function env(ai?: unknown): Env {
  return { GEMINI_API_KEY: "k", AI: ai ?? { run: vi.fn() } } as unknown as Env;
}

describe("callVisionModel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function lauf(e: Env) {
    const p = callVisionModel(e, "prompt", {}, DATEIEN);
    p.catch(() => {});
    await vi.runAllTimersAsync();
    return p;
  }

  it("wiederholt bei 503 und liefert danach das Ergebnis", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(geminiFehler(503))
      .mockResolvedValueOnce(geminiOk());
    vi.stubGlobal("fetch", fetchMock);
    await expect(lauf(env())).resolves.toBe(OK_JSON);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const modell = (i: number) => String(fetchMock.mock.calls[i][0]);
    expect(modell(0)).toBe(modell(1));
  });

  it("wechselt nach erschoepften Wiederholungen auf das zweite Gemini-Modell", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("gemini-3.5-flash:") ? geminiOk() : geminiFehler(503),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(lauf(env())).resolves.toBe(OK_JSON);
    // 3 Versuche Hauptmodell (1 + 2 Wiederholungen) + 1 Treffer beim zweiten Modell
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("wiederholt dauerhafte Fehler (404) nicht, sondern wechselt sofort", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("gemini-3.5-flash:") ? geminiOk() : geminiFehler(404),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(lauf(env())).resolves.toBe(OK_JSON);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("faellt auf Workers AI zurueck und liest die choices-Form", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => geminiFehler(503)));
    const run = vi.fn().mockResolvedValue({ choices: [{ message: { content: OK_JSON } }] });
    await expect(lauf(env({ run }))).resolves.toBe(OK_JSON);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("nennt bei Totalausfall alle Ebenen im Fehlertext", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => geminiFehler(503)));
    const run = vi.fn().mockResolvedValue({ unerwartet: true });
    const err = await lauf(env({ run })).catch((e: Error) => e);
    expect((err as Error).message).toContain("gemini-3.5-flash-lite=");
    expect((err as Error).message).toContain("gemini-3.5-flash=");
    expect((err as Error).message).toContain("workers_ai=workers_ai_vision_unexpected_response");
  });

  it("wiederholt RECITATION einmal mit Eigene-Worte-Vorgabe", async () => {
    const recitation = new Response(
      JSON.stringify({ candidates: [{ finishReason: "RECITATION" }] }),
      { status: 200 },
    );
    const fetchMock = vi.fn().mockResolvedValueOnce(recitation).mockResolvedValueOnce(geminiOk());
    vi.stubGlobal("fetch", fetchMock);
    await expect(lauf(env())).resolves.toBe(OK_JSON);
    const zweiterBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(zweiterBody.systemInstruction.parts[0].text).toContain("eigenen Worten");
  });
});

describe("leseWorkersAiVisionAntwort", () => {
  it("kennt response, description, choices und Objekt-Antworten", () => {
    expect(leseWorkersAiVisionAntwort({ response: "a" })).toBe("a");
    expect(leseWorkersAiVisionAntwort({ description: "b" })).toBe("b");
    expect(leseWorkersAiVisionAntwort({ choices: [{ message: { content: "c" } }] })).toBe("c");
    expect(leseWorkersAiVisionAntwort({ response: { x: 1 } })).toBe('{"x":1}');
  });
  it("wirft mit der Antwortform im Text", () => {
    expect(() => leseWorkersAiVisionAntwort({ foo: 1 })).toThrow(/unexpected_response:\{"foo":1\}/);
  });
});
