export const TICKET_TYPES = ["ADULT", "CHILD", "OKU"] as const;

export type TicketType = (typeof TICKET_TYPES)[number];

export interface TicketTypeInfo {
  type: TicketType;
  label: string;
  price: number;
}

export const TICKET_TYPE_INFO: Record<TicketType, TicketTypeInfo> = {
  ADULT: { type: "ADULT", label: "Adult", price: 50 },
  CHILD: { type: "CHILD", label: "Child", price: 25 },
  OKU: { type: "OKU", label: "OKU", price: 15 },
};

export const DEFAULT_TICKET_PRICING: Record<TicketType, number> = {
  ADULT: TICKET_TYPE_INFO.ADULT.price,
  CHILD: TICKET_TYPE_INFO.CHILD.price,
  OKU: TICKET_TYPE_INFO.OKU.price,
};
