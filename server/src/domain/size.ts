export const SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;

export type Size = (typeof SIZES)[number];

const RANK: Record<Size, number> = {
  SMALL: 0,
  MEDIUM: 1,
  LARGE: 2,
};

export function isSize(value: string): value is Size {
  return (SIZES as readonly string[]).includes(value);
}

/** True when a package of `packageSize` can physically fit in a locker of `lockerSize`. */
export function fits(packageSize: Size, lockerSize: Size): boolean {
  return RANK[lockerSize] >= RANK[packageSize];
}

/** Ascending comparator (smallest first) for sorting lockers by size. */
export function compareSize(a: Size, b: Size): number {
  return RANK[a] - RANK[b];
}
