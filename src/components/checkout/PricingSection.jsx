import { ACCOUNT_T } from "../../i18n/account.js";
import { LANG_LOCALE } from "../../utils/helpers.js";
import { saveBadgeStyle, strikePriceStyle } from "./checkoutStyles.js";
import { IconZahlung, IconSicherheit } from "../account/accountIcons.jsx";
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
// Zweite Neugestaltung 25.08.2026 (Referenz-Screenshot): Kartenname jetzt in
// einer Zeile ("ImmoFuchs Monatlich"/"ImmoFuchs Jährlich" statt "ImmoFuchs
// Pro" + separater Tagline-Zeile), Jahreskarte bekommt zusaetzlich zum
// Ersparnis-Badge ein "EMPFOHLEN"-Ribbon (reaktiviert den seit der
// Free-Kachel-Entfernung ungenutzten i18n-Key `planPopular`), die
// Leistungsliste steht jetzt als Icon-Kachel-Reihe statt als Checkliste, und
// darunter eine Vertrauens-Zeile mit drei Punkten. Der bisherige Punkt "Keine
// Zahlungsdaten waehrend der Testphase" ist dabei ENTFALLEN - das stimmte
// nicht: der Checkout-Wizard verlangt die Zahlungsdaten (Paddle-Formular im
// Zahlungsschritt) bereits beim Einstieg in die Testphase, abgebucht wird nur
// erst danach. Ersetzt durch eine Zeile, die das korrekt wiedergibt.
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
const LEISTUNGEN = [
  { key: "compareRowRechner", Icon: IconRechner },
  { key: "compareRowFinn", Icon: IconFinn },
  { key: "compareRowExpose", Icon: IconExpose },
  { key: "compareRowHandout", Icon: IconHandout },
  { key: "compareRowPdf", Icon: IconPdf },
  { key: "compareRowMerkliste", Icon: IconMerkliste },
];

export function PricingSection({ lang, onChoosePlan }) {
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
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: "var(--ca)",
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
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
            name={`ImmoFuchs ${t.planMonthly}`}
            price={formatMoney(PLAN_AMOUNTS.monthly, locale)}
            perMonth={t.planPerMonth}
            note={monthlyNote}
            trialBadge={t.pricingTrialBadge}
            ctaLabel={t.planProCta}
            onCta={() => onChoosePlan("monthly")}
          />
          <PlanCard
            highlighted
            ribbon={t.planPopular}
            name={`ImmoFuchs ${t.planYearly}`}
            price={formatMoney(YEARLY_PER_MONTH_AMOUNT, locale)}
            perMonth={t.planPerMonth}
            strikePrice={formatMoney(PLAN_AMOUNTS.monthly, locale)}
            badge={t.planSaveBadge.replace("{percent}", String(YEARLY_SAVINGS_PERCENT))}
            note={yearlyNote}
            trialBadge={t.pricingTrialBadge}
            ctaLabel={t.planProCta}
            onCta={() => onChoosePlan("yearly")}
          />
        </div>

        <Leistungsliste t={t} />
        <Vertrauenszeile t={t} />
      </div>
    </section>
  );
}

