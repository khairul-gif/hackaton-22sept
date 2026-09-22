import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryLockerRepository } from "./lockerRepository.js";

describe("InMemoryLockerRepository", () => {
  let repo: InMemoryLockerRepository;

  beforeEach(() => {
    repo = new InMemoryLockerRepository();
  });

  describe("findAvailableLockers", () => {
    it("excludes lockers too small for the package", () => {
      repo.createLocker("s1", "SMALL");
      const found = repo.findAvailableLockers("LARGE");
      expect(found).toEqual([]);
    });

    it("sorts matching lockers smallest first", () => {
      repo.createLocker("l1", "LARGE");
      repo.createLocker("m1", "MEDIUM");
      const found = repo.findAvailableLockers("SMALL");
      expect(found.map((l) => l.id)).toEqual(["m1", "l1"]);
    });

    it("excludes occupied lockers", () => {
      repo.createLocker("s1", "SMALL");
      repo.assign("s1", {
        id: "p1",
        size: "SMALL",
        lockerId: "s1",
        pickupCode: "ABC123",
        storedAt: new Date(),
      });
      expect(repo.findAvailableLockers("SMALL")).toEqual([]);
    });
  });

  describe("release", () => {
    it("frees a locker for future assignment", () => {
      repo.createLocker("s1", "SMALL");
      repo.assign("s1", {
        id: "p1",
        size: "SMALL",
        lockerId: "s1",
        pickupCode: "ABC123",
        storedAt: new Date(),
      });

      repo.release("s1", new Date());

      expect(repo.getActivePackage("s1")).toBeUndefined();
      expect(repo.findAvailableLockers("SMALL").map((l) => l.id)).toEqual(["s1"]);
    });

    it("records the retrieval time for listLockers to surface", () => {
      repo.createLocker("s1", "SMALL");
      repo.assign("s1", {
        id: "p1",
        size: "SMALL",
        lockerId: "s1",
        pickupCode: "ABC123",
        storedAt: new Date("2026-01-01T00:00:00Z"),
      });

      const retrievedAt = new Date("2026-01-02T00:00:00Z");
      repo.release("s1", retrievedAt);

      const [view] = repo.listLockers();
      expect(view.lastRetrievedAt).toEqual(retrievedAt);
      expect(view.pickupCode).toBeUndefined();
      expect(view.storedAt).toBeUndefined();
    });
  });

  describe("listLockers", () => {
    it("includes pickupCode and storedAt only while occupied", () => {
      repo.createLocker("s1", "SMALL");
      const storedAt = new Date("2026-01-01T00:00:00Z");
      repo.assign("s1", {
        id: "p1",
        size: "SMALL",
        lockerId: "s1",
        pickupCode: "ABC123",
        storedAt,
      });

      const [view] = repo.listLockers();
      expect(view.available).toBe(false);
      expect(view.pickupCode).toBe("ABC123");
      expect(view.storedAt).toEqual(storedAt);
    });

    it("omits occupancy fields for a locker that was never used", () => {
      repo.createLocker("s1", "SMALL");
      const [view] = repo.listLockers();
      expect(view.pickupCode).toBeUndefined();
      expect(view.storedAt).toBeUndefined();
      expect(view.lastRetrievedAt).toBeUndefined();
    });
  });

  describe("isPickupCodeInUse", () => {
    it("is true only while the package remains active", () => {
      repo.createLocker("s1", "SMALL");
      repo.assign("s1", {
        id: "p1",
        size: "SMALL",
        lockerId: "s1",
        pickupCode: "ZZ9999",
        storedAt: new Date(),
      });

      expect(repo.isPickupCodeInUse("ZZ9999")).toBe(true);

      repo.release("s1", new Date());

      expect(repo.isPickupCodeInUse("ZZ9999")).toBe(false);
    });
  });
});
