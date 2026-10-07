import { describe, it, expect } from "vitest";
import {
  pruefeAuswahl,
  dataUrlBytes,
  UPLOAD_FEHLER,
  MAX_IMAGES,
  MAX_PDF_BYTES,
} from "./exposeUpload.js";

// Minimaler File-Ersatz: pruefeAuswahl liest nur type und size.
function datei(type, size = 1000) {
  return { type, size, name: "test" };
}

describe("pruefeAuswahl", () => {
  it("nimmt die erlaubten Bildtypen an", () => {
    const r = pruefeAuswahl(
      [datei("image/jpeg"), datei("image/png"), datei("image/webp")],
      [],
      null,
    );
    expect(r.fehler).toBeNull();
    expect(r.bilder).toHaveLength(3);
    expect(r.pdf).toBeNull();
  });

  it("trennt ein PDF von den Bildern", () => {
    const r = pruefeAuswahl([datei("image/jpeg"), datei("application/pdf")], [], null);
    expect(r.fehler).toBeNull();
    expect(r.bilder).toHaveLength(1);
    expect(r.pdf).not.toBeNull();
  });

  it("lehnt ein zweites PDF ab", () => {
    expect(pruefeAuswahl([datei("application/pdf")], [], datei("application/pdf")).fehler).toBe(
      UPLOAD_FEHLER.NUR_EIN_PDF,
    );
    expect(
      pruefeAuswahl([datei("application/pdf"), datei("application/pdf")], [], null).fehler,
    ).toBe(UPLOAD_FEHLER.NUR_EIN_PDF);
  });

  it("lehnt ein zu grosses PDF ab", () => {
    const r = pruefeAuswahl([datei("application/pdf", MAX_PDF_BYTES + 1)], [], null);
    expect(r.fehler).toBe(UPLOAD_FEHLER.PDF_ZU_GROSS);
  });

  it("lehnt nicht erlaubte Dateitypen ab", () => {
    expect(pruefeAuswahl([datei("image/gif")], [], null).fehler).toBe(
      UPLOAD_FEHLER.TYP_NICHT_ERLAUBT,
    );
    expect(pruefeAuswahl([datei("text/plain")], [], null).fehler).toBe(
      UPLOAD_FEHLER.TYP_NICHT_ERLAUBT,
    );
  });

  it("rechnet bereits ausgewaehlte Bilder gegen das Limit", () => {
    const vorhanden = new Array(MAX_IMAGES - 1).fill(datei("image/jpeg"));
    expect(pruefeAuswahl([datei("image/jpeg")], vorhanden, null).fehler).toBeNull();
    expect(
      pruefeAuswahl([datei("image/jpeg"), datei("image/jpeg")], vorhanden, null).fehler,
    ).toBe(UPLOAD_FEHLER.ZU_VIELE_BILDER);
  });
});

describe("dataUrlBytes", () => {
  it("rechnet Base64-Laenge in echte Bytes um", () => {
    // "AAAA" = 3 Bytes, "AAA=" = 2 Bytes, "AA==" = 1 Byte
    expect(dataUrlBytes("data:image/jpeg;base64,AAAA")).toBe(3);
    expect(dataUrlBytes("data:image/jpeg;base64,AAA=")).toBe(2);
    expect(dataUrlBytes("data:image/jpeg;base64,AA==")).toBe(1);
  });

  it("gibt 0 zurueck, wenn es keine Data-URL ist", () => {
    expect(dataUrlBytes("kein-data-url")).toBe(0);
  });
});
