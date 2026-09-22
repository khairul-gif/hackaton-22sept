export type Size = "SMALL" | "MEDIUM" | "LARGE";

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

export interface StoreSuccess {
  lockerId: string;
  pickupCode: string;
}

export interface RetrieveSuccess {
  lockerId: string;
  packageId: string;
  size: Size;
  daysStored: number;
  feeCharged: number;
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

export function storePackage(size: Size): Promise<StoreSuccess> {
  return request("/packages", { method: "POST", body: JSON.stringify({ size }) });
}

export function retrievePackage(lockerId: string, pickupCode: string): Promise<RetrieveSuccess> {
  return request("/pickups", { method: "POST", body: JSON.stringify({ lockerId, pickupCode }) });
}
