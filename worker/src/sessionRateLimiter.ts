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
}
