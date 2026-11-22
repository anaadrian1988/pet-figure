import { sendAdminEmail, statsEmail } from "@/lib/alerts";
import { getDayStats } from "@/lib/stats";

/**
 * Emails the owner yesterday's numbers (previews, sales, conversion, busiest visitors).
 * Called once a day by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
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

  try {
    const stats = await getDayStats(day);
    const { html, text } = statsEmail(stats, `Daily summary for ${day}`, `Here's how PetFigure did on ${day} (UTC).`);
    const sent = await sendAdminEmail(
      `PetFigure ${day}: ${stats.previews} previews, ${stats.sales} sales (${stats.revenue})`,
      html,
      text,
    );
    return Response.json({ ok: true, day, sent, previews: stats.previews, sales: stats.sales, revenue: stats.revenue });
  } catch (err) {
    console.error("[daily-summary] failed", err);
    return Response.json({ ok: false, error: "Could not build the summary" }, { status: 500 });
  }
}
