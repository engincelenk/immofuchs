import { useEffect, useRef } from "react";
import { MARKET_RATES, MIET_P } from "./data.js";

const avg = MARKET_RATES.avg.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const top = MARKET_RATES.top.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mietP = MIET_P.normal.pA.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ITEMS = {
  haupt: [
    { icon: "🔍", text: `Ich schaue nach den Grunderwerbsteuern in deinem Bundesland...` },
    { icon: "📊", text: `Mietpreisprognose wird ermittelt — Stat. Bundesamt sagt +${mietP}%/Jahr` },
    { icon: "🏘️", text: "Prüfe ob dein Markt angespannt ist..." },
    { icon: "💰", text: `Aktuelle Bauzinsen werden berücksichtigt — Ø ${avg}%` },
    { icon: "✅", text: "Alles bereit — deine Rendite kann berechnet werden" },
  ],
  kredit: [
    { icon: "🏦", text: `Ich hole die aktuellen Bauzinsen — Topzins ab ${top}%` },
    { icon: "📋", text: "Grunderwerbsteuer für dein Bundesland wird geladen..." },
    { icon: "🎯", text: "KfW-Förderprogramme werden geprüft..." },
    { icon: "✅", text: "Alles bereit — deine Finanzierung kann berechnet werden" },
  ],
  miete: [
    { icon: "⚖️", text: "§558 BGB Logik wird aktiviert..." },
    { icon: "🏙️", text: "Prüfe ob deine Stadt einen angespannten Wohnungsmarkt hat..." },
    { icon: "📈", text: `Mietpreisprognose wird ermittelt — +${mietP}%/Jahr` },
    { icon: "✅", text: "Alles bereit — deine Mieterhöhung kann berechnet werden" },
  ],
  sanier: [
    { icon: "🏗️", text: "KfW BEG Förderquoten werden geladen..." },
    { icon: "💶", text: "BAFA Förderung wird geprüft..." },
    { icon: "🌱", text: "CO₂-Preis und Energiekosten werden berücksichtigt" },
    { icon: "✅", text: "Alles bereit — deine Sanierung kann berechnet werden" },
  ],
};

const css = `
.if-ls-item{display:flex;align-items:center;gap:12px;opacity:0;transform:translateY(4px);transition:opacity .4s ease,transform .4s ease;margin-bottom:14px}
.if-ls-item.vis{opacity:1;transform:translateY(0)}
.if-ls-icon{font-size:18px;width:24px;flex-shrink:0}
.if-ls-right{flex:1;display:flex;flex-direction:column;gap:5px}
.if-ls-label{font-size:14px;color:var(--ch);transition:color .3s ease}
.if-ls-item.done .if-ls-label{color:var(--ct)}
.if-ls-track{height:4px;background:var(--cb);border-radius:2px;overflow:hidden}
.if-ls-bar{height:100%;width:0%;border-radius:2px;background:var(--ca)}
.if-ls-item.done .if-ls-bar{background:#22c55e}
.if-ls-check{font-size:15px;color:#22c55e;opacity:0;transition:opacity .25s ease;flex-shrink:0;margin-left:4px}
.if-ls-item.done .if-ls-check{opacity:1}
`;

export default function LoadingScreen({ tab, onDone }) {
  const containerRef = useRef(null);
  const timers = useRef([]);

  function t(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function animateBar(fillEl, onDone) {
    const PHASES = [
      { until: 20, speed: 1.0 },
      { until: 50, speed: 2.5 },
      { until: 72, speed: 0.7 },
      { until: 88, speed: 2.0 },
      { until: 100, speed: 1.2 },
    ];
    let pct = 0;
    const interval = 12;
    function tick() {
      const phase = PHASES.find(p => pct < p.until) || PHASES[PHASES.length - 1];
      pct = Math.min(100, pct + phase.speed);
      if (fillEl) fillEl.style.width = pct + "%";
      if (pct < 100) {
        const id = setTimeout(tick, interval);
        timers.current.push(id);
      } else {
        onDone();
      }
    }
    tick();
  }

  function doItem(els, fills, i) {
    if (i >= els.length) {
      t(() => onDone(), 400);
      return;
    }
    const el = els[i];
    el.classList.add("vis");
    t(() => {
      animateBar(fills[i], () => {
        el.classList.add("done");
        doItem(els, fills, i + 1);
      });
    }, 200);
  }

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const container = containerRef.current;
    if (!container) return;
    const items = ITEMS[tab] || ITEMS.haupt;
    container.innerHTML = "";
    const fills = [];
    items.forEach(it => {
      const div = document.createElement("div");
      div.className = "if-ls-item";
      div.innerHTML = `
        <span class="if-ls-icon">${it.icon}</span>
        <div class="if-ls-right">
          <div class="if-ls-label">${it.text}</div>
          <div class="if-ls-track"><div class="if-ls-bar"></div></div>
        </div>
        <span class="if-ls-check">✓</span>`;
      container.appendChild(div);
      fills.push(div.querySelector(".if-ls-bar"));
    });
    const els = container.querySelectorAll(".if-ls-item");
    t(() => doItem(Array.from(els), fills, 0), 300);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [tab]);

  return (
    <>
      <style>{css}</style>
      <div style={{ padding: "2rem 0", maxWidth: 480 }}>
        <div ref={containerRef} />
      </div>
    </>
  );
}
