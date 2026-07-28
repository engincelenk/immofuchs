// Client-Seite der Expose-/Screenshot-Extraktion: Auswahl pruefen, Bilder
// verkleinern, alles in Data-URLs ueberfuehren.
// Spec: docs/plans/expose-screenshot-upload-spec.md, Abschnitt 6 (Limits) und
// 11.1 (Verkleinern auf ~1500px, nur React-State, kein localStorage).
//
// Die Limits hier spiegeln bewusst die des Workers (worker/src/validator.ts) -
// der Client soll dem Nutzer sofort sagen, was nicht geht, statt ihn 15 MB
// hochladen und dann ein 400 sehen zu lassen. Der Worker bleibt trotzdem die
// verbindliche Schranke.

export const MAX_IMAGES = 15;
export const MAX_IMAGE_EDGE = 1500; // laengste Kante nach dem Verkleinern
export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const MAX_PDF_PAGES = 20;
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

const JPEG_QUALITY = 0.85; // Screenshots enthalten Text - niedriger wird unleserlich
export const ERLAUBTE_BILD_TYPEN = ["image/jpeg", "image/png", "image/webp"];
export const PDF_TYP = "application/pdf";

// Fehlercodes, die die UI auf t()-Strings abbildet (siehe i18n/assistant.js).
export const UPLOAD_FEHLER = {
  ZU_VIELE_BILDER: "zuVieleBilder",
  PDF_ZU_GROSS: "pdfZuGross",
  PDF_ZU_VIELE_SEITEN: "pdfZuVieleSeiten",
  NUR_EIN_PDF: "nurEinPdf",
  TYP_NICHT_ERLAUBT: "typNichtErlaubt",
  ZU_GROSS_GESAMT: "zuGrossGesamt",
};

// Teilt eine Dateiauswahl in Bilder und PDF auf und meldet den ersten
// Regelverstoss. Gibt File-Objekte zurueck, noch keine Data-URLs: die
// Umwandlung passiert erst beim Absenden (Phase 1), damit das Antippen von
// "Datei waehlen" nicht spuerbar haengt.
export function pruefeAuswahl(neueDateien, vorhandeneBilder, vorhandenesPdf) {
  const bilder = [];
  let pdf = null;

  for (const file of neueDateien) {
    if (file.type === PDF_TYP) {
      if (vorhandenesPdf || pdf) return { fehler: UPLOAD_FEHLER.NUR_EIN_PDF };
      if (file.size > MAX_PDF_BYTES) return { fehler: UPLOAD_FEHLER.PDF_ZU_GROSS };
      pdf = file;
    } else if (ERLAUBTE_BILD_TYPEN.includes(file.type)) {
      bilder.push(file);
    } else {
      return { fehler: UPLOAD_FEHLER.TYP_NICHT_ERLAUBT };
    }
  }

  if (vorhandeneBilder.length + bilder.length > MAX_IMAGES) {
    return { fehler: UPLOAD_FEHLER.ZU_VIELE_BILDER };
  }
  return { bilder, pdf, fehler: null };
}

// Grobe Seitenzaehlung ohne PDF-Bibliothek: zaehlt "/Type /Page"-Objekte im
// rohen Bytestrom. Bei komprimierten Objekt-Streams findet das nichts - dann
// gibt die Funktion null zurueck und die Datei wird durchgelassen. Bewusst
// so herum: lieber ein zu grosses PDF vom Worker ablehnen lassen, als ein
// gueltiges wegen einer Heuristik zu blockieren. Der Worker prueft die
// Seitenzahl nicht (siehe validator.ts), nur die Groesse.
export async function schaetzePdfSeiten(file) {
  try {
    const buf = await file.arrayBuffer();
    const text = new TextDecoder("latin1").decode(new Uint8Array(buf));
    const treffer = text.match(/\/Type\s*\/Page[^s]/g);
    return treffer ? treffer.length : null;
  } catch {
    return null;
  }
}

// Verkleinert ein Bild auf MAX_IMAGE_EDGE und gibt eine JPEG-Data-URL zurueck.
// Der Worker erwartet Data-URLs, weil der MIME-Typ sonst serverseitig nicht
// pruefbar waere (siehe worker/src/validator.ts).
export async function verkleinereBild(file, maxEdge = MAX_IMAGE_EDGE) {
  const bitmap = await ladeBitmap(file);
  const skala = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * skala));
  const h = Math.max(1, Math.round(bitmap.height * skala));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (typeof bitmap.close === "function") bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function ladeBitmap(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  // Fallback fuer aeltere WebViews ohne createImageBitmap.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bild_nicht_lesbar"));
    };
    img.src = url;
  });
}

export function leseAlsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("datei_nicht_lesbar"));
    reader.readAsDataURL(file);
  });
}

// Laenge einer Data-URL in echten Bytes (nur der Base64-Teil zaehlt).
export function dataUrlBytes(dataUrl) {
  const komma = dataUrl.indexOf(",");
  if (komma < 0) return 0;
  const base64 = dataUrl.slice(komma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

// Phase 1 des Uploads (Spec 8): alle ausgewaehlten Dateien in Data-URLs
// ueberfuehren, mit ehrlichem Fortschritt pro Bild. onProgress bekommt die
// Anzahl fertiger Bilder, nicht einen geschaetzten Prozentwert.
export async function bereiteDateienVor(bilder, pdf, onProgress) {
  const images = [];
  let gesamtBytes = 0;

  for (let i = 0; i < bilder.length; i++) {
    const dataUrl = await verkleinereBild(bilder[i]);
    gesamtBytes += dataUrlBytes(dataUrl);
    images.push(dataUrl);
    if (onProgress) onProgress(i + 1);
  }

  let pdfDataUrl = null;
  if (pdf) {
    pdfDataUrl = await leseAlsDataUrl(pdf);
    gesamtBytes += dataUrlBytes(pdfDataUrl);
  }

  if (gesamtBytes > MAX_TOTAL_BYTES) {
    return { fehler: UPLOAD_FEHLER.ZU_GROSS_GESAMT };
  }
  return { images, pdf: pdfDataUrl, fehler: null };
}
