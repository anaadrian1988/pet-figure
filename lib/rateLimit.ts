import "server-only";
import { Redis } from "@upstash/redis";

export const DAILY_LIMIT = Number(process.env.DAILY_GENERATION_LIMIT ?? 2);

let redis: Redis | null = null;
function client(): Redis {
  // Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
  redis ??= Redis.fromEnv();
  return redis;
}

function key(ip: string): string {
  const day = new Date().toISOString().slice(0, 10); // UTC day
  return `ratelimit:generate:${day}:${ip}`;
}

export type RateLimitResult = { allowed: boolean; remaining: number; used: number };

/** Reserves one generation for this IP today. Call `releaseGeneration` if the generation fails. */
export async function reserveGeneration(ip: string): Promise<RateLimitResult> {
  const k = key(ip);
  const [used] = await client().multi().incr(k).expire(k, 60 * 60 * 26).exec<[number, number]>();
  if (used > DAILY_LIMIT) {
    await client().decr(k);
    return { allowed: false, remaining: 0, used: DAILY_LIMIT };
  }
  return { allowed: true, remaining: DAILY_LIMIT - used, used };
}

/** Gives back a reserved slot so failed generations don't count against the user. */
export async function releaseGeneration(ip: string): Promise<void> {
  await client().decr(key(ip));
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
