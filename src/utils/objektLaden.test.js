import { describe, expect, it, vi } from "vitest";
import { ladeAlsAktivesObjekt } from "./objektLaden.js";

describe("Objekt laden macht es zum aktiven Objekt", () => {
  it("gibt id und name an setTabExt weiter, damit Speichern aktualisiert statt neu anlegt", () => {
    const obj = { id: "abc", name: "Dresden · 160.000 €", letzteAnsicht: "kredit", data: {} };
    const setTabExt = vi.fn();
    // loadObj wie in useSavedObjects: ruft setTab mit der letzten Ansicht auf
    const loadObj = vi.fn((o, setTab) => setTab(o.letzteAnsicht || "haupt"));
    ladeAlsAktivesObjekt(obj, loadObj, setTabExt);
    expect(loadObj).toHaveBeenCalledWith(obj, expect.any(Function));
    expect(setTabExt).toHaveBeenCalledWith("kredit", { id: "abc", name: "Dresden · 160.000 €" });
  });
});
