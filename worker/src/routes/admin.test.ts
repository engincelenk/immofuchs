import { describe, it, expect } from "vitest";
import { parseAdminUsersQuery } from "./admin";

describe("parseAdminUsersQuery (Such-Sanitizing fuer GET /admin/users)", () => {
  it("liefert leere Suche und Seite 1 ohne Parameter", () => {
    expect(parseAdminUsersQuery(new URLSearchParams())).toEqual({ search: "", page: 1 });
  });

  it("trimmt die Suche", () => {
    const result = parseAdminUsersQuery(new URLSearchParams({ q: "  max@immofuchs.info  " }));
    expect(result.search).toBe("max@immofuchs.info");
  });

  it("escaped LIKE-Wildcards (% und _) im Suchbegriff, damit sie als Literal gesucht werden", () => {
    const result = parseAdminUsersQuery(new URLSearchParams({ q: "max_50%" }));
    expect(result.search).toBe("max\\_50\\%");
  });

  it("escaped einen literalen Backslash im Suchbegriff", () => {
    const result = parseAdminUsersQuery(new URLSearchParams({ q: "a\\b" }));
    expect(result.search).toBe("a\\\\b");
  });

  it("Seite faellt auf 1 zurueck bei fehlendem/ungueltigem/negativem/nullwertigem Parameter", () => {
    expect(parseAdminUsersQuery(new URLSearchParams()).page).toBe(1);
    expect(parseAdminUsersQuery(new URLSearchParams({ page: "abc" })).page).toBe(1);
    expect(parseAdminUsersQuery(new URLSearchParams({ page: "-3" })).page).toBe(1);
    expect(parseAdminUsersQuery(new URLSearchParams({ page: "0" })).page).toBe(1);
  });

  it("gueltige Seite wird uebernommen", () => {
    expect(parseAdminUsersQuery(new URLSearchParams({ page: "3" })).page).toBe(3);
  });
});
