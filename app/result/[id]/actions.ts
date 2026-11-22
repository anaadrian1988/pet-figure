"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { getGeneration } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { PRICE_AMOUNT, PRICE_CURRENCY } from "@/lib/price";

/** Creates a Stripe Checkout Session tied to this generation and redirects to it. */
export async function startCheckout(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const gen = await getGeneration(id);
  if (!gen) throw new Error("Figure not found");
  if (gen.is_paid) redirect(`/result/${id}`);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    quantity: 1,
    price_data: {
      currency: PRICE_CURRENCY,
      unit_amount: PRICE_AMOUNT,
      product_data: {
        name: `${gen.pet_name} Action Figure (HD)`,
        description: "Full-resolution 896×1152 PNG, no watermark",
        images: [gen.preview_url],
      },
    },
  };

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [lineItem],
    client_reference_id: id,
    metadata: { generation_id: id },
    payment_intent_data: { metadata: { generation_id: id } },
    success_url: `${site}/result/${id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/result/${id}`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Could not start checkout");
  redirect(session.url);
}
