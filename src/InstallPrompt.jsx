/**
 * InstallPrompt.jsx
 * Android: beforeinstallprompt → schickes Banner
 * iOS:     standalone-Check → Hinweis-Toast (da kein Event)
 * Beide verschwinden nach 7 Tagen nicht mehr (localStorage)
 */
import { useState, useEffect } from "react";

const STORAGE_KEY = "immofuchs_install_dismissed";
const DISMISS_DAYS = 3;

function wasDismissedRecently() {
  try {
    const ts = localStorage.getItem(STORAGE_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}

// Läuft die App bereits als installierte PWA?
function isStandalone() {
  return (
    window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null); // Android
  const [showIOS, setShowIOS] = useState(false); // iOS
  const [visible, setVisible] = useState(false);
  // Abstand nach unten = Hoehe der Rechner-Tableiste, solange sie zu sehen ist.
  // Vorher lag der Hinweis fest am unteren Rand UEBER der Tableiste - die
  // Rechner waren auf dem Handy erst nach dem Wegklicken bedienbar (QA-Befund
  // F3, 2026-10-11). Gemessen statt per CSS-Breakpoint, weil die Tableiste
  // erst mit der App-Ansicht erscheint und ab 1280px der Sidebar weicht.
  const [tbarHoehe, setTbarHoehe] = useState(0);

  useEffect(() => {
    // Schon installiert oder kürzlich geschlossen → nichts tun
    if (isStandalone() || wasDismissedRecently()) return;

    // ── Android: beforeinstallprompt ──────────────────────
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // ── iOS: kein Event → manuellen Hinweis zeigen ────────
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      // Kurz verzögert anzeigen damit Seite erstmal lädt
      setTimeout(() => {
        setShowIOS(true);
        setVisible(true);
      }, 3000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const messen = () => {
      const tb = document.querySelector(".tbar-wrap");
      const h = tb && getComputedStyle(tb).display !== "none" ? tb.getBoundingClientRect().height : 0;
      setTbarHoehe(Math.round(h));
    };
    messen();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(messen) : null;
    ro?.observe(document.body);
    window.addEventListener("resize", messen);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", messen);
    };
  }, [visible]);

  // Die Tableiste bringt den Safe-Area-Abstand selbst mit (padding-bottom).
  const bannerPos = { ...bannerStyle, bottom: tbarHoehe > 0 ? tbarHoehe : bannerStyle.bottom };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      dismiss();
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  if (!visible) return null;

  // ── iOS-Banner ────────────────────────────────────────────
  if (showIOS && !deferredPrompt) {
    return (
      <div style={bannerPos}>
        <img src="/icon-192.png" alt="Immofuchs" style={iconStyle} />
        <div style={{ flex: 1 }}>
          <div style={titleStyle}>Zum Home-Bildschirm</div>
          <div style={subStyle}>
            Tippe auf <strong>Teilen</strong> <span style={{ fontSize: 14 }}>↑</span> dann
            <strong> „Zum Home-Bildschirm"</strong> — App offline nutzbar.
          </div>
        </div>
        <button onClick={handleDismiss} style={closeStyle} aria-label="Schließen">
          ✕
        </button>
      </div>
    );
  }

  // ── Android-Banner ────────────────────────────────────────
  return (
    <div style={bannerPos}>
      <img src="/icon-192.png" alt="Immofuchs" style={iconStyle} />
      <div style={{ flex: 1 }}>
        <div style={titleStyle}>App installieren</div>
        <div style={subStyle}>Offline nutzbar · Kein App Store nötig</div>
      </div>
      <button onClick={handleInstall} style={installBtnStyle}>
        Installieren
      </button>
      <button onClick={handleDismiss} style={closeStyle} aria-label="Schließen">
        ✕
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const bannerStyle = {
  position: "fixed",
  bottom: "env(safe-area-inset-bottom, 0px)",
  left: 0,
  right: 0,
  zIndex: 9500,
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  background: "#1E3A5F",
  color: "#fff",
  boxShadow: "0 -2px 16px rgba(0,0,0,0.25)",
  fontFamily: "'DM Sans', sans-serif",
};

const iconStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
  flexShrink: 0,
};

const titleStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
  marginBottom: 2,
};

const subStyle = {
  fontSize: 12,
  color: "rgba(255,255,255,0.75)",
  lineHeight: 1.4,
};

const installBtnStyle = {
  padding: "8px 16px",
  background: "var(--ca, #E8600A)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  flexShrink: 0,
  fontFamily: "inherit",
};

const closeStyle = {
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,0.6)",
  fontSize: 16,
  cursor: "pointer",
  // Mindestens 32x32 px Tippflaeche (vorher 22x28, QA-Befund F6).
  minWidth: 32,
  minHeight: 32,
  padding: 4,
  flexShrink: 0,
  lineHeight: 1,
};
