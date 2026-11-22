import "server-only";
import { Redis } from "@upstash/redis";

/** Free previews per visitor (IP address) per day. */
export const DAILY_LIMIT = Number(process.env.DAILY_GENERATION_LIMIT ?? 2);

/**
 * Site-wide abuse guard. The cap grows with sales so real demand is never blocked:
 *   cap = BASE + (sales today × EXTRA_PER_SALE)
 * A sale ($4.99) pays for ~500 previews ($0.01 each), so as long as at least ~1 in 100
 * previews converts, the cap keeps rising faster than it is used. It only bites when many
 * previews come in with no sales, i.e. someone abusing the free tries.
 */
export const DAILY_GLOBAL_BASE = Number(process.env.DAILY_GLOBAL_GENERATION_LIMIT ?? 300);
export const EXTRA_PREVIEWS_PER_SALE = Number(process.env.EXTRA_PREVIEWS_PER_SALE ?? 100);

const TTL_SECONDS = 60 * 60 * 26;

let redis: Redis | null = null;
function client(): Redis {
  // Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
  redis ??= Redis.fromEnv();
  return redis;
}

function today(): string {
  return new Date().toISOString().slice(0, 10); // UTC day
}

function ipKey(ip: string, day = today()): string {
  return `ratelimit:generate:${day}:${ip}`;
}

function globalKey(day = today()): string {
  return `ratelimit:global:${day}`;
}

function salesKey(day = today()): string {
  return `stats:sales:${day}`;
}

/** Today's site-wide cap for the given number of sales today. */
export function capForSales(sales: number): number {
  return DAILY_GLOBAL_BASE + sales * EXTRA_PREVIEWS_PER_SALE;
}

export type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
      used: number;
      /** Site-wide previews today, including this one. */
      globalUsed: number;
      /** Today's site-wide cap (grows with sales). */
      cap: number;
      salesToday: number;
    }
  /** "ip": this visitor used their free previews. "global": previews are far ahead of sales today. */
  | { allowed: false; reason: "ip" | "global"; cap: number; salesToday: number };

/**
 * Reserves one generation for this IP today, counting it towards both the per-visitor limit
 * and the site-wide cap. Call `releaseGeneration` if the generation fails.
 */
export async function reserveGeneration(ip: string): Promise<RateLimitResult> {
  const day = today();
  const k = ipKey(ip, day);
  const g = globalKey(day);
  const [used, , globalUsed, , sales] = await client()
    .multi()
    .incr(k)
    .expire(k, TTL_SECONDS)
    .incr(g)
    .expire(g, TTL_SECONDS)
    .get<number>(salesKey(day))
    .exec<[number, number, number, number, number | null]>();

  const salesToday = Number(sales ?? 0);
  const cap = capForSales(salesToday);

  if (used > DAILY_LIMIT || globalUsed > cap) {
    // Undo both reservations: a blocked request doesn't use anything up.
    await client().multi().decr(k).decr(g).exec();
    return { allowed: false, reason: used > DAILY_LIMIT ? "ip" : "global", cap, salesToday };
  }
  return { allowed: true, remaining: DAILY_LIMIT - used, used, globalUsed, cap, salesToday };
}

/** Gives back a reserved slot so failed generations don't count against the visitor or the cap. */
export async function releaseGeneration(ip: string): Promise<void> {
  const day = today();
  await client().multi().decr(ipKey(ip, day)).decr(globalKey(day)).exec();
}

/** Counts a sale towards today's total, which raises the site-wide cap. Never throws. */
export async function recordSale(): Promise<void> {
  try {
    const k = salesKey();
    await client().multi().incr(k).expire(k, TTL_SECONDS).exec();
  } catch (err) {
    console.error("[rateLimit] could not record sale", err);
  }
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
