import type { Locker, LockerView } from "../domain/locker.js";
import type { Package } from "../domain/package.js";
import type { Size } from "../domain/size.js";
import { fits } from "../domain/size.js";
import type { Ticket } from "../domain/ticket.js";

/**
 * Storage boundary for lockers and their current occupant. Kept as an
 * interface so the in-memory implementation used here can later be swapped
 * for a persistent one (e.g. a database) without touching domain logic.
 */
export interface LockerRepository {
  createLocker(id: string, size: Size): Locker;
  getLocker(id: string): Locker | undefined;
  listLockers(): LockerView[];
  /** Unoccupied lockers in the given zone/size. */
  findAvailableLockers(size: Size): Locker[];
  assign(lockerId: string, pkg: Package): void;
  getActivePackage(lockerId: string): Package | undefined;
  release(lockerId: string, retrievedAt: Date): void;
  isPickupCodeInUse(code: string): boolean;

  createTicket(ticket: Ticket): Ticket;
  getTicket(id: string): Ticket | undefined;
  /** Adds a locker fee to the ticket's running ledger. */
  chargeTicket(ticketId: string, amount: number): void;
  /** Sum of all locker fees charged against this ticket so far. */
  getTicketCharges(ticketId: string): number;
}

export class InMemoryLockerRepository implements LockerRepository {
  private readonly lockers = new Map<string, Locker>();
  private readonly occupancy = new Map<string, Package>();
  private readonly lastRetrievedAt = new Map<string, Date>();
  private readonly tickets = new Map<string, Ticket>();
  private readonly ticketCharges = new Map<string, number[]>();

  createLocker(id: string, size: Size): Locker {
    const locker: Locker = { id, size };
    this.lockers.set(id, locker);
    return locker;
  }

  getLocker(id: string): Locker | undefined {
    return this.lockers.get(id);
  }

  listLockers(): LockerView[] {
    return [...this.lockers.values()].map((locker) => {
      const activePackage = this.occupancy.get(locker.id);
      const lastRetrieved = this.lastRetrievedAt.get(locker.id);

      return {
        ...locker,
        available: !activePackage,
        ...(activePackage ? { pickupCode: activePackage.pickupCode, storedAt: activePackage.storedAt } : {}),
        ...(lastRetrieved ? { lastRetrievedAt: lastRetrieved } : {}),
      };
    });
  }

  findAvailableLockers(size: Size): Locker[] {
    return [...this.lockers.values()].filter((locker) => !this.occupancy.has(locker.id) && fits(size, locker.size));
  }

  assign(lockerId: string, pkg: Package): void {
    this.occupancy.set(lockerId, pkg);
  }

  getActivePackage(lockerId: string): Package | undefined {
    return this.occupancy.get(lockerId);
  }

  release(lockerId: string, retrievedAt: Date): void {
    this.occupancy.delete(lockerId);
    this.lastRetrievedAt.set(lockerId, retrievedAt);
  }

  isPickupCodeInUse(code: string): boolean {
    for (const pkg of this.occupancy.values()) {
      if (pkg.pickupCode === code) return true;
    }
    return false;
  }

  createTicket(ticket: Ticket): Ticket {
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  getTicket(id: string): Ticket | undefined {
    return this.tickets.get(id);
  }

  chargeTicket(ticketId: string, amount: number): void {
    const charges = this.ticketCharges.get(ticketId) ?? [];
    charges.push(amount);
    this.ticketCharges.set(ticketId, charges);
  }

  getTicketCharges(ticketId: string): number {
    return (this.ticketCharges.get(ticketId) ?? []).reduce((sum, charge) => sum + charge, 0);
  }
}
