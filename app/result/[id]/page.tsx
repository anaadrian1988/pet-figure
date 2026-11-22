import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGeneration } from "@/lib/supabase";
import { getPreset } from "@/lib/presets";
import { PRICE_LABEL } from "@/lib/price";
import { startCheckout } from "./actions";
import PaymentPoller from "./PaymentPoller";
import { markPaidFromSession, stripe } from "@/lib/stripe";

const PRICE = PRICE_LABEL;

export async function generateMetadata({ params }: PageProps<"/result/[id]">): Promise<Metadata> {
  const { id } = await params;
  const gen = await getGeneration(id);
  if (!gen) return { title: "Figure not found · PetFigure" };
  return {
    title: `${gen.pet_name} the Action Figure · PetFigure`,
    openGraph: { images: [gen.preview_url] },
    robots: { index: false },
  };
}

export default function ResultPage(props: PageProps<"/result/[id]">) {
  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-xl">
          Pet<span className="text-toy-red">Figure</span>
        </Link>
      </header>
      <Suspense fallback={<ResultSkeleton />}>
        <Result {...props} />
      </Suspense>
    </main>
  );
}

async function Result({ params, searchParams }: PageProps<"/result/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const gen = await getGeneration(id);
  if (!gen) notFound();

  const preset = getPreset(gen.preset);
  const justPaid = sp.checkout === "success";

  // Coming back from Stripe: confirm the session directly so the unlock doesn't wait on the webhook.
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  if (!gen.is_paid && sessionId?.startsWith("cs_")) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.generation_id === gen.id && session.payment_status === "paid") {
        await markPaidFromSession(session);
        gen.is_paid = true;
      }
    } catch (err) {
      console.error("[result] could not confirm Stripe session", err);
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-8 px-4 pb-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
      {/* Figure */}
      <div className="relative mx-auto w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gen.preview_url}
          alt={`${gen.pet_name} as a ${preset?.label ?? ""} action figure`}
          width={896}
          height={1152}
          className="w-full rounded-3xl border-4 border-ink bg-white toy-shadow-lg"
        />
        {!gen.is_paid && (
          <span className="absolute -right-2 -top-3 rotate-6 rounded-full border-2 border-ink bg-toy-yellow px-3 py-1 text-xs font-black uppercase">
            Preview
          </span>
        )}
      </div>

      {/* Offer */}
      <div className="md:sticky md:top-6">
        {gen.is_paid ? (
          <div className="rounded-3xl border-4 border-ink bg-white p-6 toy-shadow-lg">
            <p className="font-display text-sm text-toy-red">Unlocked 🎉</p>
            <h1 className="mt-1 font-display text-3xl leading-tight">{gen.pet_name} is ready!</h1>
            <p className="mt-2 text-ink/75">Your HD figure has no watermark and is ready to print, frame or share.</p>
            <a
              href={`/api/download/${gen.id}`}
              className="mt-6 block rounded-2xl border-4 border-ink bg-toy-red px-6 py-4 text-center font-display text-lg text-white toy-shadow transition active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              Download HD PNG ↓
            </a>
            <Link href="/#make" className="mt-4 block text-center text-sm font-semibold underline underline-offset-4">
              Make another figure
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {justPaid && <PaymentPoller />}
            <div className="rounded-3xl border-4 border-ink bg-white p-6 toy-shadow-lg">
              <p className="font-display text-sm text-toy-red">Meet your figure</p>
              <h1 className="mt-1 font-display text-3xl leading-tight">
                {gen.pet_name}, {preset?.tagline ?? "Collector Edition"}
              </h1>
              <p className="mt-2 text-ink/75">Love it? Unlock the full-quality version without the watermark.</p>

              <ul className="mt-5 space-y-2 text-sm font-semibold">
                <li>✅ Crisp 896×1152 HD PNG</li>
                <li>✅ No watermark</li>
                <li>✅ Instant download, yours forever</li>
                <li>✅ Perfect for prints, mugs &amp; gifts</li>
              </ul>

              <form action={startCheckout} className="mt-6">
                <input type="hidden" name="id" value={gen.id} />
                <button
                  type="submit"
                  className="w-full rounded-2xl border-4 border-ink bg-toy-red px-6 py-4 font-display text-lg text-white toy-shadow transition active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Unlock HD · {PRICE}
                </button>
              </form>
              <p className="mt-3 text-center text-xs text-ink/60">One-time payment · Secure checkout by Stripe · Pay in your local currency</p>
            </div>

            <Link href="/#make" className="block text-center text-sm font-semibold underline underline-offset-4">
              Try a different accessory pack
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function ResultSkeleton() {
  return (
    <section className="mx-auto grid max-w-5xl gap-8 px-4 pb-16 md:grid-cols-2">
      <div className="mx-auto aspect-[896/1152] w-full max-w-md animate-pulse rounded-3xl border-4 border-ink/20 bg-white" />
      <div className="h-80 animate-pulse rounded-3xl border-4 border-ink/20 bg-white" />
    </section>
  );
}
