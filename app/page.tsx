import GeneratorForm from "@/components/GeneratorForm";

const PRICE = process.env.NEXT_PUBLIC_PRICE_LABEL ?? "$4.99";

function MockCard({ name, emoji, tag, rotate, className = "" }: { name: string; emoji: string; tag: string; rotate: string; className?: string }) {
  return (
    <div
      className={`relative aspect-[896/1152] w-40 shrink-0 overflow-hidden rounded-2xl border-4 border-ink bg-toy-blue toy-shadow sm:w-48 ${rotate} ${className}`}
      aria-hidden
    >
      <div className="bg-toy-red px-2 pb-3 pt-2 text-center [clip-path:polygon(0_0,100%_0,100%_80%,50%_100%,0_80%)]">
        <div className="mx-auto mb-1 h-2 w-10 rounded-full bg-ink/70" />
        <p className="text-[8px] font-bold tracking-[0.2em] text-toy-yellow">★ COLLECTOR SERIES ★</p>
        <p className="font-display text-xl leading-tight text-white [text-shadow:2px_2px_0_#141414]">{name}</p>
      </div>
      <div className="mx-4 mt-3 grid aspect-square place-items-center rounded-[40%] border-2 border-white/60 bg-white/25 text-6xl">
        {emoji}
      </div>
      <div className="absolute right-1 top-[34%] grid h-14 w-14 rotate-12 place-items-center rounded-full border-2 border-ink bg-toy-yellow p-1 text-center text-[7px] font-black leading-tight">
        {tag}
      </div>
      <div className="absolute bottom-2 left-2 rounded-md border-2 border-ink bg-white px-1.5 py-0.5 text-center font-black leading-none">
        <span className="block text-[6px] text-toy-red">AGE</span>
        <span className="text-xs">4</span>
      </div>
    </div>
  );
}

const STEPS = [
  { emoji: "📸", title: "Snap a photo", body: "Any clear photo of your dog, cat, bunny, you name it." },
  { emoji: "🎒", title: "Pick a pack", body: "Superhero, astronaut, wizard and more. Every pack comes with its own accessories." },
  { emoji: "📦", title: "Get your figure", body: `See a free preview in about 30 seconds. Unlock the clean HD file for ${PRICE}.` },
];

const FAQ = [
  {
    q: "Is it really free to try?",
    a: `Yes. You get 2 free watermarked previews a day. You only pay (${PRICE}, one time) if you love it and want the HD file with no watermark.`,
  },
  { q: "What do I get when I unlock?", a: "A crisp 896×1152 PNG with no watermark, ready to print, frame or post." },
  { q: "What photos work best?", a: "Bright, in focus, with your pet's face clearly visible. One pet per photo for now." },
  { q: "What happens to my photo?", a: "It's only used to make your figure. We never sell it or use it for anything else." },
];

export default function Home() {
  return (
    <main className="flex-1 pb-24 sm:pb-0">
      {/* Top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-display text-xl">
          Pet<span className="text-toy-red">Figure</span>
        </span>
        <a href="#make" className="rounded-full border-2 border-ink bg-white px-4 py-1.5 text-sm font-bold toy-shadow">
          Try free
        </a>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl gap-10 px-4 pb-12 pt-4 md:grid-cols-2 md:items-start md:pt-10">
        <div>
          <p className="inline-block -rotate-2 rounded-full border-2 border-ink bg-toy-yellow px-3 py-1 text-xs font-black uppercase tracking-wider">
            New · Limited edition: your pet
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">
            Turn your pet into a <span className="text-toy-red">real action figure</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink/80">
            Upload one photo and get your best friend shrink-wrapped in their own retro toy box, with a name, accessories and all.
          </p>

          <p className="mt-6 text-sm font-semibold">🐶 Dogs · 🐱 Cats · 🐰 Bunnies · 🦜 Birds · 🐹 and more</p>

          {/* Card fan */}
          <div className="relative mt-8 flex justify-center md:justify-start">
            <MockCard name="BISCUIT" emoji="🐶" tag="SUPER HERO EDITION" rotate="-rotate-6" className="z-10" />
            <MockCard name="LUNA" emoji="🐱" tag="SPACE EXPLORER" rotate="rotate-3 -ml-8 mt-6" />
            <MockCard name="WAFFLES" emoji="🐰" tag="MAGIC MASTER" rotate="-rotate-2 -ml-8 hidden sm:block" />
          </div>
        </div>

        <div id="make" className="scroll-mt-4">
          <GeneratorForm />
        </div>
      </section>

      {/* How it works */}
      <section className="border-y-4 border-ink bg-toy-yellow halftone">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-center font-display text-2xl sm:text-3xl">Easy as 1, 2, 3</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border-4 border-ink bg-white p-5 toy-shadow">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-toy-red font-display text-white">
                    {i + 1}
                  </span>
                  <span className="text-2xl">{s.emoji}</span>
                </div>
                <h3 className="mt-3 font-display text-lg">{s.title}</h3>
                <p className="mt-1 text-sm text-ink/75">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["🆓", "Free preview", "No card, no sign-up"],
            ["⚡", "~30 seconds", "From photo to figure"],
            ["🔒", "Secure checkout", "Powered by Stripe"],
            ["🖼️", "Print-ready HD", "Instant PNG download"],
          ].map(([icon, title, body]) => (
            <li key={title} className="rounded-2xl border-4 border-ink bg-white p-4 text-center">
              <div className="text-2xl">{icon}</div>
              <p className="mt-1 font-display text-sm">{title}</p>
              <p className="text-xs text-ink/60">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <h2 className="text-center font-display text-2xl">Questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border-4 border-ink bg-white p-4 open:toy-shadow">
              <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                {f.q}
                <span className="ml-3 text-xl transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-ink/75">{f.a}</p>
            </details>
          ))}
        </div>
        <a
          href="#make"
          className="mt-10 block rounded-2xl border-4 border-ink bg-toy-red px-6 py-4 text-center font-display text-lg text-white toy-shadow"
        >
          Make my pet&apos;s figure →
        </a>
      </section>

      <footer className="border-t-4 border-ink py-6 text-center text-xs text-ink/60">
        © PetFigure · Made with 🐾
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-ink bg-cream/95 p-3 backdrop-blur sm:hidden">
        <a href="#make" className="block rounded-xl border-4 border-ink bg-toy-red py-3 text-center font-display text-white toy-shadow">
          Try it free in 30s →
        </a>
      </div>
    </main>
  );
}
