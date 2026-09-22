import type { Locker, LockerView } from "../domain/locker.js";
import type { Package } from "../domain/package.js";
import type { Size } from "../domain/size.js";
import { compareSize, fits } from "../domain/size.js";

/**
 * Storage boundary for lockers and their current occupant. Kept as an
 * interface so the in-memory implementation used here can later be swapped
 * for a persistent one (e.g. a database) without touching domain logic.
 */
export interface LockerRepository {
  createLocker(id: string, size: Size): Locker;
  getLocker(id: string): Locker | undefined;
  listLockers(): LockerView[];
  /** Unoccupied lockers that can hold `size`, smallest first. */
  findAvailableLockers(size: Size): Locker[];
  assign(lockerId: string, pkg: Package): void;
  getActivePackage(lockerId: string): Package | undefined;
  release(lockerId: string, retrievedAt: Date): void;
  isPickupCodeInUse(code: string): boolean;
}

export class InMemoryLockerRepository implements LockerRepository {
  private readonly lockers = new Map<string, Locker>();
  private readonly occupancy = new Map<string, Package>();
  private readonly lastRetrievedAt = new Map<string, Date>();

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
    return [...this.lockers.values()]
      .filter((locker) => !this.occupancy.has(locker.id) && fits(size, locker.size))
      .sort((a, b) => compareSize(a.size, b.size));
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
}
