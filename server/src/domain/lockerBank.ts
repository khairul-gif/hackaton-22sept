import type { Clock } from "./clock.js";
import type { IdGenerator } from "./id.js";
import { randomId } from "./id.js";
import type { LockerView } from "./locker.js";
import { Mutex } from "./mutex.js";
import type { Package } from "./package.js";
import { generatePickupCode } from "./pickupCode.js";
import type { PricingTable } from "./pricing.js";
import { DEFAULT_PRICING, billedDays, calculateStorageFee } from "./pricing.js";
import { SIZES, type Size } from "./size.js";
import type { Ticket, TicketLineItem, TicketSummary } from "./ticket.js";
import type { TicketType } from "./ticketType.js";
import { DEFAULT_TICKET_PRICING, TICKET_TYPES } from "./ticketType.js";
import type { LockerRepository } from "../repository/lockerRepository.js";

export type StoreResult =
  | { status: "stored"; lockerId: string; pickupCode: string }
  | { status: "no_locker_available" }
  | { status: "ticket_not_found" };

export type RetrieveResult =
  | { status: "retrieved"; package: Package; daysStored: number; feeCharged: number; ticketTotal: number }
  | { status: "locker_not_found" }
  | { status: "locker_empty" }
  | { status: "invalid_code" };

export interface DemoLocker {
  lockerId: string;
  pickupCode: string;
}

export interface LockerBankOptions {
  repository: LockerRepository;
  clock?: Clock;
  /** Id generator for lockers. Defaults to random UUIDs; pass a short/memorable one for demos. */
  lockerIdGenerator?: IdGenerator;
  /** Id generator for packages. Not user-facing, so random UUIDs are fine as-is. */
  packageIdGenerator?: IdGenerator;
  /** Id generator for tickets. Not user-facing (it's stored on a wristband/QR), random UUIDs are fine. */
  ticketIdGenerator?: IdGenerator;
  pricing?: PricingTable;
  /** Per-ticket-type admission price. */
  ticketPricing?: Record<TicketType, number>;
}

/**
 * Domain service coordinating locker allocation. Deliberately framework-free
 * (no Express) so it can be unit-tested directly and reused behind any
 * transport (REST, CLI, ...).
 */
export class LockerBank {
  private readonly repository: LockerRepository;
  private readonly clock: Clock;
  private readonly generateLockerId: IdGenerator;
  private readonly generatePackageId: IdGenerator;
  private readonly generateTicketId: IdGenerator;
  private readonly pricing: PricingTable;
  private readonly ticketPricing: Record<TicketType, number>;
  private readonly allocationLock = new Mutex();

  // Demo convenience only (see ensureDemoLocker): tracks the one locker kept
  // pre-occupied with a known PIN so "reopen locker" can be tried without
  // running through checkout first. Not part of the real business model.
  private demoTicketId: string | null = null;
  private demoLocker: DemoLocker | null = null;

  constructor(options: LockerBankOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? { now: () => new Date() };
    this.generateLockerId = options.lockerIdGenerator ?? randomId;
    this.generatePackageId = options.packageIdGenerator ?? randomId;
    this.generateTicketId = options.ticketIdGenerator ?? randomId;
    this.pricing = options.pricing ?? DEFAULT_PRICING;
    this.ticketPricing = options.ticketPricing ?? DEFAULT_TICKET_PRICING;
  }

  createLocker(size: Size): LockerView {
    const locker = this.repository.createLocker(this.generateLockerId(), size);
    return { ...locker, available: true };
  }

  listLockers(): LockerView[] {
    return this.repository.listLockers();
  }

  /** Simulated payment: always succeeds and issues a fresh ticket. */
  purchaseTicket(quantities: Record<TicketType, number>, email?: string): Ticket {
    const lineItems: TicketLineItem[] = TICKET_TYPES.filter((type) => quantities[type] > 0).map((type) => ({
      type,
      quantity: quantities[type],
      unitPrice: this.ticketPricing[type],
    }));
    const entryPrice = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);

