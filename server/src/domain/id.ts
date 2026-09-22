import { randomInt, randomUUID } from "node:crypto";

export type IdGenerator = () => string;

export const randomId: IdGenerator = () => randomUUID();

/** Short, memorable, sequential ids (e.g. "L1", "L2", ...). Handy for demos. */
export function createSequentialIdGenerator(prefix: string): IdGenerator {
  let count = 0;
  return () => {
    count += 1;
    return `${prefix}${count}`;
  };
}

/**
 * Sequential id with a random 4-digit suffix, e.g. "L1-4821", "L2-0193".
 * Still guaranteed unique by the sequential part alone; the suffix just
 * makes ids look less like a predictable counter.
 */
export function createFriendlyIdGenerator(prefix: string): IdGenerator {
  let count = 0;
  return () => {
    count += 1;
    const suffix = String(randomInt(0, 10000)).padStart(4, "0");
    return `${prefix}${count}-${suffix}`;
  };
}
