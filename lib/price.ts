import "server-only";

/**
 * The single source of truth for the unlock price.
 * STRIPE_UNIT_AMOUNT is in the smallest currency unit (cents): 499 = 4.99.
 * Both the price shown on the pages and the amount Stripe charges come from here.
 */
export const PRICE_AMOUNT = Number(process.env.STRIPE_UNIT_AMOUNT ?? 499);
export const PRICE_CURRENCY = (process.env.STRIPE_CURRENCY ?? "usd").toLowerCase();

if (!Number.isInteger(PRICE_AMOUNT) || PRICE_AMOUNT < 50) {
  throw new Error(`STRIPE_UNIT_AMOUNT must be a whole number of cents, at least 50 (got "${process.env.STRIPE_UNIT_AMOUNT}")`);
}

/** Human-readable price, e.g. "$4.99" or "€4.99". */
export const PRICE_LABEL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: PRICE_CURRENCY.toUpperCase(),
}).format(PRICE_AMOUNT / 100);
