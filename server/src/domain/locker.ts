import type { Size } from "./size.js";

export interface Locker {
  id: string;
  size: Size;
}

/**
 * Locker plus derived availability/occupancy info, as shown to callers.
 *
 * Exposing the current occupant's pickupCode/storedAt here is a deliberate
 * choice for this system: it's a single shared demo/ops view (delivery
 * agent and customer share one screen), not a customer-facing listing in a
 * multi-tenant product. A real customer-facing API would not return another
 * customer's pickup code from a general listing endpoint.
 */
export interface LockerView extends Locker {
  available: boolean;
  /** Present only while a package is currently stored in this locker. */
  pickupCode?: string;
  /** Present only while a package is currently stored in this locker. */
  storedAt?: Date;
  /** When the most recent package was retrieved from this locker, if ever. */
  lastRetrievedAt?: Date;
}
