// Das Besichtigungs-Handout im Chatverlauf.
// Spec: docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitt 7 (Etappe E2/E3).
//
// Sitzt direkt unter der Uebernahme-Karte (ExposeResultCard) und startet
// eingeklappt: die Uebernahme ist die Kernfunktion des Uploads und darf nicht
// nach unten geschoben werden. Die Kopfzeile traegt bereits das Wichtigste -
// Verdict, Score und den groessten Euro-Fund.
//
// GR-01 (Kennzeichnungspflicht) ist hier bewusst als eigener Kasten ueber den
// Findings geloest, nicht als Badge je Zeile: automatisiert erkannt ist hier
// *alles*, eine Wiederholung an jeder Zeile wuerde nur abstumpfen.

import { lazy, Suspense, useMemo, useState } from "react";
import { fmtE, fmt } from "../../utils/helpers.js";
import { fuelle } from "../../i18n/expose.js";
import { oeffneDruckdokument } from "../../utils/druckdokument.js";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { LazyPanelFallback } from "../ui/LazyPanelFallback.jsx";
import { exposeSchluessel, ladeAuswahl, speichereAuswahl } from "../../utils/finnAuswahl.js";

const CheckoutWizard = lazy(() =>
  import("../checkout/CheckoutWizard.jsx").then((m) => ({ default: m.CheckoutWizard })),
);

// Die Auswahl ueberlebt Reload und erneuten Upload desselben Exposes
// (finnAuswahl.js). Beim ersten Mal greift die Vorauswahl aus dem
// Fragenkatalog - alles mit kern=true.
function useAuswahl(analyse) {
  const schluessel = useMemo(() => exposeSchluessel(analyse), [analyse]);
  const [auswahl, setLokal] = useState(
    () => new Set(ladeAuswahl(schluessel) ?? analyse.vorauswahl),
  );

  const setzen = (naechste) => {
    setLokal(naechste);
    speichereAuswahl(schluessel, naechste);
  };
  return [auswahl, setzen];
}

