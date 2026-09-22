import { Router } from "express";
import type { ManualClock } from "../domain/manualClock.js";

/**
 * Dev-only routes for fast-forwarding the server's clock, so Level 3's
 * tiered storage fee can be demoed live (store -> advance -> retrieve)
 * without waiting real days. Only mounted when explicitly enabled — see
 * ENABLE_DEV_CLOCK in index.ts.
 */
export function createDevRoutes(clock: ManualClock): Router {
  const router = Router();

  router.get("/dev/clock", (_req, res) => {
    res.status(200).json({ now: clock.now() });
  });

  router.post("/dev/clock/advance", (req, res) => {
    const { hours } = req.body ?? {};
    if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) {
      res.status(400).json({ error: "hours must be a positive number" });
      return;
    }

    clock.advanceHours(hours);
    res.status(200).json({ now: clock.now() });
  });

  return router;
}
