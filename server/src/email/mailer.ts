import nodemailer from "nodemailer";
import type { TicketLineItem } from "../domain/ticket.js";

export interface ReceiptEmailInput {
  to: string;
  ticketId: string;
  lineItems: TicketLineItem[];
  entryPrice: number;
  lockerId: string;
  pickupCode: string;
  zoneLabel: string;
  ratePerDay: number;
}

export interface Mailer {
  sendReceipt(input: ReceiptEmailInput): Promise<void>;
}

function renderReceiptText(input: ReceiptEmailInput): string {
  const lines = input.lineItems
    .map((li) => `  ${li.type} x ${li.quantity} @ ${li.unitPrice} = ${li.quantity * li.unitPrice}`)
    .join("\n");

  return [
    "Thanks for your purchase!",
    "",
    `Ticket: ${input.ticketId}`,
    lines,
    `Entry total paid: ${input.entryPrice}`,
    "",
    `Locker: ${input.lockerId} (${input.zoneLabel})`,
    `PIN: ${input.pickupCode}`,
    `Storage rate: ${input.ratePerDay}/day, billed to this ticket when you pick up.`,
    "",
    "Keep this email safe -- the locker ID and PIN are what you'll need to reopen your locker.",
  ].join("\n");
}

/**
 * Builds an SMTP-backed Mailer from SMTP_HOST/SMTP_USER/SMTP_PASS env vars.
 * Returns null (rather than throwing) when they're not set, so the server
 * can still run locally without email configured -- callers should treat a
 * null mailer as "sending is disabled".
 */
export function createSmtpMailer(): Mailer | null {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    secure: false, // STARTTLS on 587, the standard SES SMTP port
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  const from = SMTP_FROM || SMTP_USER;

  return {
    async sendReceipt(input) {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: `Your Amusement eTicketing & Smart Locker receipt (${input.ticketId})`,
        text: renderReceiptText(input),
      });
    },
  };
}