    return this.repository.createTicket({
      id: this.generateTicketId(),
      lineItems,
      entryPrice,
      purchasedAt: this.clock.now(),
      ...(email ? { email } : {}),
    });
  }

  getTicketSummary(ticketId: string): TicketSummary | undefined {
    const ticket = this.repository.getTicket(ticketId);
    if (!ticket) {
      return undefined;
    }
    const lockerCharges = this.repository.getTicketCharges(ticketId);
    return { ticket, lockerCharges, total: ticket.entryPrice + lockerCharges };
  }

  async storePackage(size: Size, ticketId: string): Promise<StoreResult> {
    if (!this.repository.getTicket(ticketId)) {
      return { status: "ticket_not_found" };
    }

    // Finding an available locker and assigning it must be atomic: with
    // concurrent requests racing for a limited pool of lockers, two calls
    // must never both see the same locker as available and both claim it.
    return this.allocationLock.runExclusive(() => {
      const candidates = this.repository.findAvailableLockers(size);
      const locker = candidates[0];
      if (!locker) {
        return { status: "no_locker_available" };
      }

      const pickupCode = this.generateUniquePickupCode();
      this.repository.assign(locker.id, {
        id: this.generatePackageId(),
        size,
        lockerId: locker.id,
        pickupCode,
        storedAt: this.clock.now(),
        ticketId,
      });

      return { status: "stored", lockerId: locker.id, pickupCode };
    });
  }

  async retrievePackage(lockerId: string, pickupCode: string): Promise<RetrieveResult> {
    const locker = this.repository.getLocker(lockerId);
    if (!locker) {
      return { status: "locker_not_found" };
    }

    const pkg = this.repository.getActivePackage(lockerId);
    if (!pkg) {
      return { status: "locker_empty" };
    }

    if (pkg.pickupCode !== pickupCode) {
      return { status: "invalid_code" };
    }

    const retrievedAt = this.clock.now();
    const daysStored = billedDays(pkg.storedAt, retrievedAt);
    const feeCharged = calculateStorageFee(daysStored, this.pricing[pkg.size]);

    this.repository.release(lockerId, retrievedAt);
    this.repository.chargeTicket(pkg.ticketId, feeCharged);
    const ticketTotal = this.getTicketSummary(pkg.ticketId)?.total ?? feeCharged;

    if (this.demoLocker?.lockerId === lockerId) {
      // Freed by someone trying the demo PIN — the next rental will seed a new one.
      this.demoLocker = null;
    }

    return { status: "retrieved", package: pkg, daysStored, feeCharged, ticketTotal };
  }

  /**
   * Demo convenience, not a real product feature: after a genuine rental
   * succeeds, make sure one other locker is already occupied with a known
   * PIN, so the "reopen locker" flow can be tried immediately without
   * running through ticket purchase + checkout again. Idempotent — reuses
   * the existing demo locker if one is already occupied.
   */
  async ensureDemoLocker(): Promise<DemoLocker | null> {
    if (this.demoLocker) {
      return this.demoLocker;
    }

    if (!this.demoTicketId) {
      this.demoTicketId = this.repository.createTicket({
        id: this.generateTicketId(),
        lineItems: [],
        entryPrice: 0,
        purchasedAt: this.clock.now(),
      }).id;
    }

    for (const size of SIZES) {
      const result = await this.storePackage(size, this.demoTicketId);
      if (result.status === "stored") {
        this.demoLocker = { lockerId: result.lockerId, pickupCode: result.pickupCode };
        return this.demoLocker;
      }
    }

    return null;
  }

  private generateUniquePickupCode(): string {
    let code = generatePickupCode();
    while (this.repository.isPickupCodeInUse(code)) {
      code = generatePickupCode();
    }
    return code;
  }
}
