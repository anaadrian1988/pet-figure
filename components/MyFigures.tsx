"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FigureSummary } from "@/app/api/figures/route";
import { forgetFigures, rememberFigure, useSavedFigures } from "@/lib/myFigures";

type Props = {
  /** Figure currently on screen; it's left out of the strip. */
  excludeId?: string;
  title: string;
};

/**
 * A strip of the figures made in this browser, each linking back to its page,
 * so people can return to one (and pay for it) after closing the tab or trying another pack.
 * Renders nothing until there's at least one figure to show.
 */
export default function MyFigures({ excludeId, title }: Props) {
  const saved = useSavedFigures();
  const idsKey = saved.map((f) => f.id).join(",");
  const [figures, setFigures] = useState<FigureSummary[]>([]);

  useEffect(() => {
    if (!idsKey) return;
    const controller = new AbortController();
    fetch(`/api/figures?ids=${idsKey}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(({ figures }: { figures: FigureSummary[] }) => {
        setFigures(figures);
        // Drop figures that no longer exist on the server.
        const found = new Set(figures.map((f) => f.id));
        forgetFigures(idsKey.split(",").filter((id) => !found.has(id)));
      })
      .catch(() => {
        // Network error: keep whatever we showed before; the list is a convenience.
      });
    return () => controller.abort();
  }, [idsKey]);

  const shown = idsKey ? figures.filter((f) => f.id !== excludeId && idsKey.includes(f.id)) : [];
  if (shown.length === 0) return null;

  return (
    <section aria-label={title} className="mx-auto w-full max-w-5xl px-4">
      <h2 className="font-display text-lg">{title}</h2>
      <p className="text-xs text-ink/60">Tap one to go back to it · saved on this device</p>
      <ul className="-mx-4 mt-1 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-3">
        {shown.map((f) => (
          // The hover lift is on the <li> so the card and its × move together.
          <li key={f.id} className="relative w-28 shrink-0 snap-start transition hover:-translate-y-0.5 sm:w-32">
            <Link
              href={`/result/${f.id}`}
              className="block overflow-hidden rounded-xl border-4 border-ink bg-white toy-shadow"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.previewUrl} alt={`${f.petName} figure`} width={896} height={1152} loading="lazy" className="aspect-[896/1152] w-full object-cover" />
              <div className="border-t-4 border-ink px-2 py-1.5">
                <p className="truncate text-xs font-bold">{f.petName}</p>
                <p className={`text-[10px] font-black uppercase ${f.isPaid ? "text-green-700" : "text-toy-red"}`}>
                  {f.isPaid ? "Unlocked ✓" : "Preview"}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => forgetFigures([f.id])}
              aria-label={`Remove ${f.petName} from this list`}
              title="Remove from this list"
              className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full border-2 border-ink bg-white text-xs font-black transition hover:bg-toy-red hover:text-white"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Adds the figure being viewed to this browser's list (e.g. when opened from an email link). */
export function RememberFigure({ id }: { id: string }) {
  useEffect(() => {
    rememberFigure(id);
  }, [id]);
  return null;
}
