import { createHash, randomUUID } from "node:crypto";
import { fal } from "@fal-ai/client";
import { after } from "next/server";
import { checkCapAlerts } from "@/lib/alerts";
import { composeCard } from "@/lib/composeCard";
import { buildPrompt, getPreset } from "@/lib/presets";
import { clientIp, releaseGeneration, reserveGeneration } from "@/lib/rateLimit";
import { HD_BUCKET, PREVIEW_BUCKET, supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 120;

const FAL_MODEL_ID = process.env.FAL_MODEL_ID ?? "blackforestlabs/flux-3/klein/edit-image";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

fal.config({ credentials: process.env.FAL_KEY });

type FalImageOutput = { images: { url: string }[]; has_nsfw_concepts?: boolean[] };

function bad(status: number, error: string, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status });
}

export async function POST(request: Request) {
  // 1. Validate input before spending a rate-limit slot.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad(400, "Expected multipart/form-data.");
  }

  const photo = form.get("photo");
  const petName = String(form.get("petName") ?? "").trim().slice(0, 20);
  const preset = getPreset(String(form.get("preset") ?? ""));
  const ageRaw = String(form.get("age") ?? "").trim().slice(0, 6);
  const ageLabel = ageRaw ? (/^\d+$/.test(ageRaw) ? `${ageRaw}` : ageRaw) : "3+";

  if (!(photo instanceof File) || photo.size === 0) return bad(400, "Please upload a photo of your pet.");
  if (photo.size > MAX_UPLOAD_BYTES) return bad(413, "That photo is over 10 MB. Try a smaller one.");
  if (!ALLOWED_TYPES.has(photo.type)) return bad(415, "Please upload a JPG, PNG, WEBP or HEIC photo.");
  if (!petName) return bad(400, "What's your pet's name?");
  if (!preset) return bad(400, "Pick an accessory pack.");

  // 2. Rate limit: 2 generations per IP per day.
  const ip = clientIp(request.headers);
  let reserved = false;
  try {
    const rl = await reserveGeneration(ip);
    if (!rl.allowed) {
      if (rl.reason === "global") {
        console.warn("[generate] site-wide daily cap reached");
        const { cap, salesToday } = rl;
        after(() => checkCapAlerts(cap, cap, salesToday, true));
        return bad(503, "We're very busy today and have paused new previews. Please try again tomorrow!");
      }
      return bad(429, "You've used your 2 free figures for today. Come back tomorrow!", { remaining: 0 });
    }
    reserved = true;
    // Email the owner at 80% / 100% of the daily cap (once per level per day), after responding.
    const { globalUsed, cap, salesToday } = rl;
    after(() => checkCapAlerts(globalUsed, cap, salesToday, false));

    // 3. Generate with fal.
    const photoUrl = await fal.storage.upload(photo);
    const result = await fal.subscribe(FAL_MODEL_ID, {
      input: {
        prompt: buildPrompt(preset),
        image_urls: [photoUrl],
        image_size: { width: 896, height: 1152 },
        output_format: "png",
        num_images: 1,
        enable_safety_checker: true,
        // Use our prompt as written; fal would otherwise rewrite it.
        enable_prompt_expansion: false,
      },
    });
    const output = result.data as FalImageOutput;
    const imageUrl = output.images?.[0]?.url;
    if (!imageUrl) throw new Error("fal returned no image");
    if (output.has_nsfw_concepts?.[0]) {
      await releaseGeneration(ip);
      reserved = false;
      return bad(422, "We couldn't use that photo. Try a different one of your pet.");
    }

    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to download generated image: ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());

    // 4. Compose HD (clean) + preview (watermarked).
    const cardOpts = { petName, tagline: preset.tagline, ageLabel };
    const [hd, preview] = await Promise.all([
      composeCard(raw, { ...cardOpts, format: "png" }),
      composeCard(raw, { ...cardOpts, watermark: true, format: "webp" }),
    ]);

    // 5. Store in Supabase.
    const id = randomUUID();
    const supabase = supabaseAdmin();
    const previewPath = `${id}.webp`;
    const hdPath = `${id}.png`;

    const [pv, hdUp] = await Promise.all([
      supabase.storage.from(PREVIEW_BUCKET).upload(previewPath, preview, { contentType: "image/webp", upsert: false }),
      supabase.storage.from(HD_BUCKET).upload(hdPath, hd, { contentType: "image/png", upsert: false }),
    ]);
    if (pv.error) throw pv.error;
    if (hdUp.error) throw hdUp.error;

    const previewUrl = supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(previewPath).data.publicUrl;

    const { error: insertError } = await supabase.from("generations").insert({
      id,
      pet_name: petName,
      preset: preset.id,
      age_label: ageLabel,
      preview_url: previewUrl,
      hd_path: hdPath,
      ip_hash: createHash("sha256").update(`${ip}:${process.env.IP_HASH_SALT ?? ""}`).digest("hex"),
      is_paid: false,
    });
    if (insertError) throw insertError;

    return Response.json({ id, previewUrl });
  } catch (err) {
    console.error("[generate] failed", err);
    if (reserved) await releaseGeneration(ip).catch(() => {});
    return bad(500, "Something went wrong making your figure. Your free try wasn't used. Please try again.");
  }
}
