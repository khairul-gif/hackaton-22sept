import type { Size } from "./size.js";

/** An occupancy record: a package currently sitting in a locker. */
export interface Package {
  id: string;
  size: Size;
  lockerId: string;
  pickupCode: string;
  storedAt: Date;
}
