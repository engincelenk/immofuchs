// Holt ein Druckdokument (Handout, Rechner-Ergebnis) vom Worker und schreibt
// es in ein Druckfenster.
//
// Seit der Preispolitik 2026-08-20 (Schritt 3) baut nicht mehr der Browser
// das Dokument, sondern der Worker hinter requirePro - siehe
// worker/src/routes/export.ts. Der Client kennt die Vorlage nicht mehr; ohne
// Abo kommt statt eines Dokuments eine 402 zurueck.

import { apiFetch } from "./apiBase.js";

// Warum das Fenster VOR dem fetch aufgeht: iOS Safari erlaubt window.open()
// nur synchron im Klick-Kontext. Liegt ein await davor, gilt der Aufruf als
// nicht nutzerausgeloest und wird blockiert - derselbe Grund wie frueher in
// ExportPDF.jsx und finnHandoutPdf.js, nur dass der Wartezeitraum jetzt ein
// Netzwerk-Roundtrip ist statt eines Logo-Downloads.
export async function oeffneDruckdokument(pfad, nutzlast, dateiname = "ImmoFuchs") {
  const fenster = window.open("", "_blank");
  try {
    const res = await apiFetch(pfad, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nutzlast),
    });

    if (!res.ok) {
      fenster?.close();
      // 401 = nicht eingeloggt, 402 = kein Pro. Beide fuehren im Aufrufer zum
      // selben Weg (Kauf-Assistent), werden aber getrennt gemeldet, damit die
      // Oberflaeche den Text passend waehlen kann.
      if (res.status === 401) return { ok: false, fehler: "login_noetig" };
      if (res.status === 402) return { ok: false, fehler: "pro_noetig" };
      return { ok: false, fehler: "dienst" };
    }

    const { html } = await res.json();
    if (typeof html !== "string" || !html) {
      fenster?.close();
      return { ok: false, fehler: "dienst" };
    }

    if (fenster) {
      fenster.document.open();
      fenster.document.write(html);
      fenster.document.close();
      return { ok: true };
    }

    // Fallback, falls das Popup doch geblockt wurde (selten nach synchronem
    // open): als Datei anbieten, damit die Arbeit nicht verloren ist.
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dateiname.replace(/\s+/g, "_")}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { ok: true };
  } catch {
    fenster?.close();
    return { ok: false, fehler: "offline" };
  }
}
