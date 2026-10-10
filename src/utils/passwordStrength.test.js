import { describe, it, expect } from "vitest";
import { passwordStrength, MIN_PASSWORD_LENGTH } from "./passwordStrength.js";

describe("passwordStrength", () => {
  it("meldet alles unter der Mindestlaenge als zu kurz", () => {
    expect(passwordStrength("").level).toBe(0);
    expect(passwordStrength("Ab1!xyz").level).toBe(0);
    expect(passwordStrength("a".repeat(MIN_PASSWORD_LENGTH - 1)).level).toBe(0);
  });

  it("stuft Wiederholungen, Folgen und Allerweltswoerter niedrig ein", () => {
    expect(passwordStrength("aaaaaaaaaaaa").level).toBeLessThanOrEqual(1);
    expect(passwordStrength("abcdefghijkl").level).toBeLessThanOrEqual(2);
    expect(passwordStrength("passwort12345").level).toBeLessThanOrEqual(2);
    expect(passwordStrength("immofuchs2026").level).toBeLessThanOrEqual(2);
  });

  it("stuft lange, gemischte Passwoerter hoch ein", () => {
    expect(passwordStrength("k7#Qm!vR2x@Lp9Zw").level).toBeGreaterThanOrEqual(3);
    expect(passwordStrength("k7#Qm!vR2x@Lp9Zw$eT5&bNc").level).toBe(4);
    expect(passwordStrength("Haus-Garten-Zitrone-Wolke-84").level).toBeGreaterThanOrEqual(3);
  });

  it("ist nie niedriger, wenn man ein Zeichen anhaengt", () => {
    const basis = "Zebra!Mond77Kirsche";
    expect(passwordStrength(basis + "x").bits).toBeGreaterThanOrEqual(passwordStrength(basis).bits);
  });
});
