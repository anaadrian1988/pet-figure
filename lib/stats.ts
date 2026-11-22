import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { PRICE_AMOUNT, PRICE_CURRENCY } from "@/lib/price";
import { supabaseAdmin } from "@/lib/supabase";

export type SourceStats = { label: string; previews: number; paid: number };

export type DayStats = {
  /** UTC day, YYYY-MM-DD. */
  day: string;
  previews: number;
  /** Figures unlocked (paid) during this day, whenever they were made. */
  sales: number;
  revenue: string;
  /** Sales as a share of previews, e.g. "4.0%". */
  conversion: string;
  /** Busiest visitors (by IP) that day, most previews first. */
  sources: SourceStats[];
};

/** Shortens an IP for display: 86.124.122.25 → 86.124.122.x. */
export function maskIp(ip: string): string {
  if (ip === "::1" || ip === "127.0.0.1") return "localhost";
  if (ip.includes(".")) return ip.split(".").slice(0, 3).join(".") + ".x";
  return ip.split(":").slice(0, 4).join(":") + ":…";
}

/** Same fingerprint the generate route stores in generations.ip_hash. */
function ipHash(ip: string): string {
  return createHash("sha256").update(`${ip}:${process.env.IP_HASH_SALT ?? ""}`).digest("hex");
}

/** Maps stored IP fingerprints back to masked IPs, using that day's rate-limit counters in Redis. */
async function labelsForDay(day: string): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  try {
    const redis = Redis.fromEnv();
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, { match: `ratelimit:generate:${day}:*`, count: 200 });
      cursor = String(next);
      for (const k of keys) {
        const ip = k.split(":").slice(3).join(":");
        labels.set(ipHash(ip), maskIp(ip));
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error("[stats] could not read Redis labels", err);
  }
  return labels;
}

export async function getDayStats(day: string): Promise<DayStats> {
  const start = `${day}T00:00:00.000Z`;
  const end = new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString();
  const supabase = supabaseAdmin();

  const [made, sold, labels] = await Promise.all([
    supabase.from("generations").select("ip_hash, is_paid").gte("created_at", start).lt("created_at", end),
    supabase.from("generations").select("id", { count: "exact", head: true }).gte("paid_at", start).lt("paid_at", end),
    labelsForDay(day),
  ]);
  if (made.error) throw made.error;
  if (sold.error) throw sold.error;

  const previews = made.data.length;
  const sales = sold.count ?? 0;

  const bySource = new Map<string, SourceStats>();
  for (const g of made.data) {
    const hash = g.ip_hash ?? "unknown";
    const s = bySource.get(hash) ?? { label: labels.get(hash) ?? `visitor #${hash.slice(0, 6)}`, previews: 0, paid: 0 };
    s.previews++;
    if (g.is_paid) s.paid++;
    bySource.set(hash, s);
  }

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: PRICE_CURRENCY.toUpperCase() });
  return {
    day,
    previews,
    sales,
    revenue: money.format((sales * PRICE_AMOUNT) / 100),
    conversion: previews ? `${((sales / previews) * 100).toFixed(1)}%` : "n/a",
    sources: [...bySource.values()].sort((a, b) => b.previews - a.previews).slice(0, 10),
  };
}