function PlanCard({
  name,
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
      {/* EMPFOHLEN-Ribbon mittig auf dem oberen Kartenrand - Marineblau statt
          Akzentorange, damit er sich vom orangen Ersparnis-Badge daneben
          abhebt (beide gleichzeitig auf derselben Karte, siehe Referenz). */}
      {ribbon && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            // Marineblau als Literal statt var(--primary): dieses Custom
            // Property ist nirgends in ROOT_TOKENS_CSS definiert (existiert
            // nur als bereits vorhandener, gleicher Bug in
            // infoBannerStyle/checkoutStyles.js) - haette hier sonst keine
            // sichtbare Farbe ergeben.
            background: "#1E3A5F",
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

      <div style={{ marginTop: 16, minHeight: 46 }}>
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
        style={{
          width: "100%",
          marginTop: 16,
          padding: "13px",
          fontSize: 15,
          fontWeight: 700,
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "inherit",
          background: highlighted ? "var(--ca)" : "var(--cc)",
          color: highlighted ? "#fff" : "var(--ct)",
          border: highlighted ? "1px solid var(--ca)" : "1px solid var(--cb)",
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

// Icon-Kachel-Reihe statt Checkliste (Neugestaltung 25.08.2026, Referenz-
// Screenshot). Text je Punkt bleibt unveraendert (dieselben compareRow*-Keys
// wie zuvor in der Checkliste) - nur die Darstellung aendert sich, keine
// neuen Uebersetzungen noetig.
function Leistungsliste({ t }) {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "22px auto 0",
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 14,
        padding: "22px 20px",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "var(--ct)",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        {t.pricingFeaturesTitle}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: 20,
        }}
      >
        {LEISTUNGEN.map(({ key, Icon }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--ca-bg)",
                color: "var(--ca)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={22} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)" }}>{t[key]}</div>
          </div>
        ))}
      </div>
      {/* Die Grenzen der Testphase gehoeren sichtbar auf die Seite: "sieben
          Tage kostenlos" ohne zu sagen, was drin ist, waere unsauber. Als
          Fussnote, nicht als Tabelle - es ist Kleingedrucktes, kein
          Verkaufsargument. */}
      <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "var(--ch)", marginTop: 18, textAlign: "center" }}>
        {t.trialFinePrint}
      </div>
    </div>
  );
}

// Vertrauens-Zeile unter der Leistungsbox (Neugestaltung 25.08.2026). Der
// Zahlungsdaten-Punkt gibt bewusst NICHT "keine Zahlungsdaten" wieder (das
// war die vorherige, falsche Aussage) - der Checkout-Wizard verlangt die
// Paddle-Zahlungsdaten bereits beim Start der Testphase, abgebucht wird erst
// danach.
function Vertrauenszeile({ t }) {
  const items = [
    { Icon: IconZahlung, text: t.trustPaymentRequired },
    { Icon: IconKuendbar, text: t.trustCancel },
    { Icon: IconSicherheit, text: t.trustDsgvo },
  ];
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "18px auto 0",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 14,
      }}
    >
      {items.map(({ Icon, text }, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--ca)", flexShrink: 0, display: "flex" }}>
            <Icon size={20} />
          </span>
          <span style={{ fontSize: 13, color: "var(--ct)", lineHeight: 1.4 }}>{text}</span>
        </div>
      ))}
    </div>
  );
}

// ═══ Icons fuer die Leistungs-Kacheln + Vertrauenszeile (24er-Koordinaten,
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

function IconRechner({ size }) {
  return (
    <Svg size={size}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M7 7h10" />
      <path d="M7.5 12h.01M12 12h.01M16.5 12h.01M7.5 16h.01M12 16h.01M16.5 16h.01" />
    </Svg>
  );
}

function IconFinn({ size }) {
  return (
    <Svg size={size}>
      <path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 16H9l-4 4v-4H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 5z" />
      <path d="M7.5 9.5h9M7.5 12.5h5.5" />
    </Svg>
  );
}

function IconExpose({ size }) {
  return (
    <Svg size={size}>
      <rect x="4.5" y="3.5" width="12" height="16" rx="1.5" />
      <path d="M8 8h5M8 11h5M8 14h3" />
      <circle cx="17" cy="17.5" r="3" />
      <path d="M19.3 19.8L21.5 22" />
    </Svg>
  );
}

function IconHandout({ size }) {
  return (
    <Svg size={size}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
      <path d="M8.5 11.5l1.6 1.6 3.4-3.4M8.5 17h7" />
    </Svg>
  );
}

function IconPdf({ size }) {
  return (
    <Svg size={size}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
      <path d="M12 12v6M9.2 15.2l2.8 2.8 2.8-2.8" />
    </Svg>
  );
}

function IconMerkliste({ size }) {
  return (
    <Svg size={size}>
      <path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.5l-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.5z" />
    </Svg>
  );
}

function IconKuendbar({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3 4.7-5" />
    </Svg>
  );
}
