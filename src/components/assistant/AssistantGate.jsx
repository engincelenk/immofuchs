import { Component } from "react";
import { AssistantWidget } from "./AssistantWidget.jsx";

// Faengt Fehler beim Kontext-Aufbau ab (z.B. ein ungueltiger Wert aus dem
// Formular-State), damit ein kaputter Rechner-Kontext nicht die ganze App
// abstuerzen laesst. Im Fehlerfall bleibt Finn unsichtbar statt eine rote
// Fehlermeldung zu zeigen (Nutzer-Feedback 2026-07-30).
class AssistantErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error("Finn-Widget:", error);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function AssistantGateInner({ buildKontext, ...rest }) {
  const kontext = buildKontext();
  return <AssistantWidget kontext={kontext} {...rest} />;
}

// Gemeinsamer Einstiegspunkt fuer alle Rechner: rendert Finn nur, wenn
// `active` true ist (Ergebnis vorhanden), und faengt Fehler beim
// Kontext-Aufbau ab (siehe AssistantErrorBoundary). `buildKontext` wird
// erst hier, innerhalb der ErrorBoundary, ausgewertet - nicht schon vom
// aufrufenden Rechner.
export function AssistantGate({ active, ...props }) {
  if (!active) return null;
  return (
    <AssistantErrorBoundary>
      <AssistantGateInner {...props} />
    </AssistantErrorBoundary>
  );
}
