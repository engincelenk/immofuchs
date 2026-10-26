import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Ctx } from "../../context/AppContext.jsx";
import { T } from "../../i18n/translations.js";
import { AmpelKPIRuhig, InsRuhig, Sec } from "./atoms.jsx";
import { Icon, Emo, EMOJI_ICON, iconName } from "./Icon.jsx";

const mit = (el) => renderToStaticMarkup(<Ctx.Provider value={{ t: T.de }}>{el}</Ctx.Provider>);

describe("Gestaltung Ruhig (Bausteine)", () => {
  it("Icon kennt Namen und bisherige Emoji, unbekanntes zeichnet nichts", () => {
    expect(renderToStaticMarkup(<Icon name="pin" />)).toContain("<svg");
    expect(renderToStaticMarkup(<Icon name="⚠️" />)).toContain("<svg");
    expect(renderToStaticMarkup(<Icon name="🤷" />)).toBe("");
    expect(iconName("haus")).toBe("haus");
    for (const e of Object.keys(EMOJI_ICON)) expect(iconName(e), e).toBeTruthy();
  });
  it("Sec: Icon-Name und bisheriges Emoji werden als Linien-Icon gezeichnet, Unbekanntes als Text", () => {
    expect(mit(<Sec title="Lage" icon="pin" />)).toContain("<svg");
    expect(mit(<Sec title="Lage" icon="📍" />)).toContain("<svg");
    expect(mit(<Sec title="Lage" icon="📍" />)).not.toContain("📍");
    expect(mit(<Sec title="Strom" icon="🦄" />)).toContain("🦄");
  });
  it("Emo: Icon fuer bekannte Emoji, Bild-Emoji ohne Icon entfallen, Textzeichen bleiben", () => {
    expect(renderToStaticMarkup(<Emo e="🏦" />)).toContain("<svg");
    expect(renderToStaticMarkup(<Emo e="🦄" />)).toBe("");
    expect(renderToStaticMarkup(<Emo e="☰" />)).toBe("☰");
  });
  it("InsRuhig: zart getoente Flaeche, Icon statt Emoji, Text in Textfarbe", () => {
    const h = mit(<InsRuhig emoji="✅" text="Sonder-AfA aktiv" type="good" />);
    expect(h).toContain("<svg");
    expect(h).toContain("Sonder-AfA aktiv");
    expect(h).not.toContain("✅");
    expect(h).toContain("var(--ok-bg)");
  });
  it("AmpelKPIRuhig: Wert in Textfarbe, keine getoente Karte", () => {
    const h = mit(<AmpelKPIRuhig label="Cashflow" value="-355 €" color="red" status="kritisch" statusLabel="rot" />);
    expect(h).toContain("-355 €");
    expect(h).not.toContain("rgba(239,68,68");
    expect(h).toContain("var(--bad-tx)");
  });
});
