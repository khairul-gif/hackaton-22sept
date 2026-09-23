import { Router } from "express";
import type { Mailer } from "../email/mailer.js";
import type { LockerBank } from "../domain/lockerBank.js";
import { isSize } from "../domain/size.js";
import type { TicketType } from "../domain/ticketType.js";
import { TICKET_TYPE_INFO, TICKET_TYPES } from "../domain/ticketType.js";
import { ZONES } from "../domain/zone.js";

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function createLockerRoutes(bank: LockerBank, mailer?: Mailer): Router {
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

    if (body.email !== undefined && !isValidEmail(body.email)) {
      res.status(400).json({ error: "email must be a valid email address" });
      return;
    }

    const ticket = bank.purchaseTicket(quantities, body.email);
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
      case "stored": {
        const demoLocker = await bank.ensureDemoLocker();

        const summary = bank.getTicketSummary(ticketId);
        if (mailer && summary?.ticket.email) {
          const zone = ZONES.find((z) => z.size === size);
          mailer
            .sendReceipt({
              to: summary.ticket.email,
              ticketId,
              lineItems: summary.ticket.lineItems,
              entryPrice: summary.ticket.entryPrice,
              lockerId: result.lockerId,
              pickupCode: result.pickupCode,
              zoneLabel: zone?.label ?? size,
              ratePerDay: zone?.ratePerDay ?? 0,
            })
            // Email is a side channel, not the transaction itself -- a failed
            // send should never fail an otherwise-successful rental.
            .catch((err) => {
              console.error("Failed to send receipt email:", err instanceof Error ? err.message : err);
            });
        }

        res.status(201).json({ lockerId: result.lockerId, pickupCode: result.pickupCode, demoLocker });
        return;
      }
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
      case "opened":
        res.status(200).json({ status: "opened", lockerId });
        return;
      case "retrieved":
        res.status(200).json({
          status: "retrieved",
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
