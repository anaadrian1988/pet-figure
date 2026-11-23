import "server-only";

/**
 * Countries where buyers have a 14-day right to cancel online purchases (EU, EEA and UK).
 * For instant digital delivery that right ends once the content is delivered, provided the
 * buyer is told so before paying, which is why these visitors see a short notice at checkout.
 */
const WITHDRAWAL_RIGHT_COUNTRIES = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA
  "IS", "LI", "NO",
  // UK
  "GB",
]);

/**
 * Whether to show the cancellation-period notice. Uses the visitor's country from Vercel
 * (x-vercel-ip-country). When the country is unknown (e.g. local development), the notice is
 * shown, to be safe. `override` lets you preview another country locally (never in production).
 */
export function showWithdrawalNotice(headers: Headers, override?: string | null): boolean {
  const devOverride = process.env.NODE_ENV !== "production" ? override?.toUpperCase() : undefined;
  const country = devOverride || headers.get("x-vercel-ip-country")?.toUpperCase();
  if (!country) return true;
  return WITHDRAWAL_RIGHT_COUNTRIES.has(country);
}
