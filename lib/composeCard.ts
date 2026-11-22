import "server-only";
import sharp, { type OverlayOptions } from "sharp";
import { capHeight, drawableText, fitFontSize, measureText, textPathData } from "@/lib/textPath";

export const CARD_WIDTH = 896;
export const CARD_HEIGHT = 1152;
const HEADER_HEIGHT = 236;

export type ComposeCardOptions = {
  /** Pet's name, shown as the toy's product name. */
  petName: string;
  /** Short line shown in the starburst badge, e.g. "Super Hero Edition". */
  tagline: string;
  /** Text for the age badge, e.g. "3+" or "4". */
  ageLabel: string;
  /** Adds a diagonal repeating "PREVIEW" watermark across the card. */
  watermark?: boolean;
  /** Output format. Defaults to PNG. */
  format?: "png" | "webp" | "jpeg";
};

/**
 * All text on the card is converted to vector paths with a bundled font (see lib/textPath.ts),
 * so the result doesn't depend on fonts being installed on the server.
 */

/** Points for an N-pointed star or starburst centred on (cx, cy). */
function starPoints(cx: number, cy: number, outer: number, inner: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Splits a tagline into one or two balanced lines for the starburst. */
function taglineLines(tag: string): string[] {
  const words = tag.split(" ");
  if (words.length < 2 || tag.length <= 9) return [tag];
  let best = [tag];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

function headerSvg({ petName, tagline, ageLabel }: ComposeCardOptions): string {
  const W = CARD_WIDTH;
  const name = drawableText(petName.toUpperCase()) || "MY PET";
  const tag = drawableText(tagline.toUpperCase());
  const age = drawableText(ageLabel.toUpperCase()) || "3+";

  // "★ COLLECTOR SERIES ★" kicker (stars drawn as shapes; the font has no ★).
  const kickerSize = 22;
  const kickerSpacing = 5;
  const kickerBaseline = 92;
  const kicker = "COLLECTOR SERIES";
  const kickerHalf = measureText(kicker, kickerSize, kickerSpacing) / 2;
  const kickerMid = kickerBaseline - capHeight(kickerSize) / 2;

  // Pet name: as large as fits on one line; long names with spaces wrap onto two lines.
  const nameMaxWidth = W - 150;
  const nameMid = 156;
  const oneLineSize = fitFontSize(name, nameMaxWidth, 100, 8);
  const twoLines = oneLineSize < 52 && name.includes(" ") ? taglineLines(name) : null;
  const nameSize = twoLines
    ? Math.min(54, ...twoLines.map((l) => fitFontSize(l, nameMaxWidth, 54, 8)))
    : oneLineSize;
  const nameLines = twoLines ?? [name];
  const nameGap = nameSize * 1.12;

  // Tagline inside the starburst (top-right), up to two lines.
  const burstX = W - 112;
  const burstY = 300;
  const lines = taglineLines(tag);
  const tagSize = Math.min(...lines.map((l) => fitFontSize(l, 132, 24, 11)));
  const lineGap = tagSize * 1.25;

  // Age badge (bottom-left).
  const ageSize = fitFontSize(age, 118, 40, 16);

  return `
<svg width="${W}" height="${CARD_HEIGHT}" viewBox="0 0 ${W} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hdr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff3b30"/>
      <stop offset="1" stop-color="#c81d25"/>
    </linearGradient>
    <pattern id="rays" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
      <rect width="14" height="28" fill="#ffffff" fill-opacity="0.07"/>
    </pattern>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="0" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Card frame -->
  <rect x="6" y="6" width="${W - 12}" height="${CARD_HEIGHT - 12}" rx="28" fill="none" stroke="#111" stroke-width="12"/>
  <rect x="18" y="18" width="${W - 36}" height="${CARD_HEIGHT - 36}" rx="20" fill="none" stroke="#ffd60a" stroke-width="6"/>

  <!-- Header band -->
  <path d="M18 38 Q18 18 38 18 H${W - 38} Q${W - 18} 18 ${W - 18} 38 V${HEADER_HEIGHT - 30} L${W / 2} ${HEADER_HEIGHT} L18 ${HEADER_HEIGHT - 30} Z" fill="url(#hdr)"/>
  <path d="M18 38 Q18 18 38 18 H${W - 38} Q${W - 18} 18 ${W - 18} 38 V${HEADER_HEIGHT - 30} L${W / 2} ${HEADER_HEIGHT} L18 ${HEADER_HEIGHT - 30} Z" fill="url(#rays)"/>
  <path d="M18 ${HEADER_HEIGHT - 30} L${W / 2} ${HEADER_HEIGHT} L${W - 18} ${HEADER_HEIGHT - 30}" fill="none" stroke="#111" stroke-width="8" stroke-linejoin="round"/>

  <!-- Hang tab -->
  <rect x="${W / 2 - 70}" y="30" width="140" height="30" rx="15" fill="#111" fill-opacity="0.85"/>
  <rect x="${W / 2 - 52}" y="38" width="104" height="14" rx="7" fill="#c81d25"/>

  <!-- Kicker -->
  <path d="${textPathData(kicker, { x: W / 2, y: kickerBaseline, size: kickerSize, letterSpacing: kickerSpacing })}" fill="#ffd60a"/>
  <polygon points="${starPoints(W / 2 - kickerHalf - 22, kickerMid, 11, 4.5, 5)}" fill="#ffd60a"/>
  <polygon points="${starPoints(W / 2 + kickerHalf + 22, kickerMid, 11, 4.5, 5)}" fill="#ffd60a"/>

  <!-- Pet name -->
  <g filter="url(#shadow)">
    ${nameLines
      .map((l, i) => {
        const baseline = nameMid + (i - (nameLines.length - 1) / 2) * nameGap + capHeight(nameSize) / 2;
        return `<path d="${textPathData(l, { x: W / 2, y: baseline, size: nameSize })}"
      fill="#ffffff" stroke="#111" stroke-width="${nameSize > 60 ? 10 : 7}" paint-order="stroke" stroke-linejoin="round"/>`;
      })
      .join("\n    ")}
  </g>

  <!-- Tagline starburst -->
  <g transform="rotate(12 ${burstX} ${burstY})">
    <polygon points="${starPoints(burstX, burstY, 96, 78, 18)}" fill="#ffd60a" stroke="#111" stroke-width="6" stroke-linejoin="round"/>
    ${lines
      .map((l, i) => {
        const baseline = burstY + (i - (lines.length - 1) / 2) * lineGap + capHeight(tagSize) / 2;
        return `<path d="${textPathData(l, { x: burstX, y: baseline, size: tagSize })}" fill="#111"/>`;
      })
      .join("\n    ")}
  </g>

  <!-- Age badge -->
  <g transform="translate(46 ${CARD_HEIGHT - 150})">
    <rect width="150" height="104" rx="14" fill="#111"/>
    <rect x="6" y="6" width="138" height="92" rx="10" fill="#ffffff"/>
    <path d="${textPathData("AGE", { x: 75, y: 30 + capHeight(18) / 2, size: 18, letterSpacing: 3 })}" fill="#c81d25"/>
    <path d="${textPathData(age, { x: 75, y: 68 + capHeight(ageSize) / 2, size: ageSize })}" fill="#111"/>
  </g>
</svg>`;
}

function watermarkSvg(): string {
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;
  const word = textPathData("PREVIEW", { x: 0, y: 0, size: 68, anchor: "start", letterSpacing: 8 });
  const uses: string[] = [];
  for (let y = -H; y < H * 2; y += 170) {
    const offset = Math.round(y / 170) % 2 === 0 ? 0 : 320;
    for (let x = -W; x < W * 2; x += 640) {
      uses.push(`<use href="#wm" xlink:href="#wm" x="${x + offset}" y="${y}"/>`);
    }
  }
  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs><path id="wm" d="${word}"/></defs>
  <g transform="rotate(-30 ${W / 2} ${H / 2})" fill="#ffffff" fill-opacity="0.38" stroke="#000000" stroke-opacity="0.22" stroke-width="2">
    ${uses.join("\n    ")}
  </g>
</svg>`;
}

/**
 * Builds the final action-figure card: resizes the generated image to 896x1152,
 * overlays the retro toy header (name, tagline starburst, age badge) and,
 * optionally, a diagonal "PREVIEW" watermark.
 */
export async function composeCard(image: Buffer, opts: ComposeCardOptions): Promise<Buffer> {
  const layers: OverlayOptions[] = [{ input: Buffer.from(headerSvg(opts)), top: 0, left: 0 }];
  if (opts.watermark) {
    layers.push({ input: Buffer.from(watermarkSvg()), top: 0, left: 0 });
  }

  const pipeline = sharp(image)
    .rotate() // respect EXIF orientation
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover", position: "centre" })
    .composite(layers);

  switch (opts.format ?? "png") {
    case "webp":
      return pipeline.webp({ quality: 78 }).toBuffer();
    case "jpeg":
      return pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    default:
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
  }
}
