import {
  IconAbo,
  IconAdmin,
  IconEinstellungen,
  IconProfil,
  IconSicherheit,
  IconSupport,
  IconZahlung,
} from "./accountIcons.jsx";

// Gemeinsame Beschreibung der Kontobereiche (Nutzer-Entwurf 2026-08-12).
// Lag vorher nur in MyAccount.jsx; seit das Kontomenue (AccountMenu.jsx)
// dieselbe Liste im Kopf der App anbietet, wuerde eine zweite Kopie
// zwangslaeufig auseinanderlaufen - Reihenfolge, Rollenfilter und
// Beschriftung leben deshalb nur noch hier.
//
// Jeder Bereich traegt nur noch EINE Beschriftung (Neugestaltung
// 2026-08-17). Vorher gab es zusaetzlich `titleKey` (abweichender Titel im
// Menue: "Profil anzeigen" statt "Profil") und `descKey` (Beschreibungszeile
// darunter). Beide entfielen mit den einzeiligen Menuezeilen - dieselbe
// Beschriftung steht jetzt im Menue, in der Seitenleiste, in den mobilen
// Pillen und in den Brotkrumen, was das Wiederfinden erleichtert.
// Die uebersetzten Beschreibungstexte (menu*Desc) stehen weiterhin in
// i18n/account.js, falls sie einmal zurueckkehren sollen.
export const SECTION_META = [
  { key: "profil", labelKey: "navProfil", Icon: IconProfil },
  { key: "abo", labelKey: "navAbonnement", Icon: IconAbo },
  { key: "zahlung", labelKey: "navZahlung", Icon: IconZahlung },
  { key: "einstellungen", labelKey: "navDatenschutz", Icon: IconEinstellungen },
  // Trennlinie im Menue vor diesem Eintrag (Entwurf): oben die Bereiche rund
  // um Vertrag und Daten, darunter Hilfe/Sicherheit/Verwaltung.
  { key: "support", labelKey: "navSupport", Icon: IconSupport, groupStart: true },
  { key: "konto", labelKey: "navSicherheit", Icon: IconSicherheit },
  {
    key: "admin",
    labelKey: "navAdmin",
    Icon: IconAdmin,
    rolesAllowed: ["admin"],
  },
];

export function visibleSections(role) {
  return SECTION_META.filter((s) => !s.rolesAllowed || s.rolesAllowed.includes(role));
}
