import { supabaseAdmin } from "@/lib/supabase";

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 30;

export type FigureSummary = {
  id: string;
  petName: string;
  preset: string;
  previewUrl: string;
  isPaid: boolean;
  createdAt: string;
};

/**
 * GET /api/figures?ids=a,b,c → summaries for the figures this browser remembers.
 * Only figures whose (unguessable) IDs the caller already has are returned, in the order asked.
 * IDs that no longer exist are simply left out.
 */
export async function GET(request: Request) {
  const ids = [
    ...new Set(
      (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => ID_RE.test(s)),
    ),
  ].slice(0, MAX_IDS);

  if (ids.length === 0) return Response.json({ figures: [] });

  const { data, error } = await supabaseAdmin()
    .from("generations")
    .select("id, pet_name, preset, preview_url, is_paid, created_at")
    .in("id", ids);

  if (error) {
    console.error("[figures] lookup failed", error);
    return Response.json({ error: "Could not load your figures" }, { status: 500 });
  }

  const byId = new Map(data.map((g) => [g.id as string, g]));
  const figures: FigureSummary[] = ids.flatMap((id) => {
    const g = byId.get(id);
    return g
      ? [{ id, petName: g.pet_name, preset: g.preset, previewUrl: g.preview_url, isPaid: g.is_paid, createdAt: g.created_at }]
      : [];
  });

  return Response.json({ figures }, { headers: { "Cache-Control": "no-store" } });
}
