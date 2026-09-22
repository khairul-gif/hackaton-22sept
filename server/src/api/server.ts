import express from "express";
import type { ErrorRequestHandler } from "express";
import type { Mailer } from "../email/mailer.js";
import type { ManualClock } from "../domain/manualClock.js";
import type { LockerBank } from "../domain/lockerBank.js";
import { createDevRoutes } from "./devRoutes.js";
import { createLockerRoutes } from "./routes.js";

const handleJsonErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  next(err);
};

export interface CreateServerOptions {
  /** When set, mounts dev-only /dev/clock routes for fast-forwarding time. Omit in normal use. */
  devClock?: ManualClock;
  /** When set, sends a receipt email after a locker rental if the ticket has an email. Omit to disable. */
  mailer?: Mailer;
}

export function createServer(bank: LockerBank, options: CreateServerOptions = {}) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(createLockerRoutes(bank, options.mailer));

  if (options.devClock) {
    app.use(createDevRoutes(options.devClock));
  }

  app.use(handleJsonErrors);

  return app;
}
