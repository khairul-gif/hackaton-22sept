import { createContext, useContext } from "react";
import type { StoreSuccess, Ticket, TicketType, TicketTypeInfo, Zone } from "../api";

export interface KioskContextValue {
  ticketTypes: TicketTypeInfo[];
  zones: Zone[];
  quantities: Record<TicketType, number>;
  /** Optional -- when set, a receipt email is sent once the locker rental succeeds. */
  email: string;
  selectedZone: Zone | null;
  ticket: Ticket | null;
  rental: StoreSuccess | null;
  busy: boolean;
  error: string | null;
  /** Set when ticket types / zones failed to load (e.g. the API server is unreachable). */
  loadError: string | null;
  setQuantity: (type: TicketType, quantity: number) => void;
  setEmail: (email: string) => void;
  selectZone: (zone: Zone) => void;
  pay: () => Promise<void>;
  reset: () => void;
  retryLoad: () => void;
}

export const KioskContext = createContext<KioskContextValue | null>(null);

/** Cart/checkout state shared across the /tickets, /locker, /payment and /receipt pages. */
export function useKiosk(): KioskContextValue {
  const ctx = useContext(KioskContext);
  if (!ctx) {
    throw new Error("useKiosk must be used within the kiosk flow (KioskLayout)");
  }
  return ctx;
}
