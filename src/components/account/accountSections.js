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
// `titleKey` weicht bewusst nur beim Profil vom Navigationslabel ab: in der
// Seitenleiste heisst der Bereich "Profil", im Menue "Profil anzeigen"
// (dort ist es eine Handlung, kein Ort).
export const SECTION_META = [
  { key: "profil", labelKey: "navProfil", titleKey: "menuProfilTitle", descKey: "menuProfilDesc", Icon: IconProfil },
  { key: "abo", labelKey: "navAbonnement", descKey: "menuAboDesc", Icon: IconAbo },
  { key: "zahlung", labelKey: "navZahlung", descKey: "menuZahlungDesc", Icon: IconZahlung },
  { key: "einstellungen", labelKey: "navDatenschutz", descKey: "menuEinstellungenDesc", Icon: IconEinstellungen },
  // Trennlinie im Menue vor diesem Eintrag (Entwurf): oben die Bereiche rund
  // um Vertrag und Daten, darunter Hilfe/Sicherheit/Verwaltung.
  { key: "support", labelKey: "navSupport", descKey: "menuSupportDesc", Icon: IconSupport, groupStart: true },
  { key: "konto", labelKey: "navSicherheit", descKey: "menuSicherheitDesc", Icon: IconSicherheit },
  {
    key: "admin",
    labelKey: "navAdmin",
    descKey: "menuAdminDesc",
    Icon: IconAdmin,
    rolesAllowed: ["admin"],
  },
];

export function visibleSections(role) {
  return SECTION_META.filter((s) => !s.rolesAllowed || s.rolesAllowed.includes(role));
}
