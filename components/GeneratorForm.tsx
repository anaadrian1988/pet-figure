"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, POPULAR_PACK_IDS, PRESETS, type PackCategory } from "@/lib/presets";

type PackTab = "popular" | PackCategory;
const PACK_TABS: { id: PackTab; label: string }[] = [{ id: "popular", label: "Popular" }, ...CATEGORIES];

function packsInTab(tab: PackTab) {
  return tab === "popular"
    ? POPULAR_PACK_IDS.map((id) => PRESETS.find((p) => p.id === id)!).filter(Boolean)
    : PRESETS.filter((p) => p.category === tab);
}

/** Tiles in the biggest tab, rounded up to full rows: every tab reserves this many slots,
 * so the pack area keeps the same height and nothing below it moves when switching tabs. */
const PACK_SLOTS = Math.ceil(Math.max(...PACK_TABS.map((t) => packsInTab(t.id).length)) / 3) * 3;
import PhotoFramer, { cropToFile, DEFAULT_FRAMING, type Framing } from "@/components/PhotoFramer";
import { rememberFigure } from "@/lib/myFigures";

/** Originals can be large because we crop and shrink them in the browser before upload. */
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
/** Limit when the browser can't crop the photo (e.g. HEIC on desktop Chrome) and sends it as-is. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const LOADING_STEPS = [
  "Sniffing out your pet's best side…",
  "Melting the plastic…",
  "Painting every whisker…",
  "Snapping on the accessories…",
  "Sealing the blister pack…",
  "Printing the box art…",
];

export default function GeneratorForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [framing, setFraming] = useState<Framing>(DEFAULT_FRAMING);
  /** Natural size once the photo loads; "unsupported" if this browser can't display it. */
  const [photoSize, setPhotoSize] = useState<{ w: number; h: number } | "unsupported" | null>(null);
  const [petName, setPetName] = useState("");
  const [age, setAge] = useState("");
  /** Chosen pack id; "" means none (switching category clears it). Starts on the first pack. */
  const [preset, setPreset] = useState<string>(PRESETS[0].id);
  const [tab, setTab] = useState<PackTab>("popular");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // In-memory URL for showing the picked photo. It's released only when a different photo is
  // picked, not in an effect cleanup: Next.js runs cleanups when it hides this page during
  // navigation, which would break the photo when the user comes back.
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 5000);
    return () => clearInterval(t);
  }, [busy]);

  // The progress card is much shorter than the form it replaces, so bring it into view.
  const progressRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!busy || !progressRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    progressRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }, [busy]);

  // Error messages sit near the bottom of the form, often off-screen (e.g. after the progress
  // card disappears), so scroll each one into view. The counter re-triggers this even when
  // the same message is shown twice in a row.
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [errorCount, setErrorCount] = useState(0);
  function fail(message: string) {
    setError(message);
    setErrorCount((n) => n + 1);
  }
  useEffect(() => {
    if (!errorCount || !errorRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    errorRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }, [errorCount]);

  // Next.js keeps this page alive (hidden) after navigating to the result page, so the
  // "building" state would still be showing when the user comes back. Once a generation
  // has succeeded, clear it as the page is hidden. The photo, framing, name and age are
  // kept on purpose so "Try a different accessory pack" only needs a new pack.
  const resetAfterSuccess = useRef(false);
  useLayoutEffect(() => {
    return () => {
      if (!resetAfterSuccess.current) return;
      resetAfterSuccess.current = false;
      setBusy(false);
      setStep(0);
      setError(null);
    };
  }, []);

  // An error message describes the last attempt; any change to the form clears it
  // (it shows again on the next submit if the problem is still there).
  function pickFile(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) return fail("That doesn't look like a photo.");
    if (f.size > MAX_ORIGINAL_BYTES) return fail("Photo must be under 25 MB.");
    setFraming(DEFAULT_FRAMING);
    setPhotoSize(null);
    setFile(f);
    setPreviewSrc((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return fail("Add a photo of your pet first.");
    if (!petName.trim()) return fail("What's your pet's name?");
    if (!preset) return fail("Pick an accessory pack.");
    if (!photoSize || !previewSrc) return fail("Your photo is still loading. Try again in a second.");

    // Send only the framed area; fall back to the original if this browser can't crop it.
    const cropped = photoSize === "unsupported" ? null : await cropToFile(previewSrc, photoSize, framing);
    const photo = cropped ?? file;
    if (!cropped && photo.size > MAX_UPLOAD_BYTES) {
      return fail("This photo is too large to send as-is. Try a JPG or PNG under 10 MB.");
    }

    const body = new FormData();
    body.set("photo", photo);
    body.set("petName", petName.trim());
    body.set("preset", preset);
    if (age.trim()) body.set("age", age.trim());

    setStep(0);
    setBusy(true);
    try {
      const res = await fetch("/api/generate", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
      rememberFigure(json.id);
      resetAfterSuccess.current = true;
      router.push(`/result/${json.id}`);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div
        ref={progressRef}
        className="scroll-mt-4 rounded-3xl border-4 border-ink bg-white p-8 text-center toy-shadow-lg"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-2xl border-4 border-ink bg-toy-yellow text-5xl animate-wiggle">
          {PRESETS.find((p) => p.id === preset)?.emoji ?? "🐾"}
        </div>
        <p className="font-display text-xl">Building {petName || "your pet"}…</p>
        <p className="mt-2 text-sm text-ink/70">{LOADING_STEPS[step]}</p>
        <div className="mt-6 h-3 overflow-hidden rounded-full border-2 border-ink bg-cream">
          <div
            className="h-full bg-toy-red transition-all duration-[5000ms] ease-linear"
            style={{ width: `${Math.round(((step + 1) / LOADING_STEPS.length) * 92)}%` }}
          />
        </div>
        <p className="mt-4 text-xs text-ink/60">Usually takes 20–40 seconds. Don&apos;t close this tab.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border-4 border-ink bg-white p-5 toy-shadow-lg sm:p-7">
      {/* Step 1: photo */}
      <label className="mb-2 block font-display text-sm">1 · Upload your pet</label>
      {previewSrc ? (
        <div>
          <PhotoFramer
            key={previewSrc}
            src={previewSrc}
            framing={framing}
            onChange={setFraming}
            onLoad={(size) => setPhotoSize(size ?? "unsupported")}
          />
          {photoSize === "unsupported" && (
            <p className="mt-2 text-xs text-ink/70">
              Your browser can&apos;t show this photo format, so it will be used as-is. For best results, centre your pet&apos;s face.
            </p>
          )}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-3 w-full rounded-xl border-2 border-ink bg-white py-2 text-sm font-bold"
          >
            Choose a different photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className="flex aspect-[4/3] w-full items-center md:aspect-auto md:h-[150px] justify-center overflow-hidden rounded-2xl border-4 border-dashed border-ink/40 bg-cream halftone transition hover:border-ink"
        >
          <span className="flex flex-col items-center gap-2 px-6 text-center">
            <span className="text-4xl">📸</span>
            <span className="font-semibold">Tap to add a photo</span>
            <span className="text-xs text-ink/60">Then drag &amp; zoom to fit your pet</span>
          </span>
        </button>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      {/* Step 2: name + age */}
      <div className="mt-6 grid grid-cols-[1fr_6.5rem] gap-3">
        <div>
          <label htmlFor="petName" className="mb-2 block font-display text-sm">
            2 · Name
          </label>
          <input
            id="petName"
            value={petName}
            onChange={(e) => {
              setPetName(e.target.value);
              setError(null);
            }}
            maxLength={20}
            placeholder="Biscuit"
            autoComplete="off"
            className="w-full rounded-xl border-4 border-ink bg-white px-4 py-3 text-lg font-semibold outline-none focus:bg-toy-yellow/20"
          />
        </div>
        <div>
          <label htmlFor="age" className="mb-2 block font-display text-sm">
            Age
          </label>
          <input
            id="age"
            value={age}
            onChange={(e) => {
              setAge(e.target.value);
              setError(null);
            }}
            maxLength={6}
            inputMode="numeric"
            placeholder="3"
            className="w-full rounded-xl border-4 border-ink bg-white px-4 py-3 text-lg font-semibold outline-none focus:bg-toy-yellow/20"
          />
        </div>
      </div>

      {/* Step 3: preset */}
      <fieldset className="mt-6">
        <legend className="mb-2 font-display text-sm">3 · Accessory pack</legend>

        {/* Category tabs keep the list short: only one group of packs shows at a time. */}
        <div className="mb-3 grid grid-cols-3 gap-1.5" role="tablist" aria-label="Pack categories">
          {PACK_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                // Switching category clears the pick, so only a pack visible in this tab can be selected.
                if (t.id !== tab) setPreset("");
                setTab(t.id);
                setError(null);
              }}
              className={`truncate rounded-full border-2 px-0.5 py-1 text-center text-[10px] font-bold tracking-tight transition min-[375px]:px-1 min-[375px]:text-[11px] min-[375px]:tracking-normal lg:px-2 lg:text-xs ${
                tab === t.id ? "border-ink bg-ink text-white" : "border-ink/20 bg-white hover:border-ink/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2" role="tabpanel">
          {packsInTab(tab).map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-4 px-1 py-3 text-center text-xs font-bold transition ${
                preset === p.id ? "border-ink bg-toy-yellow toy-shadow" : "border-ink/20 bg-white hover:border-ink/60"
              }`}
            >
              <input
                type="radio"
                name="preset"
                value={p.id}
                checked={preset === p.id}
                onChange={() => {
                  setPreset(p.id);
                  setError(null);
                }}
                className="sr-only"
              />
              <span className="text-2xl" aria-hidden>
                {p.emoji}
              </span>
              {p.label}
            </label>
          ))}
          {/* Invisible placeholders keep smaller tabs as tall as the biggest one. */}
          {Array.from({ length: PACK_SLOTS - packsInTab(tab).length }, (_, i) => (
            <div key={`slot-${i}`} aria-hidden className="invisible flex flex-col items-center gap-1 rounded-xl border-4 px-1 py-3 text-xs font-bold">
              <span className="text-2xl">·</span>
              ·
            </div>
          ))}
        </div>
      </fieldset>

      {error && (
        <p
          ref={errorRef}
          className="mt-5 rounded-xl border-2 border-toy-red bg-toy-red/10 px-4 py-3 text-sm font-semibold text-toy-red"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        className="cursor-paw mt-6 w-full rounded-2xl border-4 border-ink bg-toy-red px-6 py-4 font-display text-lg text-white toy-shadow transition active:translate-x-1 active:translate-y-1 active:shadow-none"
      >
        Make my figure, free →
      </button>
      <p className="mt-3 text-center text-xs text-ink/60">Free preview · No sign-up · 2 free tries per day</p>
    </form>
  );
}
