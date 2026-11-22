import "server-only";
import { Resend } from "resend";
import { HD_BUCKET, supabaseAdmin } from "@/lib/supabase";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The HD PNG from private storage, to attach to the email; null if it can't be fetched. */
async function hdAttachment(hdPath: string, petName: string) {
  try {
    const { data, error } = await supabaseAdmin().storage.from(HD_BUCKET).download(hdPath);
    if (error || !data) throw error ?? new Error("empty file");
    const filename = `${petName.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "") || "pet"}-action-figure.png`;
    return { filename, content: Buffer.from(await data.arrayBuffer()), contentType: "image/png" };
  } catch (err) {
    console.error("[email] could not attach HD file; sending links only", err);
    return null;
  }
}

/**
 * Emails the buyer their unlocked figure: the HD PNG as an attachment, plus permanent links
 * to download and view it on any device. Skipped (with a log line) when RESEND_API_KEY or
 * EMAIL_FROM isn't set. Never throws: a failed email must not fail the payment flow.
 */
export async function sendFigureUnlockedEmail({
  to,
  petName,
  figureId,
  hdPath,
}: {
  to: string;
  petName: string;
  figureId: string;
  hdPath: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.info("[email] RESEND_API_KEY or EMAIL_FROM not set; skipping unlock email");
    return;
  }

  const site = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const pageUrl = `${site}/result/${figureId}`;
  // Opens the figure's page, which starts the download itself. A direct file link is
  // unreliable from email apps (in-app browsers and link scanners often drop the download).
  const downloadUrl = `${site}/result/${figureId}?download=1`;
  const name = esc(petName);

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#fff6e5;font-family:Arial,Helvetica,sans-serif;color:#141414">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:4px solid #141414;border-radius:16px">
          <tr><td style="background:#e5262e;border-radius:12px 12px 0 0;padding:20px 24px;color:#ffffff;font-size:22px;font-weight:900">
            ${name} is ready! 🎉
          </td></tr>
          <tr><td style="padding:24px">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.5">
              Thanks for your order. Your HD action figure of <strong>${name}</strong> is unlocked: no watermark, ready to print, frame or share.
            </p>
            <p style="margin:0 0 24px">
              <a href="${downloadUrl}" style="display:inline-block;background:#e5262e;color:#ffffff;text-decoration:none;font-weight:900;padding:14px 22px;border:3px solid #141414;border-radius:12px">
                Download HD PNG
              </a>
            </p>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.5">
              Your HD file is also attached to this email. Keep it: these links work any time, on any device.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.5">
              View your figure: <a href="${pageUrl}" style="color:#e5262e">${pageUrl}</a>
            </p>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#666;margin:16px 0 0">PetFigure · You're receiving this because you bought a figure.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `${petName} is ready!

Thanks for your order. Your HD action figure of ${petName} is unlocked.

Download HD PNG: ${downloadUrl}
View your figure: ${pageUrl}

Your HD file is also attached to this email. Keep it: these links work any time, on any device.`;

  const attachment = await hdAttachment(hdPath, petName);

  try {
    const { error } = await new Resend(apiKey).emails.send(
      {
        from,
        to,
        subject: `${petName} is ready! Your HD action figure 🎉`,
        html,
        text,
        ...(attachment ? { attachments: [attachment] } : {}),
        ...(process.env.EMAIL_REPLY_TO ? { replyTo: process.env.EMAIL_REPLY_TO } : {}),
      },
      // Stripe can deliver the same event more than once; never send the same email twice.
      { idempotencyKey: `figure-unlocked/${figureId}` },
    );
    if (error) console.error("[email] Resend error", error);
  } catch (err) {
    console.error("[email] failed to send unlock email", err);
  }
}
