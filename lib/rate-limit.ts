// In-memory token buckets. State lives in this server process only: it resets on
// deploy or restart and is not shared between instances. That is enough for the one
// Railway replica this site runs on; move it to a shared store before scaling out.

type Bucket = { tokens: number; at: number };

export type Take = { ok: true; remaining: number } | { ok: false; retryAfter: number };

export type LimiterOptions = {
  /** Requests allowed in a burst. */
  capacity: number;
  /** One token comes back every `refillMs`. */
  refillMs: number;
  /** Map size that triggers a sweep of idle (full) buckets. */
  maxKeys?: number;
};

export function createLimiter({ capacity, refillMs, maxKeys = 5000 }: LimiterOptions) {
  const buckets = new Map<string, Bucket>();

  const level = (b: Bucket, now: number) => Math.min(capacity, b.tokens + (now - b.at) / refillMs);

  function sweep(now: number) {
    for (const [key, b] of buckets) if (level(b, now) >= capacity) buckets.delete(key);
    // Still over budget (a flood of distinct keys): drop the oldest entries.
    for (const key of buckets.keys()) {
      if (buckets.size <= maxKeys) break;
      buckets.delete(key);
    }
  }

  return {
    take(key: string, now = Date.now()): Take {
      if (buckets.size > maxKeys) sweep(now);
      const b = buckets.get(key);
      const tokens = b ? level(b, now) : capacity;
      if (tokens < 1) {
        buckets.set(key, { tokens, at: now });
        return { ok: false, retryAfter: Math.max(1, Math.ceil(((1 - tokens) * refillMs) / 1000)) };
      }
      // Re-insert so Map order tracks recency for the oldest-first drop above.
      buckets.delete(key);
      buckets.set(key, { tokens: tokens - 1, at: now });
      return { ok: true, remaining: Math.floor(tokens - 1) };
    },
  };
}

/**
 * Client IP behind Railway's edge, which sets X-Real-IP. Falls back to the first
 * X-Forwarded-For entry, then to a shared "unknown" key (local dev, curl).
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd ? fwd.slice(0, 64) : "unknown";
}
