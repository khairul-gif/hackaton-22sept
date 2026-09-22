import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createServer } from "./server.js";
import { LockerBank } from "../domain/lockerBank.js";
import { InMemoryLockerRepository } from "../repository/lockerRepository.js";
import { FakeClock } from "../testUtils/fakeClock.js";

describe("locker and package routes", () => {
  let app: Express;

  beforeEach(() => {
    const bank = new LockerBank({ repository: new InMemoryLockerRepository() });
    app = createServer(bank);
  });

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
      const storeRes = await request(app).post("/packages").send({ size: "SMALL" });

      const res = await request(app).get("/lockers");

      const view = res.body.find((l: { id: string }) => l.id === lockerRes.body.id);
      expect(view.available).toBe(false);
      expect(view.pickupCode).toBe(storeRes.body.pickupCode);
      expect(view.storedAt).toEqual(expect.any(String));
      expect(new Date(view.storedAt).toString()).not.toBe("Invalid Date");
    });

    it("includes lastRetrievedAt (and no pickupCode) once the package is retrieved", async () => {
      const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });
      const storeRes = await request(app).post("/packages").send({ size: "SMALL" });
      await request(app)
        .post("/pickups")
        .send({ lockerId: lockerRes.body.id, pickupCode: storeRes.body.pickupCode });

      const res = await request(app).get("/lockers");

      const view = res.body.find((l: { id: string }) => l.id === lockerRes.body.id);
      expect(view.available).toBe(true);
      expect(view.pickupCode).toBeUndefined();
      expect(view.storedAt).toBeUndefined();
      expect(new Date(view.lastRetrievedAt).toString()).not.toBe("Invalid Date");
    });
  });

  describe("POST /packages", () => {
    it("stores a package in the smallest available locker and returns a pickup code", async () => {
      const lockerRes = await request(app).post("/lockers").send({ size: "MEDIUM" });

      const res = await request(app).post("/packages").send({ size: "SMALL" });

      expect(res.status).toBe(201);
      expect(res.body.lockerId).toBe(lockerRes.body.id);
      expect(res.body.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it("rejects an invalid package size", async () => {
      const res = await request(app).post("/packages").send({ size: "GIGANTIC" });

      expect(res.status).toBe(400);
    });

    it("returns 422 when no locker can accommodate the package", async () => {
      await request(app).post("/lockers").send({ size: "SMALL" });

      const res = await request(app).post("/packages").send({ size: "LARGE" });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 422 when all fitting lockers are already occupied", async () => {
      await request(app).post("/lockers").send({ size: "SMALL" });
      await request(app).post("/packages").send({ size: "SMALL" });

      const res = await request(app).post("/packages").send({ size: "SMALL" });

      expect(res.status).toBe(422);
    });

    it("marks the locker unavailable after a successful store", async () => {
      const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });
      await request(app).post("/packages").send({ size: "SMALL" });

      const listRes = await request(app).get("/lockers");

      const stored = listRes.body.find((l: { id: string }) => l.id === lockerRes.body.id);
      expect(stored.available).toBe(false);
    });
  });

  describe("POST /pickups", () => {
    async function storeAPackage(size: "SMALL" | "MEDIUM" | "LARGE" = "SMALL") {
      const lockerRes = await request(app).post("/lockers").send({ size });
      const storeRes = await request(app).post("/packages").send({ size });
      return { lockerId: lockerRes.body.id as string, pickupCode: storeRes.body.pickupCode as string };
    }

    it("retrieves a package with the correct locker id and pickup code", async () => {
      const { lockerId, pickupCode } = await storeAPackage();

      const res = await request(app).post("/pickups").send({ lockerId, pickupCode });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ lockerId, size: "SMALL" });
    });

    it("frees the locker so it can be used again", async () => {
      const { lockerId, pickupCode } = await storeAPackage();
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
      const { lockerId } = await storeAPackage();

      const res = await request(app).post("/pickups").send({ lockerId, pickupCode: "WRONGC" });
      expect(res.status).toBe(400);

      const listRes = await request(app).get("/lockers");
      const locker = listRes.body.find((l: { id: string }) => l.id === lockerId);
      expect(locker.available).toBe(false);
    });

    it("rejects retrieving the same package twice", async () => {
      const { lockerId, pickupCode } = await storeAPackage();
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
      pricing: { ratePerDay: 10 },
    });
    const app = createServer(bank);

    const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });
    const storeRes = await request(app).post("/packages").send({ size: "SMALL" });

    clock.advanceHours(24 * 6); // exactly 6 days

    const res = await request(app)
      .post("/pickups")
      .send({ lockerId: lockerRes.body.id, pickupCode: storeRes.body.pickupCode });

    expect(res.status).toBe(200);
    expect(res.body.daysStored).toBe(6);
    // 5 days @ 10 + 1 day @ 20
    expect(res.body.feeCharged).toBe(70);
  });
});
