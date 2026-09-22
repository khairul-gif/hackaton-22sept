import { Router } from "express";
import type { LockerBank } from "../domain/lockerBank.js";
import { isSize } from "../domain/size.js";
import type { TicketType } from "../domain/ticketType.js";
import { TICKET_TYPE_INFO, TICKET_TYPES } from "../domain/ticketType.js";
import { ZONES } from "../domain/zone.js";

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

  router.get("/zones", (_req, res) => {
    res.status(200).json(ZONES);
  });

  router.get("/ticket-types", (_req, res) => {
    res.status(200).json(TICKET_TYPES.map((type) => TICKET_TYPE_INFO[type]));
  });

  router.post("/tickets", (req, res) => {
    const body = req.body ?? {};
    const quantities: Record<TicketType, number> = { ADULT: 0, CHILD: 0, OKU: 0 };

    for (const type of TICKET_TYPES) {
      const value = body[type];
      if (value === undefined) continue;
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        res.status(400).json({ error: `${type} must be a non-negative integer` });
        return;
      }
      quantities[type] = value;
    }

    const totalTickets = TICKET_TYPES.reduce((sum, type) => sum + quantities[type], 0);
    if (totalTickets === 0) {
      res.status(400).json({ error: "At least one ticket (ADULT, CHILD, or OKU) is required" });
      return;
    }

    const ticket = bank.purchaseTicket(quantities);
    res.status(201).json(ticket);
  });

  router.get("/tickets/:ticketId", (req, res) => {
    const summary = bank.getTicketSummary(req.params.ticketId);
    if (!summary) {
      res.status(404).json({ error: "No ticket exists with that id." });
      return;
    }

    res.status(200).json({
      id: summary.ticket.id,
      lineItems: summary.ticket.lineItems,
      entryPrice: summary.ticket.entryPrice,
      purchasedAt: summary.ticket.purchasedAt,
      lockerCharges: summary.lockerCharges,
      total: summary.total,
    });
  });

  router.post("/locker-rentals", async (req, res) => {
    const { ticketId, size } = req.body ?? {};
    if (typeof size !== "string" || !isSize(size)) {
      res.status(400).json({ error: "size must be one of SMALL, MEDIUM, LARGE" });
      return;
    }
    if (typeof ticketId !== "string" || !ticketId) {
      res.status(400).json({ error: "ticketId is required" });
      return;
    }

    const result = await bank.storePackage(size, ticketId);

    switch (result.status) {
      case "stored":
        res.status(201).json({ lockerId: result.lockerId, pickupCode: result.pickupCode });
        return;
      case "no_locker_available":
        res.status(422).json({ error: "No suitable locker is available for this zone." });
        return;
      case "ticket_not_found":
        res.status(404).json({ error: "No ticket exists with that id. Buy a ticket first." });
        return;
    }
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
          ticketId: result.package.ticketId,
          ticketTotal: result.ticketTotal,
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
