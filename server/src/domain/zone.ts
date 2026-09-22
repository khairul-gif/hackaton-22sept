import { DEFAULT_PRICING } from "./pricing.js";
import { SIZES, type Size } from "./size.js";

/**
 * Customer-facing locker zone: a display label over the existing Size
 * tiers, priced per day. Kept in sync with DEFAULT_PRICING rather than
 * duplicating rates, since a zone and a locker size are the same physical
 * thing viewed from two angles (operator vs. visitor).
 */
export interface Zone {
  size: Size;
  label: string;
  ratePerDay: number;
}

const ZONE_LABELS: Record<Size, string> = {
  SMALL: "Zone A",
  MEDIUM: "Zone B",
  LARGE: "Zone C",
};

export const ZONES: Zone[] = SIZES.map((size) => ({
  size,
  label: ZONE_LABELS[size],
  ratePerDay: DEFAULT_PRICING[size].ratePerDay,
}));
