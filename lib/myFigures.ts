"use client";

import { useSyncExternalStore } from "react";

/**
 * Remembers which figures were made (or opened) in this browser, so people can find them
 * again without an account. Stored in localStorage: it stays on this device only and is
 * never sent to the server on its own. Only figure IDs are stored; names, images and paid
 * status are looked up from the server when shown.
 */
const KEY = "petfigure:figures:v1";
const MAX_SAVED = 30;
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SavedFigure = { id: string; savedAt: number };

const EMPTY: SavedFigure[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedList: SavedFigure[] = EMPTY;

function read(): SavedFigure[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY; // storage blocked (private mode, disabled cookies)
  }
  if (raw === cachedRaw) return cachedList; // same snapshot object while unchanged
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedList = Array.isArray(parsed)
      ? parsed.filter((f): f is SavedFigure => typeof f?.id === "string" && ID_RE.test(f.id) && typeof f.savedAt === "number")
      : EMPTY;
  } catch {
    cachedList = EMPTY;
  }
  return cachedList;
}

function write(list: SavedFigure[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the list just won't persist.
  }
  listeners.forEach((l) => l());
}

/** Adds a figure to the top of this browser's list (or moves it there). */
export function rememberFigure(id: string) {
  if (!ID_RE.test(id)) return;
  const rest = read().filter((f) => f.id !== id);
  write([{ id, savedAt: Date.now() }, ...rest].slice(0, MAX_SAVED));
}

/** Removes figures from this browser's list (the figures themselves are not deleted). */
export function forgetFigures(ids: string[]) {
  const drop = new Set(ids);
  const list = read();
  if (list.some((f) => drop.has(f.id))) write(list.filter((f) => !drop.has(f.id)));
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Keep other open tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** This browser's saved figures, newest first. Empty during server rendering. */
export function useSavedFigures(): SavedFigure[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
