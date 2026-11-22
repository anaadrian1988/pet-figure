import "server-only";
import sharp, { type OverlayOptions } from "sharp";

export const CARD_WIDTH = 896;
export const CARD_HEIGHT = 1152;
const HEADER_HEIGHT = 236;

export type ComposeCardOptions = {
  /** Pet's name, shown as the toy's product name. */
  petName: string;
  /** Short line shown in the starburst badge, e.g. "Super Hero Edition". */
  tagline: string;
  /** Text for the age badge, e.g. "AGES 3+" or "AGE 4". */
  ageLabel: string;
  /** Adds a diagonal repeating "PREVIEW" watermark across the card. */
  watermark?: boolean;
  /** Output format. Defaults to PNG. */
  format?: "png" | "webp" | "jpeg";
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Shrinks the font so long names still fit in the header. */
function nameFontSize(name: string): number {
  const len = [...name].length;
  if (len <= 6) return 104;
  if (len <= 9) return 88;
  if (len <= 12) return 70;
  if (len <= 16) return 56;
  return 46;
}

/** Points for an N-pointed starburst centred on (cx, cy). */
function starburst(cx: number, cy: number, outer: number, inner: number, points = 16): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

const DISPLAY_FONT = "'Arial Black', 'Helvetica Neue', Impact, Arial, sans-serif";

function headerSvg({ petName, tagline, ageLabel }: ComposeCardOptions): string {
  const name = esc(petName.toUpperCase());
  const tag = esc(tagline.toUpperCase());
  const age = esc(ageLabel.toUpperCase());
  const fs = nameFontSize(petName);
  const W = CARD_WIDTH;

  // Split the tagline over two lines inside the starburst if it is long.
  const words = tag.split(" ");
  const mid = Math.ceil(words.length / 2);
  const tagLines =
    words.length >= 2 && tag.length > 9 ? [words.slice(0, mid).join(" "), words.slice(mid).join(" ")] : [tag];
  const longest = Math.max(...tagLines.map((l) => l.length));
  const tagFs = Math.min(26, Math.floor(150 / (longest * 0.72)));

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

  <!-- "Collector series" kicker -->
  <text x="${W / 2}" y="92" text-anchor="middle" font-family="${DISPLAY_FONT}" font-size="22" font-weight="900" letter-spacing="6" fill="#ffd60a">★ COLLECTOR SERIES ★</text>

  <!-- Pet name -->
  <g filter="url(#shadow)">
    <text x="${W / 2}" y="${92 + fs * 0.95}" text-anchor="middle" font-family="${DISPLAY_FONT}" font-size="${fs}" font-weight="900" fill="#ffffff" stroke="#111" stroke-width="10" paint-order="stroke" stroke-linejoin="round">${name}</text>
  </g>

  <!-- Tagline starburst (top-right) -->
  <g transform="rotate(12 ${W - 112} 300)">
    <polygon points="${starburst(W - 112, 300, 96, 78, 18)}" fill="#ffd60a" stroke="#111" stroke-width="6" stroke-linejoin="round"/>
    ${tagLines
      .map(
        (l, i) =>
          `<text x="${W - 112}" y="${300 + (i - (tagLines.length - 1) / 2) * (tagFs + 6) + tagFs * 0.36}" text-anchor="middle" font-family="${DISPLAY_FONT}" font-size="${tagFs}" font-weight="900" fill="#111">${l}</text>`,
      )
      .join("\n    ")}
  </g>

  <!-- Age badge (bottom-left) -->
  <g transform="translate(46 ${CARD_HEIGHT - 150})">
    <rect width="150" height="104" rx="14" fill="#111"/>
    <rect x="6" y="6" width="138" height="92" rx="10" fill="#ffffff"/>
    <text x="75" y="44" text-anchor="middle" font-family="${DISPLAY_FONT}" font-size="20" font-weight="900" fill="#c81d25" letter-spacing="2">AGE</text>
    <text x="75" y="84" text-anchor="middle" font-family="${DISPLAY_FONT}" font-size="${age.length > 5 ? 26 : 36}" font-weight="900" fill="#111">${age}</text>
  </g>
</svg>`;
}

function watermarkSvg(): string {
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;
  const rows: string[] = [];
  for (let y = -H; y < H * 2; y += 170) {
    for (let x = -W; x < W * 2; x += 640) {
      const offset = (y / 170) % 2 === 0 ? 0 : 320;
      rows.push(`<text x="${x + offset}" y="${y}">PREVIEW</text>`);
    }
  }
  return `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <g transform="rotate(-30 ${W / 2} ${H / 2})" font-family="${DISPLAY_FONT}" font-size="72" font-weight="900"
     fill="#ffffff" fill-opacity="0.38" stroke="#000000" stroke-opacity="0.22" stroke-width="2" letter-spacing="8">
    ${rows.join("\n    ")}
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
