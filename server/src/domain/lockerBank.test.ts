import { beforeEach, describe, expect, it, vi } from "vitest";
import { LockerBank } from "./lockerBank.js";
import { InMemoryLockerRepository } from "../repository/lockerRepository.js";
import { FakeClock } from "../testUtils/fakeClock.js";

const ONE_ADULT = { ADULT: 1, CHILD: 0, OKU: 0 };

describe("LockerBank", () => {
  let repository: InMemoryLockerRepository;
  let bank: LockerBank;
  let ticketId: string;

  beforeEach(() => {
    repository = new InMemoryLockerRepository();
    // closingHour 0 => opening a locker always finalizes the rental, the
    // behaviour most of these tests were written against. The open/reopen
    // window is covered separately below.
    bank = new LockerBank({ repository, closingHour: 0 });
    ticketId = bank.purchaseTicket(ONE_ADULT).id;
  });

  describe("createLocker", () => {
    it("creates a locker that is initially available", () => {
      const locker = bank.createLocker("MEDIUM");
      expect(locker.size).toBe("MEDIUM");
      expect(locker.available).toBe(true);
      expect(bank.listLockers()).toContainEqual(locker);
    });

    it("assigns each locker a unique id", () => {
      const a = bank.createLocker("SMALL");
      const b = bank.createLocker("SMALL");
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("purchaseTicket", () => {
    it("prices line items by ticket type and sums the entry price", () => {
      const ticket = bank.purchaseTicket({ ADULT: 2, CHILD: 1, OKU: 0 });
      expect(ticket.id).toEqual(expect.any(String));
      expect(ticket.lineItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "ADULT", quantity: 2 }),
          expect.objectContaining({ type: "CHILD", quantity: 1 }),
        ]),
      );
      expect(ticket.lineItems.some((li) => li.type === "OKU")).toBe(false);
      const expectedTotal = ticket.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
      expect(ticket.entryPrice).toBe(expectedTotal);
    });

    it("assigns each ticket a unique id", () => {
      const a = bank.purchaseTicket(ONE_ADULT);
      const b = bank.purchaseTicket(ONE_ADULT);
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("storePackage", () => {
    it("returns ticket_not_found for an unknown ticket", async () => {
      bank.createLocker("SMALL");
      const result = await bank.storePackage("SMALL", "does-not-exist");
      expect(result).toEqual({ status: "ticket_not_found" });
    });

    it("assigns an available locker in the requested zone", async () => {
      bank.createLocker("LARGE");
      const medium = bank.createLocker("MEDIUM");

      const result = await bank.storePackage("MEDIUM", ticketId);

      expect(result).toMatchObject({ status: "stored", lockerId: medium.id });
    });

    it("returns no_locker_available when no locker exists in that zone, even if other zones have space", async () => {
      bank.createLocker("SMALL");
      bank.createLocker("MEDIUM");

      const result = await bank.storePackage("LARGE", ticketId);

      expect(result).toEqual({ status: "no_locker_available" });
    });

    it("returns no_locker_available when all fitting lockers are occupied", async () => {
      bank.createLocker("SMALL");
      await bank.storePackage("SMALL", ticketId); // occupies the only locker

      const result = await bank.storePackage("SMALL", ticketId);

      expect(result).toEqual({ status: "no_locker_available" });
    });

    it("marks the assigned locker as unavailable afterwards", async () => {
      const locker = bank.createLocker("SMALL");
      await bank.storePackage("SMALL", ticketId);

      const view = bank.listLockers().find((l) => l.id === locker.id);
      expect(view?.available).toBe(false);
    });

    it("returns a pickup code alongside the locker id on success", async () => {
      bank.createLocker("SMALL");

      const result = await bank.storePackage("SMALL", ticketId);

      expect(result.status).toBe("stored");
      if (result.status === "stored") {
        expect(result.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
      }
    });

    it("regenerates the pickup code if a collision is detected", async () => {
      bank.createLocker("SMALL");
      const spy = vi.spyOn(repository, "isPickupCodeInUse");
      spy.mockReturnValueOnce(true).mockReturnValue(false);

      const result = await bank.storePackage("SMALL", ticketId);

      expect(result.status).toBe("stored");
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("retrievePackage", () => {
    it("retrieves the package with a matching locker id and pickup code", async () => {
      const locker = bank.createLocker("SMALL");
      const stored = await bank.storePackage("SMALL", ticketId);
      if (stored.status !== "stored") throw new Error("setup failed");

      const result = await bank.retrievePackage(locker.id, stored.pickupCode);

      expect(result.status).toBe("retrieved");
      if (result.status === "retrieved") {
        expect(result.package.lockerId).toBe(locker.id);
        expect(result.package.pickupCode).toBe(stored.pickupCode);
      }
    });

    it("frees the locker for future deliveries after retrieval", async () => {
      const locker = bank.createLocker("SMALL");
      const stored = await bank.storePackage("SMALL", ticketId);
      if (stored.status !== "stored") throw new Error("setup failed");

      await bank.retrievePackage(locker.id, stored.pickupCode);

      const view = bank.listLockers().find((l) => l.id === locker.id);
      expect(view?.available).toBe(true);
    });

    it("returns locker_not_found for an unknown locker id", async () => {
      const result = await bank.retrievePackage("does-not-exist", "ABC123");
      expect(result).toEqual({ status: "locker_not_found" });
    });

    it("returns locker_empty when the locker has no active package", async () => {
      const locker = bank.createLocker("SMALL");
      const result = await bank.retrievePackage(locker.id, "ABC123");
      expect(result).toEqual({ status: "locker_empty" });
    });

    it("returns invalid_code when the pickup code does not match", async () => {
      const locker = bank.createLocker("SMALL");
      await bank.storePackage("SMALL", ticketId);

      const result = await bank.retrievePackage(locker.id, "WRONGC");

      expect(result).toEqual({ status: "invalid_code" });
    });

    it("does not release the locker on a failed retrieval attempt", async () => {
      const locker = bank.createLocker("SMALL");
      await bank.storePackage("SMALL", ticketId);

      await bank.retrievePackage(locker.id, "WRONGC");

      const view = bank.listLockers().find((l) => l.id === locker.id);
      expect(view?.available).toBe(false);
    });

    it("charges a fee based on how long the package sat in the locker, billed to the ticket", async () => {
      const clock = new FakeClock(new Date("2026-01-01T00:00:00Z"));
      const timedRepository = new InMemoryLockerRepository();
      const timedBank = new LockerBank({
        repository: timedRepository,
        clock,
        pricing: { SMALL: { ratePerDay: 10 }, MEDIUM: { ratePerDay: 10 }, LARGE: { ratePerDay: 10 } },
        closingHour: 0,
      });
      const timedTicketId = timedBank.purchaseTicket(ONE_ADULT).id;

      const locker = timedBank.createLocker("SMALL");
      const stored = await timedBank.storePackage("SMALL", timedTicketId);
      if (stored.status !== "stored") throw new Error("setup failed");

      clock.advanceHours(6 * 24 + 1); // day 6 partial -> 7 billed days

      const result = await timedBank.retrievePackage(locker.id, stored.pickupCode);

      expect(result.status).toBe("retrieved");
      if (result.status === "retrieved") {
        expect(result.daysStored).toBe(7);
        // 5 days @ 10 + 2 days @ 20 = 90
        expect(result.feeCharged).toBe(90);
        expect(result.ticketTotal).toBe(90 + timedBank.getTicketSummary(timedTicketId)!.ticket.entryPrice);
      }
    });

    it("charges the minimum 1-day fee for an immediate pickup", async () => {
      const clock = new FakeClock(new Date("2026-01-01T00:00:00Z"));
      const timedRepository = new InMemoryLockerRepository();
      const timedBank = new LockerBank({
        repository: timedRepository,
        clock,
        pricing: { SMALL: { ratePerDay: 10 }, MEDIUM: { ratePerDay: 10 }, LARGE: { ratePerDay: 10 } },
        closingHour: 0,
      });
      const timedTicketId = timedBank.purchaseTicket(ONE_ADULT).id;

      const locker = timedBank.createLocker("SMALL");
      const stored = await timedBank.storePackage("SMALL", timedTicketId);
      if (stored.status !== "stored") throw new Error("setup failed");

      const result = await timedBank.retrievePackage(locker.id, stored.pickupCode);

      expect(result.status).toBe("retrieved");
      if (result.status === "retrieved") {
        expect(result.daysStored).toBe(1);
        expect(result.feeCharged).toBe(10);
      }
    });
  });

  describe("getTicketSummary", () => {
    it("returns undefined for an unknown ticket", () => {
      expect(bank.getTicketSummary("does-not-exist")).toBeUndefined();
    });

    it("totals the entry price plus any locker charges", async () => {
      const locker = bank.createLocker("SMALL");
      const stored = await bank.storePackage("SMALL", ticketId);
      if (stored.status !== "stored") throw new Error("setup failed");

      await bank.retrievePackage(locker.id, stored.pickupCode);

      const summary = bank.getTicketSummary(ticketId)!;
      expect(summary.lockerCharges).toBeGreaterThan(0);
      expect(summary.total).toBe(summary.ticket.entryPrice + summary.lockerCharges);
    });
  });

  describe("ensureDemoLocker", () => {
    it("occupies one locker with a PIN when none exists yet", async () => {
      bank.createLocker("SMALL");
      bank.createLocker("MEDIUM");

      const demo = await bank.ensureDemoLocker();

      expect(demo).not.toBeNull();
      expect(demo!.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
      const view = bank.listLockers().find((l) => l.id === demo!.lockerId);
      expect(view?.available).toBe(false);
    });

    it("reuses the same demo locker on repeated calls", async () => {
      bank.createLocker("SMALL");

      const first = await bank.ensureDemoLocker();
      const second = await bank.ensureDemoLocker();

      expect(second).toEqual(first);
    });

    it("returns null when no locker is available anywhere", async () => {
      const demo = await bank.ensureDemoLocker();
      expect(demo).toBeNull();
    });

    it("seeds a fresh demo locker once the previous one is retrieved", async () => {
      bank.createLocker("SMALL");

      const first = await bank.ensureDemoLocker();
      await bank.retrievePackage(first!.lockerId, first!.pickupCode);

      const second = await bank.ensureDemoLocker();

      expect(second).not.toBeNull();
      expect(second!.lockerId).toBe(first!.lockerId);
      expect(second!.pickupCode).not.toBe(first!.pickupCode);
    });
  });
});

describe("LockerBank open/reopen until closing time", () => {
  const CLOSING_HOUR = 19; // 7pm

  /** Starts the clock mid-morning, well before the park closes. */
  function buildBank(startHourUtc: number) {
    const clock = new FakeClock(new Date(`2026-01-01T${String(startHourUtc).padStart(2, "0")}:00:00Z`));
    const repository = new InMemoryLockerRepository();
    const bank = new LockerBank({
      repository,
      clock,
      pricing: { SMALL: { ratePerDay: 10 }, MEDIUM: { ratePerDay: 10 }, LARGE: { ratePerDay: 10 } },
      closingHour: CLOSING_HOUR,
    });
    const ticketId = bank.purchaseTicket(ONE_ADULT).id;
    return { bank, clock, ticketId };
  }

  async function rentALocker(bank: LockerBank, ticketId: string) {
    const locker = bank.createLocker("SMALL");
    const stored = await bank.storePackage("SMALL", ticketId);
    if (stored.status !== "stored") throw new Error("setup failed");
    return { lockerId: locker.id, pickupCode: stored.pickupCode };
  }

  it("opens without ending the rental while the park is open", async () => {
    const { bank, ticketId } = buildBank(9);
    const { lockerId, pickupCode } = await rentALocker(bank, ticketId);

    const result = await bank.retrievePackage(lockerId, pickupCode);

    expect(result).toEqual({ status: "opened", lockerId });
    expect(bank.listLockers().find((l) => l.id === lockerId)?.available).toBe(false);
  });

  it("accepts the same PIN over and over through the day", async () => {
    const { bank, clock, ticketId } = buildBank(9);
    const { lockerId, pickupCode } = await rentALocker(bank, ticketId);

    for (let i = 0; i < 4; i++) {
      const result = await bank.retrievePackage(lockerId, pickupCode);
      expect(result.status).toBe("opened");
      clock.advanceHours(2);
    }
  });

  it("bills nothing to the ticket while the locker is only being opened", async () => {
    const { bank, ticketId } = buildBank(9);
    const { lockerId, pickupCode } = await rentALocker(bank, ticketId);

    await bank.retrievePackage(lockerId, pickupCode);

    expect(bank.getTicketSummary(ticketId)!.lockerCharges).toBe(0);
  });

  it("ends the rental and bills the fee once the park has closed", async () => {
    const { bank, clock, ticketId } = buildBank(9);
    const { lockerId, pickupCode } = await rentALocker(bank, ticketId);

    await bank.retrievePackage(lockerId, pickupCode); // mid-day open
    clock.advanceHours(CLOSING_HOUR - 9); // now 19:00 — park closed

    const result = await bank.retrievePackage(lockerId, pickupCode);

    expect(result.status).toBe("retrieved");
    if (result.status === "retrieved") {
      expect(result.feeCharged).toBe(10); // one billed day
    }
    expect(bank.listLockers().find((l) => l.id === lockerId)?.available).toBe(true);
    expect(bank.getTicketSummary(ticketId)!.lockerCharges).toBe(10);
  });

  it("still rejects a wrong PIN while the park is open", async () => {
    const { bank, ticketId } = buildBank(9);
    const { lockerId } = await rentALocker(bank, ticketId);

    expect(await bank.retrievePackage(lockerId, "WRONGC")).toEqual({ status: "invalid_code" });
  });
});
