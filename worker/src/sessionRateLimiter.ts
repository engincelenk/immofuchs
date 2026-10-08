import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";

// Ersetzt die urspruengliche KV-Loesung (siehe Git-Historie): KV ist "eventually
// consistent" mit Negative-Cache-Verhalten - ein frisch geschriebener Zaehler
// wurde bei schnellen Folgeanfragen teils bis zu 60s lang nicht gelesen, das
// Tageslimit griff dadurch beim Live-Test nicht (21/21 Anfragen kamen durch).
// Ein Durable Object pro sessionId verarbeitet Anfragen strikt nacheinander -
// dadurch kein Konsistenzproblem, siehe docs/plans/2026-07-19-ki-assistent-sprint-plan.md.
export class SessionRateLimiter extends DurableObject<Env> {
  async checkAndIncrement(dailyLimit: number): Promise<{ allowed: boolean; remaining: number }> {
    const today = new Date().toISOString().slice(0, 10); // UTC-Tagesgrenze, wie zuvor bei KV

    const stored = await this.ctx.storage.get<{ count: number; day: string }>("state");
    const state = stored && stored.day === today ? stored : { count: 0, day: today };

    if (state.count >= dailyLimit) {
      return { allowed: false, remaining: 0 };
    }

    state.count += 1;
    await this.ctx.storage.put("state", state);
    return { allowed: true, remaining: dailyLimit - state.count };
  }

  // Rueckbuchung eines zuvor gezaehlten Requests - genutzt, wenn ein Request
  // zwar ein Kontingent belegt hat, danach aber scheitert (Modell-Fehler) oder
  // eine andere Schranke ihn ablehnt. So kostet nur ein *erfolgreicher* Request
  // wirklich Kontingent (siehe index.ts). Ueber die Tagesgrenze hinaus wird
  // nichts abgezogen (neuer Tag/leerer Zaehler).
  async decrement(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const stored = await this.ctx.storage.get<{ count: number; day: string }>("state");
    if (!stored || stored.day !== today) return;
    stored.count = Math.max(0, stored.count - 1);
    await this.ctx.storage.put("state", stored);
  }

  // Rollierendes Zeitfenster statt fixem UTC-Tag - gebraucht fuer Auth-
  // Rate-Limits mit "pro Stunde" statt "pro Tag" (Magic-Link-Versand,
  // Spec 4.13: 5/Std./E-Mail). Eigener Storage-Key ("window"), damit dieselbe
  // DO-Instanz nicht mit dem taeglichen "state"-Key kollidiert, falls ein Name
  // je fuer beides genutzt wuerde (aktuell nicht der Fall, aber isoliert
  // sicherer).
  async checkAndIncrementWindow(
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const stored = await this.ctx.storage.get<{ count: number; windowStart: number }>("window");
    const state = stored && now - stored.windowStart < windowMs ? stored : { count: 0, windowStart: now };

    if (state.count >= limit) {
      return { allowed: false, remaining: 0 };
    }
    state.count += 1;
    await this.ctx.storage.put("window", state);
    return { allowed: true, remaining: limit - state.count };
  }

}
