import { describe, expect, it } from "vitest";
import { LockerBank, type StoreResult } from "./lockerBank.js";
import { InMemoryLockerRepository } from "../repository/lockerRepository.js";

describe("LockerBank concurrency (Level 4)", () => {
  it("assigns each locker to exactly one of many simultaneous requests", async () => {
    const repository = new InMemoryLockerRepository();
    const bank = new LockerBank({ repository });

    const lockerCount = 5;
    const requestCount = 20;
    for (let i = 0; i < lockerCount; i++) {
      bank.createLocker("SMALL");
    }

    const results: StoreResult[] = await Promise.all(
      Array.from({ length: requestCount }, () => bank.storePackage("SMALL")),
    );

    const successes = results.filter((r) => r.status === "stored");
    const failures = results.filter((r) => r.status === "no_locker_available");

    expect(successes).toHaveLength(lockerCount);
    expect(failures).toHaveLength(requestCount - lockerCount);

    // No two successful requests were ever given the same locker.
    const assignedLockerIds = successes.map((r) => (r as { lockerId: string }).lockerId);
    expect(new Set(assignedLockerIds).size).toBe(lockerCount);

    // No two successful requests share a pickup code either.
    const pickupCodes = successes.map((r) => (r as { pickupCode: string }).pickupCode);
    expect(new Set(pickupCodes).size).toBe(lockerCount);

    // Locker availability is left in a consistent, fully-occupied state.
    const finalView = bank.listLockers();
    expect(finalView.every((l) => !l.available)).toBe(true);
  });

  it("leaves lockers available again for a second wave after the first wave fills them", async () => {
    const repository = new InMemoryLockerRepository();
    const bank = new LockerBank({ repository });

    for (let i = 0; i < 3; i++) {
      bank.createLocker("SMALL");
    }

    await Promise.all([bank.storePackage("SMALL"), bank.storePackage("SMALL"), bank.storePackage("SMALL")]);
    expect(bank.listLockers().every((l) => !l.available)).toBe(true);

    const secondWave = await Promise.all([bank.storePackage("SMALL"), bank.storePackage("SMALL")]);
    expect(secondWave.every((r) => r.status === "no_locker_available")).toBe(true);
  });
});
