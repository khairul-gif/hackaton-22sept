export type Size = "SMALL" | "MEDIUM" | "LARGE";
export type TicketType = "ADULT" | "CHILD" | "OKU";

export interface LockerView {
  id: string;
  size: Size;
  available: boolean;
  /** Present only while a package is currently stored in this locker. */
  pickupCode?: string;
  /** ISO timestamp; present only while a package is currently stored in this locker. */
  storedAt?: string;
  /** ISO timestamp of the most recent retrieval from this locker, if any. */
  lastRetrievedAt?: string;
}

export interface Zone {
  size: Size;
  label: string;
  ratePerDay: number;
}

export interface TicketTypeInfo {
  type: TicketType;
  label: string;
  price: number;
}

export interface TicketLineItem {
  type: TicketType;
  quantity: number;
  unitPrice: number;
}

export interface Ticket {
  id: string;
  lineItems: TicketLineItem[];
  entryPrice: number;
  purchasedAt: string;
  email?: string;
}

export interface TicketSummary {
  id: string;
  lineItems: TicketLineItem[];
  entryPrice: number;
  purchasedAt: string;
  lockerCharges: number;
  total: number;
}

export interface DemoLocker {
  lockerId: string;
  pickupCode: string;
}

export interface StoreSuccess {
  lockerId: string;
  pickupCode: string;
  /** A second locker auto-occupied for trying the reopen flow without another checkout. */
  demoLocker: DemoLocker | null;
}

export interface RetrieveSuccess {
  lockerId: string;
  packageId: string;
  size: Size;
  daysStored: number;
  feeCharged: number;
  ticketId: string;
  ticketTotal: number;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body && typeof body === "object" && "error" in body ? (body as { error: string }).error : null)
      ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export function listLockers(): Promise<LockerView[]> {
  return request("/lockers");
}

export function createLocker(size: Size): Promise<LockerView> {
  return request("/lockers", { method: "POST", body: JSON.stringify({ size }) });
}

export function listZones(): Promise<Zone[]> {
  return request("/zones");
}

export function listTicketTypes(): Promise<TicketTypeInfo[]> {
  return request("/ticket-types");
}

export function purchaseTicket(quantities: Record<TicketType, number>, email?: string): Promise<Ticket> {
  return request("/tickets", {
    method: "POST",
    body: JSON.stringify(email ? { ...quantities, email } : quantities),
  });
}

export function getTicketSummary(ticketId: string): Promise<TicketSummary> {
  return request(`/tickets/${ticketId}`);
}

export function createLockerRental(ticketId: string, size: Size): Promise<StoreSuccess> {
  return request("/locker-rentals", { method: "POST", body: JSON.stringify({ ticketId, size }) });
}

export function retrievePackage(lockerId: string, pickupCode: string): Promise<RetrieveSuccess> {
  return request("/pickups", { method: "POST", body: JSON.stringify({ lockerId, pickupCode }) });
}
