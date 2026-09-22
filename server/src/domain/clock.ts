/**
 * Injected time source. Domain logic must never call `Date.now()`/`new Date()`
 * directly — going through this interface lets tests simulate elapsed time
 * (e.g. "package sat for 12 days") deterministically.
 */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
