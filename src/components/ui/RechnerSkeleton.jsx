// Platzhalter, solange ein Rechner-Chunk nachgeladen wird (React.lazy in App.jsx).
// Zeigt Karten in fester Groesse, damit beim Eintreffen des echten Inhalts nichts
// springt, und einen Lade-Kringel, der erst nach 400 ms erscheint: bei schnellem
// Laden sieht man ihn nie (kein Flackern), bei langsamem gibt er Rueckmeldung.
// Farben nur aus den vorhandenen Tokens (--cc Karte, --cb Rand, --ci Feld, --ca Akzent).
const CSS = `
@keyframes rsk-puls{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes rsk-dreh{to{transform:rotate(360deg)}}
@keyframes rsk-ein{to{opacity:1}}
.rsk-balken{background:var(--ci);border-radius:8px;animation:rsk-puls 1.4s ease-in-out infinite}
.rsk-kringel{width:28px;height:28px;border-radius:50%;border:3px solid var(--cb);border-top-color:var(--ca);
  opacity:0;animation:rsk-ein .2s linear .4s forwards,rsk-dreh .8s linear infinite}
@media(prefers-reduced-motion:reduce){.rsk-balken{animation:none}.rsk-kringel{animation:rsk-ein .2s linear .4s forwards}}
`;

export function RechnerSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Rechner wird geladen" style={{ minHeight: 480 }}>
      <style>{CSS}</style>
      <div
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div className="rsk-balken" style={{ height: 22, width: "45%" }} />
        <div className="rsk-balken" style={{ height: 48 }} />
        <div className="rsk-balken" style={{ height: 48 }} />
        <div className="rsk-balken" style={{ height: 48 }} />
        <div className="rsk-balken" style={{ height: 48, width: "70%" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
        <div className="rsk-kringel" />
      </div>
    </div>
  );
}
