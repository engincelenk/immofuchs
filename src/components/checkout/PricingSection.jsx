import { ACCOUNT_T } from "../../i18n/account.js";
import { LANG_LOCALE } from "../../utils/helpers.js";
import { saveBadgeStyle, strikePriceStyle } from "./checkoutStyles.js";
import {
  PLAN_AMOUNTS,
  YEARLY_PER_MONTH_AMOUNT,
  YEARLY_SAVINGS_PERCENT,
  formatMoney,
} from "./planPricing.js";

// Oeffentliche Preis-Sektion der Landingpage (Neugestaltung 2026-08-17 nach
// den Referenz-Screenshots, auf 3 gleichzeitig sichtbare Kacheln umgebaut
// 2026-08-18 nach Nutzer-Vorgabe, Free-Kachel entfernt 2026-08-18 nach
// Nutzer-Vorgabe - nur noch Monatlich/Jaehrlich).
//
// Zweite Neugestaltung 25.08.2026 (Referenz-Screenshot): Karten heissen
// weiterhin "ImmoFuchs" mit Laufzeit als Unterzeile, die Jahreskarte bekommt
// zusaetzlich zum Ersparnis-Badge ein "EMPFOHLEN"-Ribbon (reaktiviert den seit
// der Free-Kachel-Entfernung ungenutzten i18n-Key `planPopular`), beide CTAs
// sind vollflaechig orange, darunter folgt eine Vertrauens-Zeile.
//
// Landing Option C (2026-09-28, Nutzer-Vorgabe): die sechsspaltige
// Leistungsliste ("Mit ImmoFuchs erhaeltst du") ist entfallen - dieselben
// Funktionen stehen jetzt in der KI-Sektion weiter oben, hier waren sie
// doppelt. Ebenso der Vertrauens-Punkt "Keine Zahlungsdaten".
//
// Umschalter entfernt (Nutzer-Vorgabe 2026-08-18): frueher wechselte eine
// einzelne Pro-Karte per Monatlich/Jaehrlich-Umschalter ihren Preis. Jetzt
// stehen beide Angebote gleichzeitig als eigene, gleich hohe Kachel da - kein
// Klick noetig, um den Jahrespreis zu sehen.
//
// `onChoosePlan(plan)` oeffnet den Kauf-Assistenten mit vorgewaehlter
// Laufzeit. Die kostenlose Nutzung ohne Abo (3 Berechnungen/Rechner etc.)
// bleibt bestehen, wird hier aber nicht mehr als eigenes Produkt beworben -
// deshalb kein onStartFree-CTA mehr in dieser Sektion.
//
// `lang` kommt bewusst als Prop und nicht ueber useApp(): diese Sektion steht
// im Rumpf der Landingpage, und dort gibt es den AppContext nicht - er umgibt
// nur die Dialoge (siehe landingCtxValue in Landing.jsx). Ein useApp() an
// dieser Stelle wuerde beim Rendern der Seite abstuerzen.
const VERTRAUEN = [
  { title: "trustCancelTitle", sub: "trustCancelSub", Icon: IconKuendbar },
  { title: "trustDsgvoTitle", sub: "trustDsgvoSub", Icon: IconSchloss },
];

