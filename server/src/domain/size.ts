export const SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;

export type Size = (typeof SIZES)[number];

export function isSize(value: string): value is Size {
  return (SIZES as readonly string[]).includes(value);
}

/**
 * True when a package requesting `requestedSize` can go in a locker of
 * `lockerSize`. Every locker is physically the same size — SMALL/MEDIUM/
 * LARGE (Zone A/B/C) differ only by price and location, not capacity — so
 * this is an exact zone match, not a size-fit check.
 */
export function fits(requestedSize: Size, lockerSize: Size): boolean {
  return requestedSize === lockerSize;
}
