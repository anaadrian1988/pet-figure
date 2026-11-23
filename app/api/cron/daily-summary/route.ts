import { sendAdminEmail, statsEmail } from "@/lib/alerts";
import { deleteExpiredUnpaidFigures } from "@/lib/cleanup";
import { getDayStats } from "@/lib/stats";

/**
 * Daily job (Vercel Cron, see vercel.json; sends `Authorization: Bearer $CRON_SECRET`):
 * 1. emails the owner yesterday's numbers (previews, sales, conversion, busiest visitors);
 * 2. deletes figures that were never purchased within the retention period (lib/cleanup.ts).
 * For a manual run: GET /api/cron/daily-summary?day=YYYY-MM-DD with the same header.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const asked = new URL(request.url).searchParams.get("day");
  const day =
    asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let summary: Record<string, unknown>;
  try {
    const stats = await getDayStats(day);
    const { html, text } = statsEmail(stats, `Daily summary for ${day}`, `Here's how PetFigure did on ${day} (UTC).`);
    const sent = await sendAdminEmail(
      `PetFigure ${day}: ${stats.previews} previews, ${stats.sales} sales (${stats.revenue})`,
      html,
      text,
    );
    summary = { ok: true, day, sent, previews: stats.previews, sales: stats.sales, revenue: stats.revenue };
  } catch (err) {
    console.error("[daily-summary] failed", err);
    summary = { ok: false, error: "Could not build the summary" };
  }

  // Runs even if the summary failed; the two are independent.
  let cleanup: Record<string, unknown>;
  try {
    cleanup = { ok: true, ...(await deleteExpiredUnpaidFigures()) };
  } catch (err) {
    console.error("[cleanup] failed", err);
    cleanup = { ok: false, error: "Could not clean up expired figures" };
  }

  const ok = summary.ok === true && cleanup.ok === true;
  return Response.json({ ok, summary, cleanup }, { status: ok ? 200 : 500 });
}
