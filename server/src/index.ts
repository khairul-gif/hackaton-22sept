import "dotenv/config";
import { createServer } from "./api/server.js";
import { createFriendlyIdGenerator } from "./domain/id.js";
import { LockerBank } from "./domain/lockerBank.js";
import { ManualClock } from "./domain/manualClock.js";
import { SIZES } from "./domain/size.js";
import { createSmtpMailer } from "./email/mailer.js";
import { InMemoryLockerRepository } from "./repository/lockerRepository.js";

/** How many lockers to seed per zone/size on startup, so the demo has stock without manual setup. */
const LOCKERS_PER_ZONE = 5;

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// Opt-in: fast-forward the server's clock via POST /dev/clock/advance, so
// Level 3's tiered storage fee can be demoed live instead of waiting real
// days. Off by default -- the server otherwise runs on real wall-clock time.
const devClockEnabled = process.env.ENABLE_DEV_CLOCK === "true";

const clock = devClockEnabled ? new ManualClock() : undefined;
const mailer = createSmtpMailer();

const bank = new LockerBank({
  repository: new InMemoryLockerRepository(),
  ...(clock ? { clock } : {}),
  // Short, memorable locker ids (L1-4821, L2-0193, ...) are easy to read
  // and type when demoing the store/retrieve flow by hand. Package ids stay
  // random UUIDs since they're never user-facing.
  lockerIdGenerator: createFriendlyIdGenerator("L"),
  // Ticket ids are shown to the visitor (as a wristband/QR code stand-in),
  // so keep them short and readable too.
  ticketIdGenerator: createFriendlyIdGenerator("T"),
});

for (const size of SIZES) {
  for (let i = 0; i < LOCKERS_PER_ZONE; i++) {
    bank.createLocker(size);
  }
}

const app = createServer(bank, {
  ...(clock ? { devClock: clock } : {}),
  ...(mailer ? { mailer } : {}),
});

app.listen(PORT, () => {
  console.log(`Locker server listening on http://localhost:${PORT}`);
  console.log(`Seeded ${LOCKERS_PER_ZONE} lockers per zone (${SIZES.join(", ")}).`);
  console.log(mailer ? "Receipt emails enabled via SMTP." : "Receipt emails disabled (SMTP_HOST/SMTP_USER/SMTP_PASS not set).");
  if (devClockEnabled) {
    console.log("Dev clock enabled: GET /dev/clock, POST /dev/clock/advance { hours }");
  }
});
