import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as opentype from "opentype.js";
import type { Font } from "opentype.js";

// opentype.js ships an ES module build (used by bundlers) and a CommonJS build (used by plain Node);
// they expose `parse` differently, so support both.
const parse: typeof opentype.parse =
  opentype.parse ?? (opentype as unknown as { default: typeof opentype }).default.parse;

/**
 * Turns text into SVG path outlines using a bundled font, so the card renders
 * identically on servers with no fonts installed (e.g. Vercel). Bungee is
 * licensed under the SIL Open Font License; see lib/fonts/OFL.txt.
 */
const FONT_FILE = path.join(process.cwd(), "lib/fonts/Bungee-Regular.ttf");

let font: Font | null = null;
function getFont(): Font {
  if (!font) {
    const buf = readFileSync(FONT_FILE);
    font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  }
  return font;
}

/** Drops characters the font can't draw (emoji, symbols) so they don't render as boxes. */
export function drawableText(s: string): string {
  const f = getFont();
  return [...s].filter((ch) => ch === " " || f.hasChar(ch)).join("").replace(/\s+/g, " ").trim();
}

/** Height of capital letters at the given size; used to centre text vertically. */
export function capHeight(size: number): number {
  const f = getFont();
  const os2 = f.tables.os2 as { sCapHeight?: number } | undefined;
  return ((os2?.sCapHeight || f.unitsPerEm * 0.72) / f.unitsPerEm) * size;
}

/** Width of the text when drawn at `size`, including kerning and extra letter spacing. */
export function measureText(text: string, size: number, letterSpacing = 0): number {
  const f = getFont();
  const glyphs = f.stringToGlyphs(text);
  const scale = size / f.unitsPerEm;
  let width = 0;
  glyphs.forEach((g, i) => {
    width += (g.advanceWidth ?? 0) * scale;
    if (i < glyphs.length - 1) width += f.getKerningValue(g, glyphs[i + 1]) * scale + letterSpacing;
  });
  return width;
}

/** Largest font size (up to `maxSize`) at which the text fits in `maxWidth`. */
export function fitFontSize(text: string, maxWidth: number, maxSize: number, minSize = 12, letterSpacing = 0): number {
  const width = measureText(text, maxSize, letterSpacing);
  if (width <= maxWidth) return maxSize;
  return Math.max(minSize, Math.floor((maxSize * maxWidth) / width));
}

type PathOptions = {
  x: number;
  /** Baseline y position. */
  y: number;
  size: number;
  anchor?: "start" | "middle" | "end";
  letterSpacing?: number;
};

/** SVG path data (`d` attribute) drawing the text. */
export function textPathData(text: string, { x, y, size, anchor = "middle", letterSpacing = 0 }: PathOptions): string {
  const f = getFont();
  const glyphs = f.stringToGlyphs(text);
  const scale = size / f.unitsPerEm;
  const width = measureText(text, size, letterSpacing);
  let cursor = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;

  let d = "";
  glyphs.forEach((g, i) => {
    d += g.getPath(cursor, y, size).toPathData(2);
    cursor += (g.advanceWidth ?? 0) * scale + letterSpacing;
    if (i < glyphs.length - 1) cursor += f.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return d;
}