export function PricingSection({ lang, onChoosePlan, aktuellerPlan = null }) {
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const locale = LANG_LOCALE[lang] || "de-DE";

  const monthlyNote = t.planMonthlyNote.replace("{total}", formatMoney(PLAN_AMOUNTS.monthly, locale));
  const yearlyNote = t.planYearlyNote
    .replace("{total}", formatMoney(PLAN_AMOUNTS.yearly, locale))
    .replace("{perMonth}", formatMoney(YEARLY_PER_MONTH_AMOUNT, locale));
  return (
    <section
      id="preise"
      style={{
        background: "var(--bg)",
        borderTop: "1px solid var(--cb)",
        padding: "clamp(40px,5vw,72px) 0",
      }}
    >
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          {/* Kennung wie die uebrigen Sektionen der Landingpage (.lp-eyebrow
              aus Landing.jsx, 2026-09-28): dunkle Schrift mit orangem Punkt. */}
          <div className="lp-eyebrow">
            <span aria-hidden="true" className="lp-eyebrow-dot" />
            {t.pricingEyebrow}
          </div>
          <h2
            style={{
              fontSize: "clamp(24px,3vw,36px)",
              fontWeight: 800,
              color: "var(--ct)",
              margin: "0 0 14px",
              letterSpacing: -0.5,
              lineHeight: 1.15,
            }}
          >
            {t.pricingSectionTitle}
          </h2>
          <p style={{ fontSize: 15, color: "var(--ch)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            {t.pricingSectionSub}
          </p>
        </div>

        {/* alignItems:stretch (Grid-Standard) statt "start" (Nutzer-Vorgabe
            2026-08-18): beide Kacheln sollen unabhaengig von ihrer
            Textlaenge exakt gleich hoch sein - stretch zieht jede Kachel auf
            die Hoehe der jeweils hoechsten in ihrer Zeile. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 18,
            maxWidth: 640,
            margin: "0 auto",
            alignItems: "stretch",
          }}
        >
          <PlanCard
            name="ImmoFuchs"
            tagline={t.planMonthly}
            price={formatMoney(PLAN_AMOUNTS.monthly, locale)}
            perMonth={t.planPerMonth}
            note={monthlyNote}
            trialBadge={t.pricingTrialBadge}
            ctaLabel={
              aktuellerPlan === "monthly"
                ? t.planCtaCurrent
                : aktuellerPlan === "yearly"
                  ? t.planCtaMonthlyLater
                  : t.planProCta
            }
            disabled={Boolean(aktuellerPlan)}
            onCta={() => onChoosePlan("monthly")}
          />
          <PlanCard
            highlighted
            ribbon={t.planPopular}
            name="ImmoFuchs"
            tagline={t.planYearly}
            price={formatMoney(YEARLY_PER_MONTH_AMOUNT, locale)}
            perMonth={t.planPerMonth}
            strikePrice={formatMoney(PLAN_AMOUNTS.monthly, locale)}
            badge={t.planSaveBadge.replace("{percent}", String(YEARLY_SAVINGS_PERCENT))}
            note={yearlyNote}
            trialBadge={t.pricingTrialBadge}
            ctaLabel={
              aktuellerPlan === "yearly"
                ? t.planCtaCurrent
                : aktuellerPlan === "monthly"
                  ? t.planCtaSwitchYearly
                  : t.planProCta
            }
            disabled={aktuellerPlan === "yearly"}
            onCta={() => onChoosePlan("yearly")}
          />
        </div>

        <style>{GRID_CSS}</style>
        <Vertrauenszeile t={t} />
      </div>
    </section>
  );
}

function PlanCard({
  name,
  tagline,
  price,
  perMonth,
  strikePrice,
  badge,
  ribbon,
  note,
  trialBadge,
  ctaLabel,
  onCta,
  highlighted,
  disabled = false,
}) {
  return (
    <div
      style={{
        position: "relative",
        background: "var(--cc)",
        border: `${highlighted ? 2 : 1}px solid ${highlighted ? "var(--ca)" : "var(--cb)"}`,
        borderRadius: 14,
        padding: "20px 20px 22px",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* EMPFOHLEN-Ribbon mittig auf dem oberen Kartenrand. */}
      {ribbon && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            // Marineblau statt Akzentorange, damit sich der Ribbon vom orangen
            // Ersparnis-Badge daneben abhebt (beide gleichzeitig auf derselben
            // Karte, siehe Referenz).
            background: "var(--primary)",
            color: "#fff",
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          ★ {ribbon}
        </div>
      )}
      {badge && (
        <div style={{ position: "absolute", top: 14, right: 16 }}>
          <span style={saveBadgeStyle}>{badge}</span>
        </div>
      )}

      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>{name}</div>
      <div style={{ fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>{tagline}</div>

      <div style={{ marginTop: 16, minHeight: 58 }}>
        {strikePrice && <div style={strikePriceStyle}>{strikePrice}</div>}
        <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05 }}>
            {price}
          </span>
          {perMonth && <span style={{ fontSize: 15, color: "var(--ch)" }}>{perMonth}</span>}
        </div>
      </div>

      <button
        onClick={onCta}
        disabled={disabled}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "13px",
          fontSize: 15,
          fontWeight: 700,
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "inherit",
          // Beide Karten mit vollflaechig orangem CTA (Referenz-Screenshot):
          // der weisse Rahmen-Button auf der Monatskarte las sich wie die
          // zweitrangige Wahl, dabei sind es zwei gleichwertige Laufzeiten -
          // hervorgehoben wird die Jahreskarte bereits ueber Rahmen und
          // Ribbon.
          background: disabled ? "var(--cb)" : "var(--ca)",
          color: disabled ? "var(--ch)" : "#fff",
          border: disabled ? "1px solid var(--cb)" : "1px solid var(--ca)",
          ...(disabled ? { cursor: "not-allowed" } : {}),
        }}
      >
        {ctaLabel}
      </button>

      <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 10, lineHeight: 1.5 }}>{note}</div>

      {trialBadge && (
        <div style={{ ...saveBadgeStyle, marginTop: 10, alignSelf: "flex-start" }}>{trialBadge}</div>
      )}
    </div>
  );
}

// Trennlinien zwischen den Spalten per border-left, das jeweils erste Element
// einer Zeile ausgenommen. Klassen statt Inline-Styles, weil dafuer
// Media-Queries und :nth-child noetig sind - beides kann ein style-Attribut
// nicht. Spaltenzahl und die passende nth-child-Regel muessen je Breakpoint
// zusammen wechseln, sonst stuenden die Linien an der falschen Stelle.
const GRID_CSS = `
  .ps-trust{display:grid;grid-template-columns:repeat(2,1fr)}
  .ps-trust>*{border-left:1px solid var(--cb)}
  .ps-trust>*:nth-child(2n+1){border-left:none}
  @media(max-width:620px){
    .ps-trust{grid-template-columns:1fr;row-gap:18px}
    .ps-trust>*{border-left:none}
  }
`;

// Vertrauens-Zeile unter den Preiskarten.
function Vertrauenszeile({ t }) {
  return (
    <div className="ps-trust" style={{ maxWidth: 720, margin: "26px auto 0" }}>
      {VERTRAUEN.map(({ title, sub, Icon }) => (
        <div
          key={title}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "0 16px",
          }}
        >
          <span style={{ color: "var(--ct)", flexShrink: 0, display: "flex" }}>
            <Icon size={26} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--ct)", lineHeight: 1.3 }}>
              {t[title]}
            </span>
            <span style={{ display: "block", fontSize: 13, color: "var(--ch)", lineHeight: 1.4 }}>
              {t[sub]}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══ Icons fuer die Vertrauenszeile (24er-Koordinaten,
// stroke=currentColor, gleiches Muster wie accountIcons.jsx). Lokal statt in
// der geteilten Icon-Datei, da sie ausschliesslich hier gebraucht werden. ═══
function Svg({ size = 20, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

// ── Vertrauens-Zeile: Schild/Haken, Kreis/Haken, Schloss (Referenz) ──
function IconKuendbar({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3 4.7-5" />
    </Svg>
  );
}

function IconSchloss({ size }) {
  return (
    <Svg size={size}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <path d="M12 14.5v2.5" />
    </Svg>
  );
}
