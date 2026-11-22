"use server";

import { redirect } from "next/navigation";
import { getGeneration } from "@/lib/supabase";

/** Creates a Lemon Squeezy checkout tied to this generation and redirects to it. */
export async function startCheckout(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const gen = await getGeneration(id);
  if (!gen) throw new Error("Figure not found");
  if (gen.is_paid) redirect(`/result/${id}`);

  const { LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_ID } = process.env;
  if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID || !LEMONSQUEEZY_VARIANT_ID) {
    throw new Error("Lemon Squeezy env vars are not set");
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { custom: { generation_id: id } },
          product_options: {
            redirect_url: `${site}/result/${id}?checkout=success`,
            receipt_button_text: "Download your figure",
            receipt_link_url: `${site}/result/${id}`,
          },
          checkout_options: { embed: false, media: false },
        },
        relationships: {
          store: { data: { type: "stores", id: LEMONSQUEEZY_STORE_ID } },
          variant: { data: { type: "variants", id: LEMONSQUEEZY_VARIANT_ID } },
        },
      },
    }),
  });

  if (!res.ok) {
    console.error("[checkout] Lemon Squeezy error", res.status, await res.text());
    throw new Error("Could not start checkout");
  }
  const json = (await res.json()) as { data: { attributes: { url: string } } };
  redirect(json.data.attributes.url);
}
