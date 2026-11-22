import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

type LemonWebhook = {
  meta: { event_name: string; custom_data?: { generation_id?: string } };
  data: { id: string; attributes: { status?: string } };
};

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(digest, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[lemonsqueezy] LEMONSQUEEZY_WEBHOOK_SECRET is not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  // Signature is computed over the exact raw body, so read text before parsing.
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-signature"), secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: LemonWebhook;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const name = event.meta?.event_name;
  const generationId = event.meta?.custom_data?.generation_id;

  // Only a paid order unlocks. Other events are acknowledged so Lemon Squeezy stops retrying.
  if (name !== "order_created" || event.data?.attributes?.status !== "paid") {
    return Response.json({ ok: true, ignored: name });
  }
  if (!generationId) {
    console.warn("[lemonsqueezy] paid order without generation_id", event.data?.id);
    return Response.json({ ok: true, ignored: "missing generation_id" });
  }

  const { data, error } = await supabaseAdmin()
    .from("generations")
    .update({ is_paid: true, paid_at: new Date().toISOString(), order_id: String(event.data.id) })
    .eq("id", generationId)
    .select("id");

  if (error) {
    console.error("[lemonsqueezy] update failed", error);
    return new Response("DB error", { status: 500 }); // 5xx → Lemon Squeezy retries
  }
  if (!data?.length) console.warn("[lemonsqueezy] no generation found for", generationId);

  return Response.json({ ok: true });
}