export function FinnHandoutPanel({ analyse, t, lang = "de" }) {
  const [offen, setOffen] = useState(false);
  const [auswahl, setAuswahl] = useAuswahl(analyse);
  const [zeigeUpgrade, setZeigeUpgrade] = useState(false);
  const [fehler, setFehler] = useState(null);
  const account = useAccountCtx();
  const h = t.handout;

  // Das Handout ist seit der Preispolitik 2026-08-20 eine Pro-Funktion. Das
  // Dokument baut der Worker hinter requirePro (worker/src/routes/export.ts) -
  // ohne Abo kommt eine 402 zurueck, hier fuehrt der Knopf dann in den
  // Kauf-Assistenten statt in eine Fehlermeldung.
  const handoutOeffnen = async () => {
    if (!account?.isPro) {
      setZeigeUpgrade(true);
      return;
    }
    setFehler(null);
    const ergebnis = await oeffneDruckdokument(
      "/export/handout",
      { analyse, auswahl: [...auswahl], labels: h, lang },
      "Finn_Handout",
    );
    if (!ergebnis.ok) {
      if (ergebnis.fehler === "pro_noetig" || ergebnis.fehler === "login_noetig") {
        setZeigeUpgrade(true);
        return;
      }
      setFehler(t.fehlerDienst);
    }
  };

  // Vor-Ort-Fragen stehen im Handout unten als eigener Block: sie sind beim
  // Termin abzuhaken, nicht dem Makler zu stellen (Fragenkatalog, Abschnitt 11).
  const { zuKlaeren, vorOrt } = useMemo(
    () => ({
      zuKlaeren: analyse.checkliste.filter((c) => c.quelle !== "vor_ort"),
      vorOrt: analyse.checkliste.filter((c) => c.quelle === "vor_ort"),
    }),
    [analyse.checkliste],
  );

  const groessterFund = analyse.findings.find(
    (f) => f.impactEur !== null && f.impactEur !== undefined,
  );
  const alleIds = analyse.checkliste.map((c) => c.id);
  const alleGewaehlt = alleIds.length > 0 && alleIds.every((id) => auswahl.has(id));

  const toggle = (id) => {
    const neu = new Set(auswahl);
    if (neu.has(id)) neu.delete(id);
    else neu.add(id);
    setAuswahl(neu);
  };

  const toggleAlle = () => setAuswahl(alleGewaehlt ? new Set() : new Set(alleIds));

  const subZeile = groessterFund
    ? fuelle(h.groessterFund, { betrag: "−" + fmtE(Math.round(groessterFund.impactEur)) })
    : h.keinFund;

  return (
    <div className="if-hnd">
      <button
        type="button"
        className="if-hnd-head"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        aria-label={offen ? h.schliessen : h.oeffnen}
      >
        <span className="if-hnd-head-txt">
          <span className="if-hnd-head-titel">
            📋 {h.titel} · {analyse.verdictLabel}
          </span>
          <span className="if-hnd-head-sub">{subZeile}</span>
        </span>
        <span className="if-hnd-score">{fmt(analyse.verdictScore, 1)}/5</span>
        <span className="if-hnd-caret" aria-hidden="true">
          {offen ? "▲" : "▼"}
        </span>
      </button>

      {offen && (
        <div className="if-hnd-body">
          <div className="if-hnd-gr1">{h.automatisiert}</div>

          <section>
            <div className="if-hnd-sekt-titel">{h.findings}</div>
            {analyse.findings.length === 0 ? (
              <div className="if-hnd-leer">{h.leer}</div>
            ) : (
              <>
                {analyse.findings.map((f) => (
                  <div key={f.id} className="if-hnd-find">
                    <span className={"if-hnd-find-tag " + f.severity}>
                      {f.impactEur !== null && f.impactEur !== undefined
                        ? "−" + fmtE(Math.round(f.impactEur))
                        : h["schwere" + f.severity.charAt(0).toUpperCase() + f.severity.slice(1)]}
                    </span>
                    <span className="if-hnd-find-txt">
                      {f.text}
                      {f.quellen.length > 0 && (
                        <span className="if-hnd-find-quellen">
                          {fuelle(h.quellen, { quellen: [...new Set(f.quellen)].join(" · ") })}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {analyse.findingsGesamt > analyse.findings.length && (
                  <div className="if-hnd-mehr">
                    {fuelle(h.weitere, { n: analyse.findingsGesamt - analyse.findings.length })}
                  </div>
                )}
              </>
            )}
          </section>

          {analyse.preistabelle.length > 0 && (
            <section>
              <div className="if-hnd-sekt-titel">{h.preis}</div>
              <table className="if-hnd-tab">
                <thead>
                  <tr>
                    <th />
                    <th>{h.beworben}</th>
                    <th>{h.real}</th>
                  </tr>
                </thead>
                <tbody>
                  {analyse.preistabelle.map((z) => (
                    <tr key={z.label} className={z.abweichend ? "abw" : undefined}>
                      <td>{z.label}</td>
                      <td className={z.beworben ? undefined : "leer"}>{z.beworben ?? "—"}</td>
                      <td className="real">{z.real}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {analyse.bekannt.length > 0 && (
            <section>
              <div className="if-hnd-sekt-titel">{h.bekannt}</div>
              {analyse.bekannt.map((b) => (
                <div key={b.id} className="if-hnd-fakt">
                  {b.text}
                </div>
              ))}
            </section>
          )}

          {zuKlaeren.length > 0 && (
            <section>
              <div className="if-hnd-sekt-titel">{h.offen}</div>
              {zuKlaeren.map((c) => (
                <label key={c.id} className="if-hnd-frage">
                  <input
                    type="checkbox"
                    checked={auswahl.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span className="if-hnd-frage-txt">
                    {c.frage}
                    <span className="if-hnd-frage-kat">
                      {c.kategorie}
                      {c.kern && <span className="if-hnd-kern"> · wichtig</span>}
                    </span>
                  </span>
                </label>
              ))}
            </section>
          )}

          {vorOrt.length > 0 && (
            <section>
              <div className="if-hnd-sekt-titel">{h.vorOrt}</div>
              {vorOrt.map((c) => (
                <label key={c.id} className="if-hnd-frage">
                  <input
                    type="checkbox"
                    checked={auswahl.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span className="if-hnd-frage-txt">{c.frage}</span>
                </label>
              ))}
            </section>
          )}

          {alleIds.length > 0 && (
            <button type="button" className="if-hnd-alle" onClick={toggleAlle}>
              {alleGewaehlt ? h.alleAbwaehlen : h.alleWaehlen}
            </button>
          )}

          <button
            type="button"
            className="if-hnd-pdf"
            disabled={auswahl.size === 0}
            onClick={handoutOeffnen}
          >
            {auswahl.size === 0 ? h.pdfLeer : `${account?.isPro ? "" : "👑 "}${h.pdfBtn}`}
          </button>
          {fehler && <div className="if-hnd-fehler">{fehler}</div>}
        </div>
      )}
      {zeigeUpgrade && (
        <Suspense fallback={<LazyPanelFallback />}>
          <CheckoutWizard onClose={() => setZeigeUpgrade(false)} />
        </Suspense>
      )}
    </div>
  );
}
