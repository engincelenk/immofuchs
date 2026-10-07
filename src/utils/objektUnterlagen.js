// Phase E des Konzepts - Objektunterlagen.
//
// Bewusst LOKAL: Die Dateien liegen in IndexedDB im Browser des Nutzers und
// werden nie hochgeladen. Das ist das Muster, das die Analyse-Vorlage richtig
// macht ("Unterlagen werden lokal in der App-Dateiablage gespeichert und nicht
// in die Cloud geladen") - bei Kaufvertraegen, Exposés und Teilungserklaerungen
// schafft genau diese Zusage Vertrauen, und sie erspart uns zugleich
// Server-Speicher, Loeschkonzept und Auftragsverarbeitung.
//
// Folge, die im UI benannt werden muss: Die Unterlagen wandern nicht mit auf
// ein anderes Geraet.

const DB_NAME = "immofuchs_unterlagen";
const DB_VERSION = 1;
const STORE = "dateien";

// Groessengrenze je Datei. IndexedDB kann mehr, aber ein versehentlich
// hochgeladenes 200-MB-Video soll den Speicher des Browsers nicht sprengen.
export const MAX_DATEI_BYTES = 20 * 1024 * 1024;

export const ERLAUBTE_TYPEN = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

function oeffneDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb_nicht_verfuegbar"));
      return;
    }
    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        // Nach Objekt gruppiert lesen, ohne alles zu laden.
        store.createIndex("objektId", "objektId", { unique: false });
      }
    };
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => reject(anfrage.error || new Error("indexeddb_open_fehler"));
  });
}

function alsPromise(anfrage) {
  return new Promise((resolve, reject) => {
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => reject(anfrage.error);
  });
}

export async function unterlagenLaden(objektId) {
  if (!objektId) return [];
  try {
    const db = await oeffneDb();
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("objektId");
    const treffer = await alsPromise(index.getAll(objektId));
    db.close();
    // Ohne die Blobs zurueckgeben - die Liste braucht nur die Metadaten.
    return (treffer || [])
      .map(({ blob: _blob, ...rest }) => rest)
      .sort((a, b) => (b.angelegt || 0) - (a.angelegt || 0));
  } catch {
    // Privater Modus oder blockierter Speicher: die Ablage ist ein Extra,
    // kein Blocker fuer den Rest der Objektansicht.
    return [];
  }
}

export async function unterlageSpeichern(objektId, datei) {
  if (!objektId || !datei) throw new Error("fehlende_angaben");
  if (datei.size > MAX_DATEI_BYTES) throw new Error("zu_gross");
  if (datei.type && !ERLAUBTE_TYPEN.includes(datei.type)) throw new Error("typ_nicht_erlaubt");

  const db = await oeffneDb();
  const eintrag = {
    id: crypto.randomUUID(),
    objektId,
    name: datei.name || "Unterlage",
    typ: datei.type || "application/octet-stream",
    groesse: datei.size,
    angelegt: Date.now(),
    blob: datei,
  };
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(eintrag);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const { blob: _blob, ...ohneBlob } = eintrag;
  return ohneBlob;
}

export async function unterlageLoeschen(id) {
  if (!id) return;
  const db = await oeffneDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Gibt eine Objekt-URL zurueck, die der Aufrufer nach Gebrauch wieder
// freigeben muss (URL.revokeObjectURL) - sonst haelt der Browser den Blob.
export async function unterlageOeffnen(id) {
  const db = await oeffneDb();
  const tx = db.transaction(STORE, "readonly");
  const eintrag = await alsPromise(tx.objectStore(STORE).get(id));
  db.close();
  if (!eintrag?.blob) return null;
  return URL.createObjectURL(eintrag.blob);
}

export function formatGroesse(bytes) {
  const n = +bytes || 0;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
