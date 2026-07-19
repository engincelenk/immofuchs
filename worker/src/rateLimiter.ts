// Rate-Limit ueber Session-ID (lokal generierte UUID im Client), nicht IP -
// mobile Nutzer teilen sich oft NAT-IPs. Siehe Konzept 2.8/2.10.

const KV_TTL_SECONDS = 60 * 60 * 26; // etwas mehr als 24h, ueberlebt Zeitzonen-Kanten sicher

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(
  kv: KVNamespace,
  sessionId: string,
  dailyLimit: number
): Promise<RateLimitResult> {
  const utcDay = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC-Tagesgrenze
  const key = `rl:${sessionId}:${utcDay}`;

  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= dailyLimit) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(key, String(count + 1), { expirationTtl: KV_TTL_SECONDS });
  return { allowed: true, remaining: dailyLimit - count - 1 };
}
