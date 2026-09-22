import { describe, expect, it } from "vitest";
import { ManualClock } from "./manualClock.js";

describe("ManualClock", () => {
  it("defaults to the current time when no start is given", () => {
    const before = Date.now();
    const clock = new ManualClock();
    const after = Date.now();

    expect(clock.now().getTime()).toBeGreaterThanOrEqual(before);
    expect(clock.now().getTime()).toBeLessThanOrEqual(after);
  });

  it("holds a fixed time until advanced", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const clock = new ManualClock(start);

    expect(clock.now()).toEqual(start);
    expect(clock.now()).toEqual(start);
  });

  it("advances by the given number of hours", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const clock = new ManualClock(start);

    clock.advanceHours(25);

    expect(clock.now()).toEqual(new Date("2026-01-02T01:00:00Z"));
  });

  it("accumulates multiple advances", () => {
    const clock = new ManualClock(new Date("2026-01-01T00:00:00Z"));

    clock.advanceHours(24);
    clock.advanceHours(48);

    expect(clock.now()).toEqual(new Date("2026-01-04T00:00:00Z"));
  });
});
