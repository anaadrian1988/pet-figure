import "server-only";
import { HD_BUCKET, PREVIEW_BUCKET, supabaseAdmin } from "@/lib/supabase";

/** Unpaid figures older than this many days are deleted (database row and files). */
export const UNPAID_RETENTION_DAYS = Number(process.env.CLEANUP_UNPAID_AFTER_DAYS ?? 7);
/** Safety limit per run; anything left over is handled by the next daily run. */
const MAX_PER_RUN = 500;

export type CleanupResult = { deleted: number; filesFailed: boolean; cutoff: string };

/**
 * Deletes figures that were never purchased within UNPAID_RETENTION_DAYS: first the database
 * row (only if it is still unpaid at that moment), then its preview and HD files. Paid figures
 * are never touched. If file deletion fails, the worst case is a leftover file, never a paid
 * figure losing its files.
 */
export async function deleteExpiredUnpaidFigures(): Promise<CleanupResult> {
  const supabase = supabaseAdmin();
  const cutoff = new Date(Date.now() - UNPAID_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error } = await supabase
    .from("generations")
    .select("id")
    .eq("is_paid", false)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) throw error;
  if (!expired.length) return { deleted: 0, filesFailed: false, cutoff };

  // Delete the rows, re-checking is_paid so a figure paid in the last moment is kept.
  const { data: removed, error: deleteError } = await supabase
    .from("generations")
    .delete()
    .in(
      "id",
      expired.map((g) => g.id),
    )
    .eq("is_paid", false)
    .select("id, preview_url, hd_path");
  if (deleteError) throw deleteError;
  if (!removed?.length) return { deleted: 0, filesFailed: false, cutoff };

  // The preview's file name is the last part of its public URL (e.g. "<id>.webp").
  const previewPaths = removed
    .map((g) => decodeURIComponent(new URL(g.preview_url).pathname.split("/").pop() ?? ""))
    .filter(Boolean);
  const hdPaths = removed.map((g) => g.hd_path).filter(Boolean);

  const [previews, hds] = await Promise.all([
    supabase.storage.from(PREVIEW_BUCKET).remove(previewPaths),
    supabase.storage.from(HD_BUCKET).remove(hdPaths),
  ]);
  const filesFailed = Boolean(previews.error || hds.error);
  if (filesFailed) console.error("[cleanup] rows deleted but some files could not be removed", previews.error ?? hds.error);

  console.info(`[cleanup] deleted ${removed.length} unpaid figure(s) older than ${UNPAID_RETENTION_DAYS} days`);
  return { deleted: removed.length, filesFailed, cutoff };
}
