import { describe, expect, it } from "vitest";
import { isRegistrationOpen } from "./registrationGate";

// Minimaler D1-Ersatz: liefert fuer SELECT die vorgegebene Zeile (oder wirft).
function fakeDb(row: { value: string } | null | "throw") {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => {
          if (row === "throw") throw new Error("no such table: app_settings");
          return row;
        },
      }),
    }),
  } as never;
}

describe("registrationGate", () => {
  it("ist ohne Variable und ohne Override offen (dev)", async () => {
    expect(await isRegistrationOpen({ DB: fakeDb(null) })).toBe(true);
  });
  it("ist bei REGISTRATION_ENABLED=false gesperrt (prod, qa)", async () => {
    expect(await isRegistrationOpen({ REGISTRATION_ENABLED: "false", DB: fakeDb(null) })).toBe(false);
  });
  it("DB-Override schlaegt die Variable (Admin-Schalter)", async () => {
    expect(await isRegistrationOpen({ REGISTRATION_ENABLED: "false", DB: fakeDb({ value: "true" }) })).toBe(true);
    expect(await isRegistrationOpen({ REGISTRATION_ENABLED: "true", DB: fakeDb({ value: "false" }) })).toBe(false);
  });
  it("faellt ohne migrierte Tabelle auf die Variable zurueck", async () => {
    expect(await isRegistrationOpen({ REGISTRATION_ENABLED: "false", DB: fakeDb("throw") })).toBe(false);
    expect(await isRegistrationOpen({ DB: fakeDb("throw") })).toBe(true);
  });
});
