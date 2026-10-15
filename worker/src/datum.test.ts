import { describe, it, expect } from "vitest";
import { datumDe } from "./datum";

describe("datumDe", () => {
  it("nutzt die Berliner Zeit statt UTC", () => {
    // 23:30 UTC am 14.11. ist 00:30 am 15.11. in Berlin (Winterzeit)
    expect(datumDe(Date.UTC(2026, 10, 14, 23, 30))).toBe("15.11.2026");
    // Sommerzeit: 22:30 UTC am 14.7. ist 00:30 am 15.7.
    expect(datumDe(Date.UTC(2026, 6, 14, 22, 30))).toBe("15.7.2026");
  });
});
