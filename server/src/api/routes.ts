import { Router } from "express";
import type { LockerBank } from "../domain/lockerBank.js";
import { isSize } from "../domain/size.js";

export function createLockerRoutes(bank: LockerBank): Router {
  const router = Router();

  router.post("/lockers", (req, res) => {
    const { size } = req.body ?? {};
    if (typeof size !== "string" || !isSize(size)) {
      res.status(400).json({ error: "size must be one of SMALL, MEDIUM, LARGE" });
      return;
    }

    const locker = bank.createLocker(size);
    res.status(201).json(locker);
  });

  router.get("/lockers", (_req, res) => {
    res.status(200).json(bank.listLockers());
  });

  router.post("/packages", async (req, res) => {
    const { size } = req.body ?? {};
    if (typeof size !== "string" || !isSize(size)) {
      res.status(400).json({ error: "size must be one of SMALL, MEDIUM, LARGE" });
      return;
    }

    const result = await bank.storePackage(size);

    if (result.status === "no_locker_available") {
      res.status(422).json({ error: "No suitable locker is available for this package size." });
      return;
    }

    res.status(201).json({ lockerId: result.lockerId, pickupCode: result.pickupCode });
  });

  router.post("/pickups", async (req, res) => {
    const { lockerId, pickupCode } = req.body ?? {};
    if (typeof lockerId !== "string" || !lockerId || typeof pickupCode !== "string" || !pickupCode) {
      res.status(400).json({ error: "lockerId and pickupCode are required" });
      return;
    }

    const result = await bank.retrievePackage(lockerId, pickupCode);

    switch (result.status) {
      case "retrieved":
        res.status(200).json({
          lockerId,
          packageId: result.package.id,
          size: result.package.size,
          daysStored: result.daysStored,
          feeCharged: result.feeCharged,
        });
        return;
      case "locker_not_found":
        res.status(404).json({ error: "No locker exists with that id." });
        return;
      case "locker_empty":
        res.status(404).json({ error: "That locker has no package awaiting pickup." });
        return;
      case "invalid_code":
        res.status(400).json({ error: "Pickup code does not match this locker." });
        return;
    }
  });

  return router;
}
