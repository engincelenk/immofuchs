// Gemeinsamer Suspense-Fallback fuer lazy geladene CheckoutWizard/MyAccount-
// Panels (Befund 2026-08-18: der Landing-Page-Bundle riss bei manchen
// Verbindungen mitten in der Auslieferung ab, vermutlich Groessen-/
// Uebertragungs-Problem bei sehr grossen komprimierten Antworten - siehe
// release-notes.txt). Gleiches Overlay wie CheckoutWizard selbst (position/
// inset/zIndex/Hintergrundfarbe), damit beim Nachladen kein optischer Bruch
// zwischen Platzhalter und echtem Inhalt entsteht. Wird an allen Stellen
// verwendet, die CheckoutWizard/MyAccount bedingt rendern (Landing.jsx,
// CalculatorTrialGate.jsx, ProHeaderButton.jsx, Merkliste.jsx).
export function LazyPanelFallback() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(20,18,14,.45)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,.35)",
          borderTopColor: "var(--ca)",
          animation: "landing-lazy-spin .8s linear infinite",
        }}
      />
      <style>{"@keyframes landing-lazy-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
