import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PREVIEW_BUCKET = process.env.SUPABASE_PREVIEW_BUCKET ?? "previews";
export const HD_BUCKET = process.env.SUPABASE_HD_BUCKET ?? "hd";

export type Generation = {
  id: string;
  created_at: string;
  pet_name: string;
  preset: string;
  age_label: string;
  preview_url: string;
  hd_path: string;
  ip_hash: string | null;
  is_paid: boolean;
  paid_at: string | null;
  order_id: string | null;
};

let admin: SupabaseClient | null = null;

/** Service-role client. Server only: bypasses RLS. */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

export async function getGeneration(id: string): Promise<Generation | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabaseAdmin().from("generations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Generation | null;
}
