// Bugreport 2026-09-09: Apple-Login lief bis zu Apples Anmeldeseite durch,
// danach war der Nutzer nicht eingeloggt ("Anmelden" blieb sichtbar). Ursache
// war kein Cookie- und kein Portal-Problem, sondern das Format des privaten
// Schluessels: er lag Base64-kodiert vor, importPKCS8() akzeptiert aber nur
// rohes PKCS#8-PEM. Der Callback flog in seinen catch-Block, der Fehler war
// von aussen nur als login_error=oauth_failed sichtbar.
//
// Diese Tests sichern ab, dass beide Ablageformen funktionieren.
import { describe, it, expect } from "vitest";
import { importPKCS8 } from "jose";
import { normalisierePrivateKey } from "./apple";

// Ein echter, ausschliesslich fuer diesen Test erzeugter ES256-Testschluessel
// (P-256). Kein Produktivschluessel - er signiert nichts ausserhalb dieses Tests.
const TEST_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgevZzL1gdAFr88hb2
OF/2NxApJCzGCEDdfSp6VQO30hyhRANCAAQRWz+jn65BtOMvdyHKcvjBeBSDZH2r
1RTwjmYSi9R/zpBnuQ4EiMnCqfMPWiZqB4QdbAd0E7oH50VpuZ1P087G
-----END PRIVATE KEY-----`;

const TEST_B64 = btoa(TEST_PEM);

describe("normalisierePrivateKey", () => {
  it("reicht rohes PEM unveraendert durch", () => {
    expect(normalisierePrivateKey(TEST_PEM)).toBe(TEST_PEM);
  });

  it("dekodiert eine Base64-kodierte Ablage zu PEM", () => {
    expect(normalisierePrivateKey(TEST_B64)).toBe(TEST_PEM);
  });

  it("vertraegt Zeilenumbrueche innerhalb der Base64-Ablage", () => {
    const mitUmbruechen = TEST_B64.match(/.{1,64}/g)!.join("\n");
    expect(normalisierePrivateKey(mitUmbruechen)).toBe(TEST_PEM);
  });

  it("reicht unbrauchbare Eingaben durch, statt sie zu verschlucken", () => {
    // Wichtig fuer die Fehlersuche: importPKCS8() soll seinen eigenen,
    // aussagekraeftigen Fehler werfen duerfen.
    expect(normalisierePrivateKey("kein-key")).toBe("kein-key");
  });
});

// Der eigentliche Regressionsschutz: beide Formen muessen am Ende durch
// importPKCS8() gehen - genau daran scheiterte der Login.
describe("importPKCS8 nach Normalisierung", () => {
  it("akzeptiert die PEM-Ablage", async () => {
    await expect(importPKCS8(normalisierePrivateKey(TEST_PEM), "ES256")).resolves.toBeDefined();
  });

  it("akzeptiert die Base64-Ablage", async () => {
    await expect(importPKCS8(normalisierePrivateKey(TEST_B64), "ES256")).resolves.toBeDefined();
  });

  it("ohne Normalisierung scheitert die Base64-Ablage - der urspruengliche Bug", async () => {
    await expect(importPKCS8(TEST_B64, "ES256")).rejects.toThrow();
  });
});
