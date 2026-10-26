// Reine Anzeige-Helfer fuers Dashboard (Spec 4.17) - getrennt von bands.js,
// das die eigentliche BANDS-Bewertungslogik traegt.
export function scoreBadgeColor(label) {
  if (label === "gut") return "#2FBF71";
  if (label === "grenzwertig") return "#FFB800";
  if (label === "kritisch") return "#F2545B";
  // Neutrales Hellgrau; das Badge traegt dunkle Schrift (#1a1a1a, hier ca. 9:1).
  return "#C9C9BF";
}

export function scoreBadgeText(label, t) {
  if (label === "gut") return (t && t.mlBadgeGut) || "Gut";
  if (label === "grenzwertig") return (t && t.mlBadgeGrenzwertig) || "Grenzwertig";
  if (label === "kritisch") return (t && t.mlBadgeKritisch) || "Kritisch";
  return label || "—";
}
