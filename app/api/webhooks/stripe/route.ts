import type Stripe from "stripe";
import { markPaidFromSession, stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  // The signature covers the exact raw body, so read it as text before parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(rawBody, signature, secret);
  } catch (err) {
    console.warn("[stripe] signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    // Card payments are paid at completion; delayed methods (e.g. bank debits) settle later.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      try {
        const updated = await markPaidFromSession(event.data.object);
        if (!updated) console.info("[stripe] nothing to update for", event.data.object.id);
      } catch (err) {
        console.error("[stripe] failed to mark paid", err);
        return new Response("DB error", { status: 500 }); // 5xx → Stripe retries
      }
      break;
    }
    default:
      // Acknowledge everything else so Stripe doesn't retry.
      break;
  }

  return Response.json({ received: true });
}
