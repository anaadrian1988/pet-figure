import { getGeneration, HD_BUCKET, supabaseAdmin } from "@/lib/supabase";

/** Redirects to a short-lived signed URL for the HD PNG, only once the generation is paid. */
export async function GET(_request: Request, ctx: RouteContext<"/api/download/[id]">) {
  const { id } = await ctx.params;
  const gen = await getGeneration(id);
  if (!gen) return new Response("Not found", { status: 404 });
  if (!gen.is_paid) return new Response("Payment required", { status: 402 });

  const filename = `${gen.pet_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "pet"}-action-figure.png`;
  const { data, error } = await supabaseAdmin()
    .storage.from(HD_BUCKET)
    .createSignedUrl(gen.hd_path, 60 * 5, { download: filename });
  if (error || !data) return new Response("Could not create download link", { status: 500 });

  return Response.redirect(data.signedUrl, 302);
}
