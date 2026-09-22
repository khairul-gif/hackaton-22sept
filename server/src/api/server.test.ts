import { describe, expect, it } from "vitest";
import request from "supertest";
import { createServer } from "./server.js";
import { LockerBank } from "../domain/lockerBank.js";
import { InMemoryLockerRepository } from "../repository/lockerRepository.js";

function buildApp() {
  const bank = new LockerBank({ repository: new InMemoryLockerRepository() });
  return createServer(bank);
}

describe("health check", () => {
  it("responds ok", async () => {
    const app = buildApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("malformed JSON", () => {
  it("responds 400 instead of crashing", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/lockers")
      .set("Content-Type", "application/json")
      .send("{not valid json");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
