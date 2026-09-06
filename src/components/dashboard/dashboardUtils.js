// Reine Anzeige-Helfer fuers Dashboard (Spec 4.17) - getrennt von bands.js,
// das die eigentliche BANDS-Bewertungslogik traegt.
export function scoreBadgeColor(label) {
  if (label === "gut") return "#22c55e";
  if (label === "grenzwertig") return "#f59e0b";
  if (label === "kritisch") return "#ef4444";
  // Wie --ch in App.jsx. Das Badge traegt weisse Schrift; der alte Wert
  // #8a8a80 kam damit nur auf 3,48:1.
  return "#6c6c62";
}

export function scoreBadgeText(label) {
  if (label === "gut") return "Gut";
  if (label === "grenzwertig") return "Grenzwertig";
  if (label === "kritisch") return "Kritisch";
  return label || "—";
}
