"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESETS } from "@/lib/presets";
import PhotoFramer, { cropToFile, DEFAULT_FRAMING, type Framing } from "@/components/PhotoFramer";

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
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const previewSrc = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (previewSrc && URL.revokeObjectURL(previewSrc)), [previewSrc]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 5000);
    return () => clearInterval(t);
  }, [busy]);

  function pickFile(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("That doesn't look like a photo.");
    if (f.size > MAX_ORIGINAL_BYTES) return setError("Photo must be under 25 MB.");
    setFraming(DEFAULT_FRAMING);
    setPhotoSize(null);
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Add a photo of your pet first.");
    if (!petName.trim()) return setError("What's your pet's name?");
    if (!photoSize || !previewSrc) return setError("Your photo is still loading. Try again in a second.");

    // Send only the framed area; fall back to the original if this browser can't crop it.
    const cropped = photoSize === "unsupported" ? null : await cropToFile(previewSrc, photoSize, framing);
    const photo = cropped ?? file;
    if (!cropped && photo.size > MAX_UPLOAD_BYTES) {
      return setError("This photo is too large to send as-is. Try a JPG or PNG under 10 MB.");
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
      router.push(`/result/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="rounded-3xl border-4 border-ink bg-white p-8 text-center toy-shadow-lg" role="status" aria-live="polite">
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
          className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-4 border-dashed border-ink/40 bg-cream halftone transition hover:border-ink"
        >
          <span className="flex flex-col items-center gap-2 px-6 text-center">
            <span className="text-4xl">📸</span>
            <span className="font-semibold">Tap to add a photo</span>
            <span className="text-xs text-ink/60">Then drag it so your pet&apos;s face is in the oval</span>
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
            onChange={(e) => setPetName(e.target.value)}
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
            onChange={(e) => setAge(e.target.value)}
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
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
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
                onChange={() => setPreset(p.id)}
                className="sr-only"
              />
              <span className="text-2xl" aria-hidden>
                {p.emoji}
              </span>
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="mt-5 rounded-xl border-2 border-toy-red bg-toy-red/10 px-4 py-3 text-sm font-semibold text-toy-red" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-6 w-full rounded-2xl border-4 border-ink bg-toy-red px-6 py-4 font-display text-lg text-white toy-shadow transition active:translate-x-1 active:translate-y-1 active:shadow-none"
      >
        Make my figure, free →
      </button>
      <p className="mt-3 text-center text-xs text-ink/60">Free preview · No sign-up · 2 free tries per day</p>
    </form>
  );
}
