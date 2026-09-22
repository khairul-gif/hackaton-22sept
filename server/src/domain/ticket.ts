import type { TicketType } from "./ticketType.js";

export interface TicketLineItem {
  type: TicketType;
  quantity: number;
  unitPrice: number;
}

/**
 * A park admission ticket order (one or more people, possibly a mix of
 * Adult/Child/OKU). Locker rentals are billed against the ticket that
 * funded them, so the visitor's locker fee shows up on the same account
 * as their entry fee.
 */
export interface Ticket {
  id: string;
  lineItems: TicketLineItem[];
  entryPrice: number;
  purchasedAt: Date;
  /** Optional -- when given, a receipt email is sent once a locker is rented against this ticket. */
  email?: string;
}

export interface TicketSummary {
  ticket: Ticket;
  lockerCharges: number;
  total: number;
}
