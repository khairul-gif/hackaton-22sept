export interface PricingConfig {
  /** Fee per day for the first tier (X in the tiered pricing rule). */
  ratePerDay: number;
}

export const DEFAULT_PRICING: PricingConfig = { ratePerDay: 10 };

const TIER_SIZE_DAYS = 5;

/**
 * Number of days to bill for, given a day = 24 hours and any partial day
 * counts as a full day. A package retrieved the same moment it was stored
 * is still billed for a minimum of 1 day.
 */
export function billedDays(storedAt: Date, retrievedAt: Date): number {
  const elapsedMs = retrievedAt.getTime() - storedAt.getTime();
  if (elapsedMs < 0) {
    throw new Error("retrievedAt must not be before storedAt");
  }
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  return Math.max(1, Math.ceil(elapsedHours / 24));
}

/**
 * Tiered pricing: X/day for the first 5 days, 2X/day for the next 5 days,
 * 3X/day for any day beyond that.
 */
export function calculateStorageFee(days: number, config: PricingConfig = DEFAULT_PRICING): number {
  const { ratePerDay } = config;
  let remaining = days;
  let fee = 0;

  const tier1Days = Math.min(remaining, TIER_SIZE_DAYS);
  fee += tier1Days * ratePerDay;
  remaining -= tier1Days;

  const tier2Days = Math.min(remaining, TIER_SIZE_DAYS);
  fee += tier2Days * ratePerDay * 2;
  remaining -= tier2Days;

  fee += remaining * ratePerDay * 3;

  return fee;
}
