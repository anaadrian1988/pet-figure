import "server-only";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { sendFigureUnlockedEmail } from "@/lib/email";

let client: Stripe | null = null;

/** Server-side Stripe client. Uses the API version pinned by the installed SDK. */
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY must be set");
    client = new Stripe(key);
  }
  return client;
}

/**
 * Marks a generation as paid if the Checkout Session is paid and belongs to it, then emails
 * the buyer their links. Safe to call more than once (webhook and success redirect may both
 * call it): only the call that actually flips is_paid sends the email.
 */
export async function markPaidFromSession(session: Stripe.Checkout.Session): Promise<boolean> {
  const generationId = session.metadata?.generation_id ?? session.client_reference_id;
  if (!generationId || session.payment_status !== "paid") return false;

  const { data, error } = await supabaseAdmin()
    .from("generations")
    .update({ is_paid: true, paid_at: new Date().toISOString(), order_id: session.id })
    .eq("id", generationId)
    .eq("is_paid", false)
    .select("id, pet_name, hd_path");
  if (error) throw error;

  const updated = data?.[0];
  if (!updated) return false;

  const email = session.customer_details?.email ?? session.customer_email;
  if (email) {
    await sendFigureUnlockedEmail({ to: email, petName: updated.pet_name, figureId: updated.id, hdPath: updated.hd_path });
  } else {
    console.warn("[stripe] paid session without a customer email", session.id);
  }
  return true;
}
