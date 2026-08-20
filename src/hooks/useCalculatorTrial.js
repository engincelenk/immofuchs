import { useEffect, useRef } from "react";
import { useAccountCtx } from "../context/AccountContext.jsx";

// Verzoegerung, bevor ein Testlauf als "genutzt" gilt (Stufe B,
// Nutzer-Konzept 2026-08-11): alle 6 Rechner zeigen dank sinnvoller
// Standardwerte sofort ein Ergebnis an - ein blosses versehentliches Oeffnen
// soll den Testlauf noch nicht verbrauchen.
const CONSUME_DEBOUNCE_MS = 1500;

// Rueckfall, falls /me noch keine Grenzen geliefert hat. Die verbindliche
// Zahl kommt seit der Preispolitik 2026-08-20 vom Server (trial.limits,
// worker/src/trialLimits.ts) - hier nur fuer die Anzeige ("noch X von 3"),
// durchgesetzt wird sie serverseitig.
export const CALCULATOR_TRIAL_LIMIT = 3;

// Ersetzt die vorherige reine "eingeloggt oder nicht"-Sperre um einen
// zweiten Zustand: eingeloggt, aber das Kontingent DIESES Rechners aus der
// Testphase ist verbraucht (oder die Testphase selbst ist abgelaufen) und
// kein Abo aktiv - "paywalled" statt "locked".
//
// capturedRef friert den Verbrauchsstand DIESES Rechners EINMAL ein, sobald
// er sicher bekannt ist (loading===false) - die laufende Sitzung wird
// dadurch nie mitten in der Nutzung unterbrochen, selbst wenn der
// Debounce-Call weiter unten den Status kurz danach im Hintergrund
// umschaltet. Erst der naechste Tab-Wechsel (= neuer Mount dieses Hooks mit
// neuem `rechner`) sieht die Sperre.
export function useCalculatorTrial(rechner) {
  const account = useAccountCtx();
  const capturedRef = useRef(null);
  const firedRef = useRef(false);
  // Nur fuer den Reset-Effect unten - siehe dortiger Kommentar.
  const prevRechnerRef = useRef(rechner);

  const loading = account?.loading;
  const isLoggedIn = Boolean(account?.isLoggedIn);
  // Nur ein Abo rechnet unbegrenzt. Die Testphase darf alles, zaehlt aber
  // mit; nach ihrem Ende ist "keiner" - dann greift dieselbe Sperre wie bei
  // verbrauchtem Kontingent.
  const zugang = account?.zugang || "keiner";
  const istUnbegrenzt = zugang === "pro";
  const istTestphase = zugang === "trial";
  const limit = Number(account?.trial?.limits?.rechner) || CALCULATOR_TRIAL_LIMIT;
  const consumeCalculatorTrial = account?.consumeCalculatorTrial;

  if (loading === false && capturedRef.current === null) {
    capturedRef.current = Number(account?.trial?.usage?.[`rechner:${rechner}`] || 0);
  }

  // Bugreport 20.08. ("Sperre greift nur bei Rendite, nie bei den anderen 5
  // Rechnern"): dieser Effect lief bisher bei JEDEM Mount, auch beim
  // allerersten - und setzte capturedRef damit sofort wieder auf null,
  // direkt nachdem die Render-Phase oben ihn gerade korrekt befuellt hatte.
  // Der Debounce-Effect unten sah dadurch immer capturedRef===null und brach
  // sofort ab, der Timer wurde nie gesetzt. Bei Rendite (Standard-Tab beim
  // Seitenaufruf) rettete der Zufall: waehrend loading dort noch von true auf
  // false wechselt, gibt es einen zweiten Render, der NACH diesem
  // Reset-Effect erneut korrekt einfaengt. Jeder andere Rechner wird per
  // Klick INNERHALB der bereits geladenen App erreicht (loading ist da
  // laengst false) - ohne den rettenden zweiten Render blieb capturedRef fuer
  // die gesamte Lebensdauer des Mounts bei null haengen.
  // prevRechnerRef vergleicht daher gegen den TATSAECHLICH vorherigen Wert
  // (mit useRef(rechner) initialisiert) statt blind bei jedem Lauf zu
  // resetten - der urspruengliche Zweck (Rechnerwechsel bei einer
  // wiederverwendeten Hook-Instanz) bleibt erhalten, nur der erste Mount
  // wird nicht mehr faelschlich mitgetroffen.
  useEffect(() => {
    if (prevRechnerRef.current === rechner) return;
    prevRechnerRef.current = rechner;
    capturedRef.current = null;
    firedRef.current = false;
  }, [rechner]);

  useEffect(() => {
    if (loading !== false || !isLoggedIn || !istTestphase) return;
    if (capturedRef.current === null) return;
    if (capturedRef.current >= limit || firedRef.current) return;
    const timer = setTimeout(() => {
      firedRef.current = true;
      consumeCalculatorTrial?.(rechner);
    }, CONSUME_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [loading, isLoggedIn, istTestphase, limit, consumeCalculatorTrial, rechner]);

  const used = capturedRef.current;
  const remaining = used === null ? null : Math.max(0, limit - used);

  return {
    loading,
    isLocked: loading === false && !isLoggedIn,
    // Zwei Wege in dieselbe Wand: Kontingent dieses Rechners aufgebraucht,
    // oder die Testphase ist vorbei.
    isPaywalled:
      loading === false &&
      isLoggedIn &&
      !istUnbegrenzt &&
      (!istTestphase || used >= limit),
    // Nach dem Ende der Testphase bleiben gespeicherte Objekte lesbar
    // (Nutzer-Entscheidung 2026-08-20) - die Oberflaeche unterscheidet
    // deshalb zwischen "Kontingent leer" und "Testphase vorbei".
    trialVorbei: loading === false && isLoggedIn && zugang === "keiner",
    limit,
    // UX-Audit 2026-08-11 (Punkt 3): Der Testlauf war bisher unsichtbar, bis
    // er weg war - "kostenlos" stand ausschliesslich in der
    // Preis-Vergleichstabelle, der Verbrauch passierte still und die
    // erste Rueckmeldung war die Sperrwand beim NAECHSTEN Besuch. Dieses
    // Flag speist einen Hinweis, der schon waehrend des Testlaufs sagt,
    // worum es sich handelt. Bewusst an capturedRef gebunden (nicht am
    // Live-Status): der eingefrorene Wert gilt fuer die gesamte Sitzung, der
    // Hinweis flackert also nicht weg, sobald der Verbrauch gemeldet wurde.
    isTrialRun: loading === false && isLoggedIn && istTestphase && used !== null && used < limit,
    remaining,
  };
}
