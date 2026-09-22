import type { Clock } from "./clock.js";

/**
 * A clock that only advances when told to. Tests use it to make
 * time-dependent behavior (Level 3 storage duration) deterministic. It can
 * also be wired into the live server, opt-in only, so the tiered storage
 * fee can be demoed by fast-forwarding time instead of waiting real days.
 */
export class ManualClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date()) {
    this.current = start;
  }

  now(): Date {
    return this.current;
  }

  advanceHours(hours: number): void {
    this.current = new Date(this.current.getTime() + hours * 60 * 60 * 1000);
  }
}
