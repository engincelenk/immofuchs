import { describe, it, expect } from "vitest";
import {
  parseAdminUsersQuery,
  parseAdminAuditQuery,
  parseAdminSubscriptionsQuery,
  parseExpiryDate,
} from "./admin";
import { generateDiscountCode } from "../stripe/discounts";

describe("parseAdminUsersQuery (Such-Sanitizing fuer GET /admin/users)", () => {
  it("liefert leere Suche, keine Filter und Seite 1 ohne Parameter", () => {
    expect(parseAdminUsersQuery(new URLSearchParams())).toEqual({
      filter: {
        search: "",
        role: null,
        accountStatus: null,
        subscription: null,
        sort: "created_desc",
      },
      page: 1,
    });
  });

  it("trimmt die Suche", () => {
    const result = parseAdminUsersQuery(new URLSearchParams({ q: "  max@immofuchs.info  " }));
    expect(result.filter.search).toBe("max@immofuchs.info");
  });

  // %, _ und \ sind seit dem Wechsel auf instr() (listUsersForAdmin in db.ts,
  // 19.08., IMP-12-Nachtrag) keine Sonderzeichen mehr - instr() kennt keinen
  // Wildcard-Mechanismus. Der Suchbegriff muss deshalb unveraendert durchgehen;
  // ein wieder eingebautes Escaping wuerde die Suche verfaelschen.
  it("laesst LIKE-Sonderzeichen (%, _, \\) unveraendert durch", () => {
    expect(parseAdminUsersQuery(new URLSearchParams({ q: "max_50%" })).filter.search).toBe("max_50%");
    expect(parseAdminUsersQuery(new URLSearchParams({ q: "a\\b" })).filter.search).toBe("a\\b");
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

// Die Filterwerte landen in SQL, deshalb hier ausdruecklich auch die
// Negativfaelle: ein manipulierter Query-String darf nie durchrutschen,
// sondern faellt still auf "kein Filter" bzw. den Standard zurueck.
describe("parseAdminUsersQuery — Filter und Sortierung (Whitelist)", () => {
  it("uebernimmt gueltige Rollen", () => {
    expect(parseAdminUsersQuery(new URLSearchParams({ role: "admin" })).filter.role).toBe("admin");
    expect(parseAdminUsersQuery(new URLSearchParams({ role: "customer" })).filter.role).toBe("customer");
  });

  it("verwirft unbekannte Rollen (auch die abgeschafften 'test_user'/'support') und SQL-Versuche", () => {
    expect(parseAdminUsersQuery(new URLSearchParams({ role: "test_user" })).filter.role).toBeNull();
    expect(parseAdminUsersQuery(new URLSearchParams({ role: "support" })).filter.role).toBeNull();
    expect(parseAdminUsersQuery(new URLSearchParams({ role: "' OR 1=1--" })).filter.role).toBeNull();
  });

  it("uebernimmt gueltige Kontostatus, verwirft alles andere", () => {
    expect(parseAdminUsersQuery(new URLSearchParams({ status: "ACTIVE" })).filter.accountStatus).toBe("ACTIVE");
    expect(parseAdminUsersQuery(new URLSearchParams({ status: "SUSPENDED" })).filter.accountStatus).toBe("SUSPENDED");
    expect(parseAdminUsersQuery(new URLSearchParams({ status: "active" })).filter.accountStatus).toBeNull();
    expect(parseAdminUsersQuery(new URLSearchParams({ status: "DELETED" })).filter.accountStatus).toBeNull();
  });

  it("kennt beim Abo-Filter nur 'pro' und 'free'", () => {
    expect(parseAdminUsersQuery(new URLSearchParams({ subscription: "pro" })).filter.subscription).toBe("pro");
    expect(parseAdminUsersQuery(new URLSearchParams({ subscription: "free" })).filter.subscription).toBe("free");
    expect(parseAdminUsersQuery(new URLSearchParams({ subscription: "trialing" })).filter.subscription).toBeNull();
  });

  it("faellt bei unbekannter Sortierung auf created_desc zurueck", () => {
    expect(parseAdminUsersQuery(new URLSearchParams({ sort: "email_asc" })).filter.sort).toBe("email_asc");
    expect(parseAdminUsersQuery(new URLSearchParams({ sort: "last_login_desc" })).filter.sort).toBe("last_login_desc");
    expect(parseAdminUsersQuery(new URLSearchParams({ sort: "created_asc" })).filter.sort).toBe("created_asc");
    expect(parseAdminUsersQuery(new URLSearchParams({ sort: "id; DROP TABLE users" })).filter.sort).toBe("created_desc");
  });
});

describe("parseAdminSubscriptionsQuery (Filter fuer GET /admin/subscriptions)", () => {
  it("ohne Parameter kein Filter und Seite 1", () => {
    expect(parseAdminSubscriptionsQuery(new URLSearchParams())).toEqual({ status: null, page: 1 });
  });

  it("kennt genau die vier Filter aus dem Auftrag", () => {
    for (const value of ["active", "trialing", "canceled", "past_due"]) {
      expect(parseAdminSubscriptionsQuery(new URLSearchParams({ status: value })).status).toBe(value);
    }
  });

  it("verwirft rohe Status, die kein Filter sind, sowie SQL-Versuche", () => {
    // 'cancel_scheduled' ist ein DB-Status, aber kein Filterschluessel - er
    // steckt serverseitig im Filter 'canceled' mit drin.
    expect(parseAdminSubscriptionsQuery(new URLSearchParams({ status: "cancel_scheduled" })).status).toBeNull();
    expect(parseAdminSubscriptionsQuery(new URLSearchParams({ status: "' OR 1=1--" })).status).toBeNull();
  });

  it("faellt nicht auf geerbte Object-Eigenschaften herein", () => {
    // Ohne hasOwnProperty-Pruefung wuerde "constructor" o.ae. als gueltiger
    // Filterschluessel durchgehen und die Query mit Unsinn binden.
    expect(parseAdminSubscriptionsQuery(new URLSearchParams({ status: "constructor" })).status).toBeNull();
    expect(parseAdminSubscriptionsQuery(new URLSearchParams({ status: "toString" })).status).toBeNull();
  });

  it("Seite wird uebernommen bzw. faellt auf 1 zurueck", () => {
    expect(parseAdminSubscriptionsQuery(new URLSearchParams({ page: "4" })).page).toBe(4);
    expect(parseAdminSubscriptionsQuery(new URLSearchParams({ page: "-1" })).page).toBe(1);
  });
});

// Der Rueckgabewert hat drei Bedeutungen, die nicht verwechselt werden
// duerfen: ein ISO-String (setzen), null (ausdruecklich "laeuft nicht ab")
// und undefined (nicht mitgeschickt -> Feld unangetastet lassen).
describe("parseExpiryDate (Gutschein-Ablaufdatum)", () => {
  it("wandelt YYYY-MM-DD in ISO-8601 am Tagesende UTC um", () => {
    // Tagesende, damit ein Gutschein am angegebenen Tag noch gilt und nicht
    // um 00:00 verfaellt.
    expect(parseExpiryDate("2026-09-30")).toBe("2026-09-30T23:59:59.000Z");
  });

  it("unterscheidet null (kein Ablauf) von undefined (nicht mitgeschickt)", () => {
    expect(parseExpiryDate(null)).toBeNull();
    expect(parseExpiryDate(undefined)).toBeUndefined();
    expect(parseExpiryDate("")).toBeUndefined();
    expect(parseExpiryDate("   ")).toBeUndefined();
  });

  it("verwirft alles, was nicht dem Datumsformat entspricht", () => {
    expect(parseExpiryDate("30.09.2026")).toBeUndefined();
    expect(parseExpiryDate("2026-9-3")).toBeUndefined();
    expect(parseExpiryDate("morgen")).toBeUndefined();
    expect(parseExpiryDate(12345)).toBeUndefined();
  });
});

describe("generateDiscountCode (Mehrfach-Codes)", () => {
  it("haengt einen Zufalls-Suffix an den Praefix", () => {
    expect(generateDiscountCode("SOMMER")).toMatch(/^SOMMER-[A-Z0-9]{6}$/);
  });

  it("funktioniert auch ohne Praefix", () => {
    expect(generateDiscountCode("")).toMatch(/^[A-Z0-9]{6}$/);
    expect(generateDiscountCode("   ")).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("normalisiert den Praefix (Grossschreibung, keine Sonderzeichen)", () => {
    expect(generateDiscountCode("sommer 25!")).toMatch(/^SOMMER25-[A-Z0-9]{6}$/);
  });

  it("verwendet keine verwechselbaren Zeichen (0 O 1 I L)", () => {
    // Die Codes werden abgetippt und vorgelesen - ueber viele Ziehungen darf
    // keines dieser Zeichen auftauchen.
    const codes = Array.from({ length: 200 }, () => generateDiscountCode(""));
    expect(codes.join("")).not.toMatch(/[01OIL]/);
  });

  it("liefert praktisch nie zweimal denselben Code", () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateDiscountCode("X")));
    expect(codes.size).toBe(500);
  });
});

describe("parseAdminAuditQuery (Filter fuer GET /admin/audit-log)", () => {
  it("liefert ohne Parameter leere Filter und Seite 1", () => {
    expect(parseAdminAuditQuery(new URLSearchParams())).toEqual({
      filter: { adminEmail: null, action: null, targetId: null, from: null, to: null },
      page: 1,
    });
  });

  it("uebernimmt Admin, Aktion und Ziel als Text", () => {
    const { filter } = parseAdminAuditQuery(
      new URLSearchParams({ admin: "chef@immofuchs.info", action: "user.role_change", target: "abc-123" }),
    );
    expect(filter.adminEmail).toBe("chef@immofuchs.info");
    expect(filter.action).toBe("user.role_change");
    expect(filter.targetId).toBe("abc-123");
  });

  it("behandelt leere/nur-Leerzeichen-Werte wie 'kein Filter'", () => {
    const { filter } = parseAdminAuditQuery(new URLSearchParams({ admin: "   ", action: "" }));
    expect(filter.adminEmail).toBeNull();
    expect(filter.action).toBeNull();
  });

  it("uebernimmt den Zeitraum als Millisekunden-Zeitstempel", () => {
    const { filter } = parseAdminAuditQuery(new URLSearchParams({ from: "1700000000000", to: "1800000000000" }));
    expect(filter.from).toBe(1700000000000);
    expect(filter.to).toBe(1800000000000);
  });

  it("ungueltiger Zeitraum wird zu null, nicht zu NaN (NaN wuerde die Query still leerlaufen lassen)", () => {
    const { filter } = parseAdminAuditQuery(new URLSearchParams({ from: "gestern", to: "" }));
    expect(filter.from).toBeNull();
    expect(filter.to).toBeNull();
  });
});
