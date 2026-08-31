// Native In-App-Kauf ueber RevenueCat (Capacitor-Plugin), Ergaenzung zum
// bestehenden Stripe-Checkout fuer Web. Grund: Apple (Guideline 3.1.1) und
// Google Play verlangen fuer ein In-App-Abo die jeweils eigene Kauf-API
// (StoreKit/Play Billing) statt eines Web-Checkouts innerhalb der App -
// RevenueCat kapselt beide APIs hinter einem gemeinsamen Interface und
// meldet Kaeufe per Webhook an den Worker (worker/src/revenuecat/webhook.ts),
// der daraus dieselbe `subscriptions`-Zeile erzeugt wie der Stripe-Webhook
// (Spalte `source`, siehe Migration 0031).
//
// Ausserhalb einer nativen Huelle (reiner Browser/PWA) folgenlos, wie bei
// nativeAuth.js/nativePush.js.
//
// WICHTIG, noch offen (siehe docs/app-store-google-play-setup.md Teil C):
// ungetestet, solange kein echtes RevenueCat-Projekt mit echten App-Store-
// Connect-/Play-Console-Produkten existiert. Die beiden Produkt-IDs
// (`pro_monthly`/`pro_yearly`) und das Entitlement (`pro`) muessen dort exakt
// so angelegt werden, sonst liefert getOfferings() ein leeres Angebot.
import { Capacitor } from "@capacitor/core";

export const PRO_ENTITLEMENT_ID = "pro";
export const PRODUCT_ID_MONTHLY = "pro_monthly";
export const PRODUCT_ID_YEARLY = "pro_yearly";

let configuredForUserId = null;

export function isNative() {
  return Capacitor.isNativePlatform();
}

function apiKeyForPlatform() {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return import.meta.env.VITE_REVENUECAT_API_KEY_IOS || null;
  if (platform === "android") return import.meta.env.VITE_REVENUECAT_API_KEY_ANDROID || null;
  return null;
}

// `appUserId` = unsere eigene interne User-ID (account.me.id), NICHT eine von
// RevenueCat generierte anonyme ID - nur so laesst sich ein Kauf serverseitig
// eindeutig einem Worker-Nutzer zuordnen (der Webhook traegt dieselbe ID als
// `app_user_id`, siehe worker/src/revenuecat/webhook.ts).
export async function configurePurchases(appUserId) {
  if (!isNative() || !appUserId || configuredForUserId === appUserId) return;
  const apiKey = apiKeyForPlatform();
  if (!apiKey) {
    console.error("revenuecat_api_key_missing", Capacitor.getPlatform());
    return;
  }
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  await Purchases.configure({ apiKey, appUserID: appUserId });
  configuredForUserId = appUserId;
}

// Liefert die aktuellen Angebote (RevenueCat-"Offerings") - enthaelt die
// beiden Pakete fuer Monat/Jahr, sofern in App Store Connect/Play Console UND
// im RevenueCat-Dashboard korrekt verknuepft.
export async function getOfferings() {
  if (!isNative()) return null;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { offerings } = await Purchases.getOfferings();
  return offerings?.current ?? null;
}

// `plan` ist "monthly" | "yearly" - findet das passende Paket aus dem
// aktuellen Angebot ueber die Produkt-ID statt ueber RevenueCats eigene
// Paket-Typen (monthly/annual), damit hier dieselbe Terminologie wie im Rest
// der App (planPricing.js) verwendet werden kann.
export async function purchasePlan(plan) {
  if (!isNative()) throw new Error("purchase_only_available_native");
  const productId = plan === "yearly" ? PRODUCT_ID_YEARLY : PRODUCT_ID_MONTHLY;
  const offering = await getOfferings();
  const pkg = offering?.availablePackages?.find((p) => p.product?.identifier === productId);
  if (!pkg) throw new Error("product_not_available");
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return hasProEntitlement(customerInfo);
}

export async function restorePurchases() {
  if (!isNative()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.restorePurchases();
  return hasProEntitlement(customerInfo);
}

function hasProEntitlement(customerInfo) {
  return Boolean(customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT_ID]);
}
