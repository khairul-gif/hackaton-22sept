import { createServer } from "./api/server.js";
import { createFriendlyIdGenerator } from "./domain/id.js";
import { LockerBank } from "./domain/lockerBank.js";
import { ManualClock } from "./domain/manualClock.js";
import { InMemoryLockerRepository } from "./repository/lockerRepository.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// Opt-in: fast-forward the server's clock via POST /dev/clock/advance, so
// Level 3's tiered storage fee can be demoed live instead of waiting real
// days. Off by default -- the server otherwise runs on real wall-clock time.
const devClockEnabled = process.env.ENABLE_DEV_CLOCK === "true";

const clock = devClockEnabled ? new ManualClock() : undefined;

const bank = new LockerBank({
  repository: new InMemoryLockerRepository(),
  ...(clock ? { clock } : {}),
  // Short, memorable locker ids (L1-4821, L2-0193, ...) are easy to read
  // and type when demoing the store/retrieve flow by hand. Package ids stay
  // random UUIDs since they're never user-facing.
  lockerIdGenerator: createFriendlyIdGenerator("L"),
});

const app = createServer(bank, clock ? { devClock: clock } : {});

app.listen(PORT, () => {
  console.log(`Locker server listening on http://localhost:${PORT}`);
  if (devClockEnabled) {
    console.log("Dev clock enabled: GET /dev/clock, POST /dev/clock/advance { hours }");
  }
});
