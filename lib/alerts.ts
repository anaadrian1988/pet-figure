import "server-only";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { DAILY_GLOBAL_BASE, EXTRA_PREVIEWS_PER_SALE } from "@/lib/rateLimit";
import { getDayStats, type DayStats } from "@/lib/stats";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Emails the site owner (ALERT_EMAIL). Logs instead when it isn't configured. Never throws. */
export async function sendAdminEmail(subject: string, html: string, text: string): Promise<boolean> {
  const to = process.env.ALERT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!to || !apiKey || !from) {
    console.info(`[alerts] not sent (ALERT_EMAIL, RESEND_API_KEY or EMAIL_FROM missing): ${subject}`);
    return false;
  }
  try {
    const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html, text });
    if (error) {
      console.error("[alerts] Resend error", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[alerts] failed to send", err);
    return false;
  }
}

/** Builds the stats email body shared by cap alerts and the daily summary. */
export function statsEmail(stats: DayStats, heading: string, intro: string): { html: string; text: string } {
  const rows = stats.sources
    .map(
      (s) =>
        `<tr><td style="padding:6px 8px;border-top:1px solid #eee;font-family:monospace">${esc(s.label)}</td>` +
        `<td style="padding:6px 8px;border-top:1px solid #eee;text-align:right">${s.previews}</td>` +
        `<td style="padding:6px 8px;border-top:1px solid #eee;text-align:right">${s.paid}</td></tr>`,
    )
    .join("");
  const cell = (label: string, value: string) =>
    `<td style="padding:12px;border:3px solid #141414;border-radius:10px;text-align:center;width:25%">` +
    `<div style="font-size:22px;font-weight:900">${esc(value)}</div><div style="font-size:12px;color:#555">${label}</div></td>`;

  const html = `<!doctype html><html><body style="margin:0;background:#fff6e5;font-family:Arial,Helvetica,sans-serif;color:#141414">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:4px solid #141414;border-radius:16px">
<tr><td style="background:#e5262e;border-radius:12px 12px 0 0;padding:16px 20px;color:#fff;font-size:20px;font-weight:900">${esc(heading)}</td></tr>
<tr><td style="padding:20px">
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">${esc(intro)}</p>
<table role="presentation" width="100%" cellspacing="6" cellpadding="0"><tr>
${cell("previews", String(stats.previews))}${cell("sales", String(stats.sales))}${cell("conversion", stats.conversion)}${cell("revenue", stats.revenue)}
</tr></table>
<p style="margin:20px 0 6px;font-weight:900">Busiest visitors (${esc(stats.day)}, UTC)</p>
${
  stats.sources.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
<tr style="color:#555;font-size:12px"><td style="padding:6px 8px">Address</td><td style="padding:6px 8px;text-align:right">Previews</td><td style="padding:6px 8px;text-align:right">Paid</td></tr>${rows}</table>`
    : `<p style="margin:0;color:#555">No previews.</p>`
}
<p style="margin:20px 0 0;font-size:12px;color:#555;line-height:1.5">
Many previews from a few addresses with no sales can mean someone is abusing the free tries.
Daily preview cap: ${DAILY_GLOBAL_BASE} + ${EXTRA_PREVIEWS_PER_SALE} per sale that day, so it rises on its own while people buy.
To change it, set DAILY_GLOBAL_GENERATION_LIMIT or EXTRA_PREVIEWS_PER_SALE in Vercel and redeploy.
</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    heading,
    "",
    intro,
    "",
    `Previews: ${stats.previews}   Sales: ${stats.sales}   Conversion: ${stats.conversion}   Revenue: ${stats.revenue}`,
    "",
    `Busiest visitors (${stats.day}, UTC):`,
    ...(stats.sources.length ? stats.sources.map((s) => `  ${s.label}: ${s.previews} previews, ${s.paid} paid`) : ["  No previews."]),
    "",
    `Daily preview cap: ${DAILY_GLOBAL_BASE} + ${EXTRA_PREVIEWS_PER_SALE} per sale that day. Change DAILY_GLOBAL_GENERATION_LIMIT or EXTRA_PREVIEWS_PER_SALE in Vercel to adjust.`,
  ].join("\n");

  return { html, text };
}

/**
 * Emails the owner when today's site-wide previews reach 80% and 100% of today's cap.
 * The cap grows with sales, so reaching it means previews are far ahead of sales (likely abuse).
 * Each level is sent at most once per day. Call after the response (via `after`).
 */
export async function checkCapAlerts(globalUsed: number, cap: number, salesToday: number, capReached: boolean): Promise<void> {
  try {
    const level = capReached || globalUsed >= cap ? 100 : globalUsed >= Math.ceil(cap * 0.8) ? 80 : 0;
    if (!level) return;

    const day = new Date().toISOString().slice(0, 10);
    const redis = Redis.fromEnv();
    // After a "cap reached" alert, a sale can lower usage below 80% of the new cap; don't send a stale warning.
    if (level === 80 && (await redis.exists(`alert:cap100:${day}`))) return;
    const first = await redis.set(`alert:cap${level}:${day}`, "1", { nx: true, ex: 60 * 60 * 26 });
    if (first !== "OK") return; // already alerted for this level today

    const stats = await getDayStats(day);
    const heading = level === 100 ? "Preview cap reached: check for abuse" : "Free previews are running ahead of sales";
    const intro =
      level === 100
        ? `PetFigure made ${cap} previews today with only ${salesToday} sale(s), so new previews are paused until midnight UTC (02:00 in Romania). Each new sale reopens 100 more. Check the busiest visitors below for someone abusing the free tries.`
        : `PetFigure has made ${globalUsed} previews today against ${salesToday} sale(s). Previews pause at ${cap} unless more sales come in (each sale adds ${EXTRA_PREVIEWS_PER_SALE}).`;
    const { html, text } = statsEmail(stats, heading, intro);
    await sendAdminEmail(`PetFigure: ${heading}`, html, text);
  } catch (err) {
    console.error("[alerts] cap alert failed", err);
  }
}
