// Reine Anzeige-Helfer fuers Dashboard (Spec 4.17) - getrennt von bands.js,
// das die eigentliche BANDS-Bewertungslogik traegt.
export function scoreBadgeColor(label) {
  if (label === "gut") return "#22c55e";
  if (label === "grenzwertig") return "#f59e0b";
  if (label === "kritisch") return "#ef4444";
  return "#8a8a80";
}

export function scoreBadgeText(label) {
  if (label === "gut") return "Gut";
  if (label === "grenzwertig") return "Grenzwertig";
  if (label === "kritisch") return "Kritisch";
  return label || "—";
}
