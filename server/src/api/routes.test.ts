import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createServer } from "./server.js";
import { LockerBank } from "../domain/lockerBank.js";
import { InMemoryLockerRepository } from "../repository/lockerRepository.js";
import { FakeClock } from "../testUtils/fakeClock.js";

describe("locker, ticket and locker-rental routes", () => {
  let app: Express;

  beforeEach(() => {
    // closingHour 0 => every correct PIN finalizes the rental immediately,
    // which is what these endpoint tests assert on.
    const bank = new LockerBank({ repository: new InMemoryLockerRepository(), closingHour: 0 });
    app = createServer(bank);
  });

  async function buyTicket(): Promise<string> {
    const res = await request(app).post("/tickets").send({ ADULT: 1 });
    return res.body.id as string;
  }

  describe("POST /lockers", () => {
    it("creates a locker of the requested size", async () => {
      const res = await request(app).post("/lockers").send({ size: "MEDIUM" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ size: "MEDIUM", available: true });
      expect(res.body.id).toEqual(expect.any(String));
    });

    it("rejects an invalid size", async () => {
      const res = await request(app).post("/lockers").send({ size: "HUGE" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("rejects a missing size", async () => {
      const res = await request(app).post("/lockers").send({});

      expect(res.status).toBe(400);
    });
  });

  describe("GET /lockers", () => {
    it("lists lockers with their availability", async () => {
      await request(app).post("/lockers").send({ size: "SMALL" });
      await request(app).post("/lockers").send({ size: "LARGE" });

      const res = await request(app).get("/lockers");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ size: "SMALL", available: true }),
          expect.objectContaining({ size: "LARGE", available: true }),
        ]),
      );
    });

    it("includes pickupCode and storedAt for an occupied locker", async () => {
      const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });
      const ticketId = await buyTicket();
      const rentalRes = await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId });

      const res = await request(app).get("/lockers");

      const view = res.body.find((l: { id: string }) => l.id === lockerRes.body.id);
      expect(view.available).toBe(false);
      expect(view.pickupCode).toBe(rentalRes.body.pickupCode);
      expect(view.storedAt).toEqual(expect.any(String));
      expect(new Date(view.storedAt).toString()).not.toBe("Invalid Date");
    });

    it("includes lastRetrievedAt (and no pickupCode) once the package is retrieved", async () => {
      const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });
      const ticketId = await buyTicket();
      const rentalRes = await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId });
      await request(app)
        .post("/pickups")
        .send({ lockerId: lockerRes.body.id, pickupCode: rentalRes.body.pickupCode });

      const res = await request(app).get("/lockers");

      const view = res.body.find((l: { id: string }) => l.id === lockerRes.body.id);
      expect(view.available).toBe(true);
      expect(view.pickupCode).toBeUndefined();
      expect(view.storedAt).toBeUndefined();
      expect(new Date(view.lastRetrievedAt).toString()).not.toBe("Invalid Date");
    });
  });

  describe("GET /zones", () => {
    it("lists the SMALL/MEDIUM/LARGE zones with their per-day rate", async () => {
      const res = await request(app).get("/zones");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ size: "SMALL", label: expect.any(String), ratePerDay: expect.any(Number) }),
          expect.objectContaining({ size: "MEDIUM", label: expect.any(String), ratePerDay: expect.any(Number) }),
          expect.objectContaining({ size: "LARGE", label: expect.any(String), ratePerDay: expect.any(Number) }),
        ]),
      );
    });
  });

  describe("GET /ticket-types", () => {
    it("lists Adult/Child/OKU with their price", async () => {
      const res = await request(app).get("/ticket-types");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "ADULT", label: expect.any(String), price: expect.any(Number) }),
          expect.objectContaining({ type: "CHILD", label: expect.any(String), price: expect.any(Number) }),
          expect.objectContaining({ type: "OKU", label: expect.any(String), price: expect.any(Number) }),
        ]),
      );
    });
  });

  describe("POST /tickets", () => {
    it("issues a ticket priced from a single ticket type", async () => {
      const res = await request(app).post("/tickets").send({ ADULT: 1 });

      expect(res.status).toBe(201);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.lineItems).toEqual([expect.objectContaining({ type: "ADULT", quantity: 1 })]);
      expect(res.body.entryPrice).toEqual(expect.any(Number));
    });

    it("sums a mix of ticket types into one order", async () => {
      const res = await request(app).post("/tickets").send({ ADULT: 2, CHILD: 1, OKU: 1 });

      expect(res.status).toBe(201);
      expect(res.body.lineItems).toHaveLength(3);
      const expectedTotal = (res.body.lineItems as { quantity: number; unitPrice: number }[]).reduce(
        (sum, li) => sum + li.quantity * li.unitPrice,
        0,
      );
      expect(res.body.entryPrice).toBe(expectedTotal);
    });

    it("rejects a checkout with no tickets", async () => {
      const res = await request(app).post("/tickets").send({});
      expect(res.status).toBe(400);
    });

    it("rejects a negative or non-integer quantity", async () => {
      const negative = await request(app).post("/tickets").send({ ADULT: -1 });
      expect(negative.status).toBe(400);

      const fractional = await request(app).post("/tickets").send({ ADULT: 1.5 });
      expect(fractional.status).toBe(400);
    });
  });

  describe("GET /tickets/:ticketId", () => {
    it("returns 404 for an unknown ticket", async () => {
      const res = await request(app).get("/tickets/nope");
      expect(res.status).toBe(404);
    });

    it("returns the entry price and locker charges billed against the ticket", async () => {
      const ticketId = await buyTicket();
      await request(app).post("/lockers").send({ size: "SMALL" });
      const rentalRes = await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId });
      await request(app)
        .post("/pickups")
        .send({ lockerId: rentalRes.body.lockerId, pickupCode: rentalRes.body.pickupCode });

      const res = await request(app).get(`/tickets/${ticketId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticketId);
      expect(res.body.lockerCharges).toBeGreaterThan(0);
      expect(res.body.total).toBe(res.body.entryPrice + res.body.lockerCharges);
    });
  });

  describe("POST /locker-rentals", () => {
    it("stores a package in an available locker in the requested zone and returns a pickup code", async () => {
      const lockerRes = await request(app).post("/lockers").send({ size: "MEDIUM" });
      const ticketId = await buyTicket();

      const res = await request(app).post("/locker-rentals").send({ size: "MEDIUM", ticketId });

      expect(res.status).toBe(201);
      expect(res.body.lockerId).toBe(lockerRes.body.id);
      expect(res.body.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it("also occupies a demo locker with its own PIN, for trying pickup without a real checkout", async () => {
      await request(app).post("/lockers").send({ size: "SMALL" });
      await request(app).post("/lockers").send({ size: "MEDIUM" });
      const ticketId = await buyTicket();

      const res = await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId });

      expect(res.body.demoLocker.lockerId).not.toBe(res.body.lockerId);
      expect(res.body.demoLocker.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it("rejects an invalid zone size", async () => {
      const ticketId = await buyTicket();
      const res = await request(app).post("/locker-rentals").send({ size: "GIGANTIC", ticketId });
      expect(res.status).toBe(400);
    });

    it("rejects a missing ticketId", async () => {
      await request(app).post("/lockers").send({ size: "SMALL" });
      const res = await request(app).post("/locker-rentals").send({ size: "SMALL" });
      expect(res.status).toBe(400);
    });

    it("returns 404 when the ticket does not exist", async () => {
      await request(app).post("/lockers").send({ size: "SMALL" });
      const res = await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId: "nope" });
      expect(res.status).toBe(404);
    });

    it("returns 422 when no locker can accommodate the zone", async () => {
      await request(app).post("/lockers").send({ size: "SMALL" });
      const ticketId = await buyTicket();

      const res = await request(app).post("/locker-rentals").send({ size: "LARGE", ticketId });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 422 when all fitting lockers are already occupied", async () => {
      await request(app).post("/lockers").send({ size: "SMALL" });
      const ticketId = await buyTicket();
      await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId });

      const res = await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId });

      expect(res.status).toBe(422);
    });

    it("marks the locker unavailable after a successful rental", async () => {
      const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });
      const ticketId = await buyTicket();
      await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId });

      const listRes = await request(app).get("/lockers");

      const stored = listRes.body.find((l: { id: string }) => l.id === lockerRes.body.id);
      expect(stored.available).toBe(false);
    });
  });

  describe("POST /pickups", () => {
    async function rentALocker(size: "SMALL" | "MEDIUM" | "LARGE" = "SMALL") {
      const lockerRes = await request(app).post("/lockers").send({ size });
      const ticketId = await buyTicket();
      const rentalRes = await request(app).post("/locker-rentals").send({ size, ticketId });
      return { lockerId: lockerRes.body.id as string, pickupCode: rentalRes.body.pickupCode as string, ticketId };
    }

    it("retrieves a package with the correct locker id and pickup code", async () => {
      const { lockerId, pickupCode } = await rentALocker();

      const res = await request(app).post("/pickups").send({ lockerId, pickupCode });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ lockerId, size: "SMALL" });
    });

    it("bills the storage fee against the ticket that funded the rental", async () => {
      const { lockerId, pickupCode, ticketId } = await rentALocker();

      const res = await request(app).post("/pickups").send({ lockerId, pickupCode });

      expect(res.body.ticketId).toBe(ticketId);
      expect(res.body.ticketTotal).toBeGreaterThan(res.body.feeCharged);
    });

    it("frees the locker so it can be used again", async () => {
      const { lockerId, pickupCode } = await rentALocker();
      await request(app).post("/pickups").send({ lockerId, pickupCode });

      const listRes = await request(app).get("/lockers");

      const locker = listRes.body.find((l: { id: string }) => l.id === lockerId);
      expect(locker.available).toBe(true);
    });

    it("rejects a request missing lockerId or pickupCode", async () => {
      const res = await request(app).post("/pickups").send({ lockerId: "x" });
      expect(res.status).toBe(400);
    });

    it("returns 404 for an unknown locker id", async () => {
      const res = await request(app).post("/pickups").send({ lockerId: "nope", pickupCode: "ABC123" });
      expect(res.status).toBe(404);
    });

    it("returns 404 when the locker has no package", async () => {
      const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });

      const res = await request(app)
        .post("/pickups")
        .send({ lockerId: lockerRes.body.id, pickupCode: "ABC123" });

      expect(res.status).toBe(404);
    });

    it("returns 400 for a wrong pickup code and keeps the locker occupied", async () => {
      const { lockerId } = await rentALocker();

      const res = await request(app).post("/pickups").send({ lockerId, pickupCode: "WRONGC" });
      expect(res.status).toBe(400);

      const listRes = await request(app).get("/lockers");
      const locker = listRes.body.find((l: { id: string }) => l.id === lockerId);
      expect(locker.available).toBe(false);
    });

    it("rejects retrieving the same package twice", async () => {
      const { lockerId, pickupCode } = await rentALocker();
      await request(app).post("/pickups").send({ lockerId, pickupCode });

      const res = await request(app).post("/pickups").send({ lockerId, pickupCode });

      expect(res.status).toBe(404);
    });
  });
});

describe("storage fee (Level 3)", () => {
  it("returns the days stored and fee charged based on elapsed time", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00Z"));
    const bank = new LockerBank({
      repository: new InMemoryLockerRepository(),
      clock,
      pricing: { SMALL: { ratePerDay: 10 }, MEDIUM: { ratePerDay: 10 }, LARGE: { ratePerDay: 10 } },
      closingHour: 0,
    });
    const app = createServer(bank);

    const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });
    const ticketRes = await request(app).post("/tickets").send({ ADULT: 1 });
    const rentalRes = await request(app)
      .post("/locker-rentals")
      .send({ size: "SMALL", ticketId: ticketRes.body.id });

    clock.advanceHours(24 * 6); // exactly 6 days

    const res = await request(app)
      .post("/pickups")
      .send({ lockerId: lockerRes.body.id, pickupCode: rentalRes.body.pickupCode });

    expect(res.status).toBe(200);
    expect(res.body.daysStored).toBe(6);
    // 5 days @ 10 + 1 day @ 20
    expect(res.body.feeCharged).toBe(70);
  });
});

describe("POST /pickups open/reopen until closing time", () => {
  function buildApp(startHourUtc: number) {
    const clock = new FakeClock(new Date(`2026-01-01T${String(startHourUtc).padStart(2, "0")}:00:00Z`));
    const bank = new LockerBank({
      repository: new InMemoryLockerRepository(),
      clock,
      pricing: { SMALL: { ratePerDay: 10 }, MEDIUM: { ratePerDay: 10 }, LARGE: { ratePerDay: 10 } },
      closingHour: 19,
    });
    return { app: createServer(bank), clock };
  }

  async function rent(app: ReturnType<typeof createServer>) {
    await request(app).post("/lockers").send({ size: "SMALL" });
    const ticketRes = await request(app).post("/tickets").send({ ADULT: 1 });
    const rentalRes = await request(app)
      .post("/locker-rentals")
      .send({ size: "SMALL", ticketId: ticketRes.body.id });
    return { lockerId: rentalRes.body.lockerId as string, pickupCode: rentalRes.body.pickupCode as string };
  }

  it("reports opened (not retrieved) and keeps the locker occupied during the day", async () => {
    const { app } = buildApp(9);
    const { lockerId, pickupCode } = await rent(app);

    const res = await request(app).post("/pickups").send({ lockerId, pickupCode });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "opened", lockerId });

    const listRes = await request(app).get("/lockers");
    expect(listRes.body.find((l: { id: string }) => l.id === lockerId).available).toBe(false);
  });

  it("accepts the same PIN repeatedly, then finalizes after closing time", async () => {
    const { app, clock } = buildApp(9);
    const { lockerId, pickupCode } = await rent(app);

    const first = await request(app).post("/pickups").send({ lockerId, pickupCode });
    const second = await request(app).post("/pickups").send({ lockerId, pickupCode });
    expect(first.body.status).toBe("opened");
    expect(second.body.status).toBe("opened");

    clock.advanceHours(10); // 19:00 -- park closed
    const final = await request(app).post("/pickups").send({ lockerId, pickupCode });

    expect(final.status).toBe(200);
    expect(final.body.status).toBe("retrieved");
    expect(final.body.feeCharged).toBe(10);

    const listRes = await request(app).get("/lockers");
    expect(listRes.body.find((l: { id: string }) => l.id === lockerId).available).toBe(true);
  });
});

describe("receipt emails", () => {
  function buildAppWithMailer() {
    const bank = new LockerBank({ repository: new InMemoryLockerRepository() });
    const mailer = { sendReceipt: vi.fn().mockResolvedValue(undefined) };
    const app = createServer(bank, { mailer });
    return { app, mailer };
  }

  it("sends a receipt when the ticket has an email", async () => {
    const { app, mailer } = buildAppWithMailer();
    await request(app).post("/lockers").send({ size: "SMALL" });
    const ticketRes = await request(app).post("/tickets").send({ ADULT: 1, email: "visitor@example.com" });

    const rentalRes = await request(app)
      .post("/locker-rentals")
      .send({ size: "SMALL", ticketId: ticketRes.body.id });

    expect(rentalRes.status).toBe(201);
    expect(mailer.sendReceipt).toHaveBeenCalledTimes(1);
    expect(mailer.sendReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "visitor@example.com",
        ticketId: ticketRes.body.id,
        lockerId: rentalRes.body.lockerId,
        pickupCode: rentalRes.body.pickupCode,
      }),
    );
  });

  it("does not send an email when the ticket has none", async () => {
    const { app, mailer } = buildAppWithMailer();
    await request(app).post("/lockers").send({ size: "SMALL" });
    const ticketRes = await request(app).post("/tickets").send({ ADULT: 1 });

    await request(app).post("/locker-rentals").send({ size: "SMALL", ticketId: ticketRes.body.id });

    expect(mailer.sendReceipt).not.toHaveBeenCalled();
  });

  it("rejects an invalid email on ticket purchase", async () => {
    const { app } = buildAppWithMailer();
    const res = await request(app).post("/tickets").send({ ADULT: 1, email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("still returns 201 for the rental even if sending the email fails", async () => {
    const bank = new LockerBank({ repository: new InMemoryLockerRepository() });
    const mailer = { sendReceipt: vi.fn().mockRejectedValue(new Error("smtp down")) };
    const app = createServer(bank, { mailer });
    await request(app).post("/lockers").send({ size: "SMALL" });
    const ticketRes = await request(app).post("/tickets").send({ ADULT: 1, email: "visitor@example.com" });

    const rentalRes = await request(app)
      .post("/locker-rentals")
      .send({ size: "SMALL", ticketId: ticketRes.body.id });

    expect(rentalRes.status).toBe(201);
  });
});
