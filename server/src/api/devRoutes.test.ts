import { describe, expect, it } from "vitest";
import request from "supertest";
import { createServer } from "./server.js";
import { LockerBank } from "../domain/lockerBank.js";
import { ManualClock } from "../domain/manualClock.js";
import { InMemoryLockerRepository } from "../repository/lockerRepository.js";

describe("dev clock routes", () => {
  it("are not mounted when no devClock is provided", async () => {
    const bank = new LockerBank({ repository: new InMemoryLockerRepository() });
    const app = createServer(bank);

    const res = await request(app).get("/dev/clock");

    expect(res.status).toBe(404);
  });

  it("report the current time and advance it on request", async () => {
    const clock = new ManualClock(new Date("2026-01-01T00:00:00Z"));
    const bank = new LockerBank({ repository: new InMemoryLockerRepository(), clock });
    const app = createServer(bank, { devClock: clock });

    const before = await request(app).get("/dev/clock");
    expect(before.status).toBe(200);
    expect(before.body.now).toBe("2026-01-01T00:00:00.000Z");

    const advanced = await request(app).post("/dev/clock/advance").send({ hours: 26 });
    expect(advanced.status).toBe(200);
    expect(advanced.body.now).toBe("2026-01-02T02:00:00.000Z");
  });

  it("rejects a non-positive or missing hours value", async () => {
    const clock = new ManualClock(new Date("2026-01-01T00:00:00Z"));
    const bank = new LockerBank({ repository: new InMemoryLockerRepository(), clock });
    const app = createServer(bank, { devClock: clock });

    const missing = await request(app).post("/dev/clock/advance").send({});
    expect(missing.status).toBe(400);

    const negative = await request(app).post("/dev/clock/advance").send({ hours: -1 });
    expect(negative.status).toBe(400);
  });

  it("lets Level 3's tiered fee be demoed end-to-end by fast-forwarding time", async () => {
    const clock = new ManualClock(new Date("2026-01-01T00:00:00Z"));
    const bank = new LockerBank({
      repository: new InMemoryLockerRepository(),
      clock,
      pricing: { ratePerDay: 10 },
    });
    const app = createServer(bank, { devClock: clock });

    const lockerRes = await request(app).post("/lockers").send({ size: "SMALL" });
    const storeRes = await request(app).post("/packages").send({ size: "SMALL" });

    // Jump 6 days forward, entirely through the same HTTP interface a demo would use.
    await request(app).post("/dev/clock/advance").send({ hours: 24 * 6 });

    const pickupRes = await request(app)
      .post("/pickups")
      .send({ lockerId: lockerRes.body.id, pickupCode: storeRes.body.pickupCode });

    expect(pickupRes.status).toBe(200);
    expect(pickupRes.body.daysStored).toBe(6);
    // 5 days @ 10 + 1 day @ 20 (tier 2 rate) = 70
    expect(pickupRes.body.feeCharged).toBe(70);
  });
});
