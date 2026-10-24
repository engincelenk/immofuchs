// Reine Anzeige-Helfer fuers Dashboard (Spec 4.17) - getrennt von bands.js,
// das die eigentliche BANDS-Bewertungslogik traegt.
export function scoreBadgeColor(label) {
  if (label === "gut") return "#2F6B4F";
  if (label === "grenzwertig") return "#7A600E";
  if (label === "kritisch") return "#B3402A";
  // Wie --ch in App.jsx. Das Badge traegt weisse Schrift; der alte Wert
  // #8a8a80 kam damit nur auf 3,48:1.
  return "#6c6c62";
}

export function scoreBadgeText(label, t) {
  if (label === "gut") return (t && t.mlBadgeGut) || "Gut";
  if (label === "grenzwertig") return (t && t.mlBadgeGrenzwertig) || "Grenzwertig";
  if (label === "kritisch") return (t && t.mlBadgeKritisch) || "Kritisch";
  return label || "—";
}
