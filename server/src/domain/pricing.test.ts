import { describe, expect, it } from "vitest";
import { billedDays, calculateStorageFee } from "./pricing.js";

const HOUR = 1000 * 60 * 60;

describe("billedDays", () => {
  it("charges a minimum of 1 day even for an instant pickup", () => {
    const t = new Date("2026-01-01T00:00:00Z");
    expect(billedDays(t, t)).toBe(1);
  });

  it("charges 1 day for exactly 24 hours", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = new Date(start.getTime() + 24 * HOUR);
    expect(billedDays(start, end)).toBe(1);
  });

  it("rounds any partial day up to a full day", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = new Date(start.getTime() + 25 * HOUR);
    expect(billedDays(start, end)).toBe(2);
  });

  it("charges 5 days for exactly 120 hours", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = new Date(start.getTime() + 120 * HOUR);
    expect(billedDays(start, end)).toBe(5);
  });

  it("charges 6 days for 121 hours", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = new Date(start.getTime() + 121 * HOUR);
    expect(billedDays(start, end)).toBe(6);
  });

  it("rejects a retrieval time before the storage time", () => {
    const start = new Date("2026-01-02T00:00:00Z");
    const end = new Date("2026-01-01T00:00:00Z");
    expect(() => billedDays(start, end)).toThrow();
  });
});

describe("calculateStorageFee", () => {
  const config = { ratePerDay: 10 };

  it("charges the base rate within the first tier (day 1)", () => {
    expect(calculateStorageFee(1, config)).toBe(10);
  });

  it("charges the base rate for all of the first tier (day 5)", () => {
    expect(calculateStorageFee(5, config)).toBe(50);
  });

  it("charges double the rate starting on day 6", () => {
    // 5 days @ 10 + 1 day @ 20
    expect(calculateStorageFee(6, config)).toBe(70);
  });

  it("charges double the rate for all of the second tier (day 10)", () => {
    // 5 days @ 10 + 5 days @ 20
    expect(calculateStorageFee(10, config)).toBe(150);
  });

  it("charges triple the rate starting on day 11", () => {
    // 5 days @ 10 + 5 days @ 20 + 1 day @ 30
    expect(calculateStorageFee(11, config)).toBe(180);
  });

  it("keeps charging triple the rate beyond day 11", () => {
    // 5 @ 10 + 5 @ 20 + 3 @ 30
    expect(calculateStorageFee(13, config)).toBe(240);
  });
});
