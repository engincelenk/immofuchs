import { describe, it, expect } from "vitest";
import { isOwnedBy } from "./objects";

describe("isOwnedBy (IDOR-Schutz, 4.9/OWASP A01)", () => {
  it("Eigentuemer darf zugreifen", () => {
    expect(isOwnedBy({ user_id: "user-a" }, "user-a")).toBe(true);
  });

  it("ein anderer Nutzer darf NICHT zugreifen, selbst mit gueltiger Objekt-ID", () => {
    expect(isOwnedBy({ user_id: "user-a" }, "user-b")).toBe(false);
  });

  it("leere userId ist nie Eigentuemer", () => {
    expect(isOwnedBy({ user_id: "user-a" }, "")).toBe(false);
  });
});
