"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Width / height of the framing window and of the cropped photo sent to the server. */
const ASPECT = 4 / 5;
const OUTPUT_WIDTH = 1024;
const MAX_ZOOM = 4;

/** Where the photo sits inside the frame, as fractions of the image (resize-independent). */
export type Framing = { cx: number; cy: number; zoom: number };
export const DEFAULT_FRAMING: Framing = { cx: 0.5, cy: 0.5, zoom: 1 };

type Props = {
  src: string;
  framing: Framing;
  onChange: (f: Framing) => void;
  /** Called with the image's natural size once loaded, or null if the browser can't show it (e.g. HEIC). */
  onLoad: (size: { w: number; h: number } | null) => void;
  /** Photo-related error, shown in place of the hint. */
  error?: string | null;
};

/** Fraction of the image visible across the frame, for a given zoom. */
function visibleFraction(nat: { w: number; h: number }, zoom: number) {
  // "cover" scale: the image always fills the frame at zoom 1.
  const imgAspect = nat.w / nat.h;
  const fw = imgAspect > ASPECT ? ASPECT / imgAspect : 1;
  const fh = imgAspect > ASPECT ? 1 : imgAspect / ASPECT;
  return { fw: fw / zoom, fh: fh / zoom };
}

function clamp(f: Framing, nat: { w: number; h: number }): Framing {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, f.zoom));
  const { fw, fh } = visibleFraction(nat, zoom);
  return {
    zoom,
    cx: Math.min(1 - fw / 2, Math.max(fw / 2, f.cx)),
    cy: Math.min(1 - fh / 2, Math.max(fh / 2, f.cy)),
  };
}

/**
 * Lets the user drag and zoom their photo so the pet's face sits inside the guide.
 * Mouse drag, touch drag, pinch, mouse wheel and the slider all work.
 */
export default function PhotoFramer({ src, framing, onChange, onLoad, error }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [frameW, setFrameW] = useState(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  // Latest framing for event handlers (pointer moves can fire faster than React re-renders).
  const latest = useRef(framing);
  useEffect(() => {
    latest.current = framing;
  }, [framing]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrameW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const update = useCallback(
    (f: Framing) => {
      if (!nat) return;
      const next = clamp(f, nat);
      latest.current = next;
      onChange(next);
    },
    [nat, onChange],
  );

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: latest.current.zoom };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !nat || !frameW) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      update({ ...latest.current, zoom: (pinchStart.current.zoom * dist) / pinchStart.current.dist });
      return;
    }

    // Convert the pointer movement into a shift of the visible window, in image fractions.
    const { fw, fh } = visibleFraction(nat, latest.current.zoom);
    const frameH = frameW / ASPECT;
    update({
      ...latest.current,
      cx: latest.current.cx - ((e.clientX - prev.x) / frameW) * fw,
      cy: latest.current.cy - ((e.clientY - prev.y) / frameH) * fh,
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  // Wheel zoom needs a non-passive listener so the page doesn't scroll at the same time.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      update({ ...latest.current, zoom: latest.current.zoom * Math.exp(-e.deltaY * 0.0015) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [update]);

  // Position the <img> so that (cx, cy) of the image sits at the centre of the frame.
  let imgStyle: React.CSSProperties = { opacity: 0 };
  if (nat && frameW) {
    const { fw } = visibleFraction(nat, framing.zoom);
    const dispW = frameW / fw;
    const dispH = dispW * (nat.h / nat.w);
    const frameH = frameW / ASPECT;
    imgStyle = {
      width: dispW,
      height: dispH,
      left: frameW / 2 - framing.cx * dispW,
      top: frameH / 2 - framing.cy * dispH,
      maxWidth: "none",
    };
  }

  return (
    <div>
      <div
        ref={frameRef}
        className="relative aspect-[4/5] w-full cursor-grab touch-none select-none overflow-hidden rounded-2xl border-4 border-ink bg-ink active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Your pet"
          draggable={false}
          className="absolute"
          style={imgStyle}
          onLoad={(e) => {
            const size = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
            setNat(size);
            onLoad(size);
            onChange(clamp(latest.current, size));
          }}
          onError={() => onLoad(null)}
        />

        {/* Frame guide: four corner brackets. The whole frame is what gets sent, so the pet
            just needs to fill it; there's no spot the face has to hit. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden>
          <g
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" }}
          >
            <path d="M22 68 L22 22 L68 22" />
            <path d="M378 68 L378 22 L332 22" />
            <path d="M22 432 L22 478 L68 478" />
            <path d="M378 432 L378 478 L332 478" />
          </g>
        </svg>
        {error ? (
          <p
            role="alert"
            className="pointer-events-none absolute bottom-7 left-1/2 w-max max-w-[80%] -translate-x-1/2 rounded-full bg-toy-red px-3 py-1 text-center text-xs font-bold text-white shadow-[2px_2px_0_#141414]"
          >
            {error}
          </p>
        ) : (
          <p className="pointer-events-none absolute bottom-7 left-1/2 w-max max-w-[80%] -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-center text-xs font-bold text-white">
            Drag &amp; zoom to fit your pet
          </p>
        )}
      </div>

      <label className="mt-3 flex items-center gap-3 text-xs font-bold">
        <span aria-hidden>➖</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={framing.zoom}
          onChange={(e) => update({ ...framing, zoom: Number(e.target.value) })}
          className="w-full accent-[var(--toy-red)]"
          aria-label="Zoom"
        />
        <span aria-hidden>➕</span>
      </label>
    </div>
  );
}

/**
 * Crops the framed area out of the photo in the browser and returns it as a JPEG file.
 * Returns null if the browser can't decode the photo (the original is uploaded instead).
 */
export async function cropToFile(src: string, nat: { w: number; h: number }, framing: Framing): Promise<File | null> {
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
  } catch {
    return null;
  }

  const { fw, fh } = visibleFraction(nat, framing.zoom);
  const sw = fw * nat.w;
  const sh = fh * nat.h;
  const sx = (framing.cx - fw / 2) * nat.w;
  const sy = (framing.cy - fh / 2) * nat.h;

  // Never upscale: small photos keep their own resolution.
  const outW = Math.round(Math.min(OUTPUT_WIDTH, sw));
  const outH = Math.round(outW / ASPECT);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  return blob ? new File([blob], "pet.jpg", { type: "image/jpeg" }) : null;
}
