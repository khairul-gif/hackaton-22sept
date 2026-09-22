import type { Clock } from "./clock.js";
import type { IdGenerator } from "./id.js";
import { randomId } from "./id.js";
import type { LockerView } from "./locker.js";
import { Mutex } from "./mutex.js";
import type { Package } from "./package.js";
import { generatePickupCode } from "./pickupCode.js";
import type { PricingConfig } from "./pricing.js";
import { DEFAULT_PRICING, billedDays, calculateStorageFee } from "./pricing.js";
import type { Size } from "./size.js";
import type { LockerRepository } from "../repository/lockerRepository.js";

export type StoreResult =
  | { status: "stored"; lockerId: string; pickupCode: string }
  | { status: "no_locker_available" };

export type RetrieveResult =
  | { status: "retrieved"; package: Package; daysStored: number; feeCharged: number }
  | { status: "locker_not_found" }
  | { status: "locker_empty" }
  | { status: "invalid_code" };

export interface LockerBankOptions {
  repository: LockerRepository;
  clock?: Clock;
  /** Id generator for lockers. Defaults to random UUIDs; pass a short/memorable one for demos. */
  lockerIdGenerator?: IdGenerator;
  /** Id generator for packages. Not user-facing, so random UUIDs are fine as-is. */
  packageIdGenerator?: IdGenerator;
  pricing?: PricingConfig;
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
  private readonly pricing: PricingConfig;
  private readonly allocationLock = new Mutex();

  constructor(options: LockerBankOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? { now: () => new Date() };
    this.generateLockerId = options.lockerIdGenerator ?? randomId;
    this.generatePackageId = options.packageIdGenerator ?? randomId;
    this.pricing = options.pricing ?? DEFAULT_PRICING;
  }

  createLocker(size: Size): LockerView {
    const locker = this.repository.createLocker(this.generateLockerId(), size);
    return { ...locker, available: true };
  }

  listLockers(): LockerView[] {
    return this.repository.listLockers();
  }

  async storePackage(size: Size): Promise<StoreResult> {
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
    const feeCharged = calculateStorageFee(daysStored, this.pricing);

    this.repository.release(lockerId, retrievedAt);
    return { status: "retrieved", package: pkg, daysStored, feeCharged };
  }

  private generateUniquePickupCode(): string {
    let code = generatePickupCode();
    while (this.repository.isPickupCodeInUse(code)) {
      code = generatePickupCode();
    }
    return code;
  }
}
