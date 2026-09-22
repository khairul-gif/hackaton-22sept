# Locker Server

Express + TypeScript API for the Amusement Park Smart Locker system:
buy a park ticket, choose a locker zone, pay, and get a PIN to open your
locker.

## Running

```bash
npm install
npm run dev      # starts on http://localhost:3000 (PORT env var to override)
```

## Testing

```bash
npm test
npm run test:watch
npm run typecheck
npm run build      # compiles to dist/
```

Level 3 (tiered storage fee) specifically is covered at three layers —
pure function boundary tests, domain integration tests with a fake clock,
and HTTP-level tests:

```bash
npx vitest run src/domain/pricing.test.ts src/domain/lockerBank.test.ts src/api/routes.test.ts
```

## API

Visitor flow: `GET /ticket-types` (Adult/Child/OKU pricing) → `POST /tickets`
(checkout with a quantity per type) → `GET /zones` (pick a zone/price) →
`POST /locker-rentals` (pay, get a locker + PIN) → `POST /pickups` (enter
the PIN later to reopen the locker; the storage fee is billed to the ticket).

| Method | Path                 | Body                                    | Success                                                                              | Notes                                                                                 |
| ------ | -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| POST   | `/lockers`           | `{ size: "SMALL"\|"MEDIUM"\|"LARGE" }`   | 201 `{ id, size, available }`                                              | operator/seeding endpoint, not part of the visitor flow                              |
| GET    | `/lockers`           | —                                         | 200 `LockerView[]`                                                                     | includes `pickupCode`/`storedAt` while occupied, `lastRetrievedAt` if previously used |
| GET    | `/zones`             | —                                         | 200 `[{ size, label, ratePerDay }]`                                                    | one entry per locker size, e.g. "Zone A" = SMALL                                     |
| GET    | `/ticket-types`      | —                                         | 200 `[{ type, label, price }]`                                                         | `type` is `ADULT`\|`CHILD`\|`OKU`                                                     |
| POST   | `/tickets`           | `{ ADULT?, CHILD?, OKU? }` (quantities)   | 201 `{ id, lineItems, entryPrice, purchasedAt }`                                       | simulated payment, always succeeds; 400 if all quantities are 0/missing               |
| GET    | `/tickets/:ticketId` | —                                         | 200 `{ id, lineItems, entryPrice, purchasedAt, lockerCharges, total }`                 | 404 unknown ticket                                                                    |
| POST   | `/locker-rentals`    | `{ ticketId, size }`                      | 201 `{ lockerId, pickupCode }`                                                         | pickupCode is the locker PIN; 404 unknown ticket, 422 if no locker fits/is free       |
| POST   | `/pickups`           | `{ lockerId, pickupCode }`                | 200 `{ lockerId, packageId, size, daysStored, feeCharged, ticketId, ticketTotal }`     | 404 unknown locker / empty locker, 400 wrong PIN; fee is billed to the ticket         |

### Demoing Level 3 live (no waiting real days)

The server normally runs on the real system clock. To manually watch the
tiered storage fee apply through the running app instead of trusting the
test suite, start it with the dev clock enabled:

```bash
ENABLE_DEV_CLOCK=true npm run dev
```

This mounts two extra routes (absent otherwise — `GET /dev/clock` returns
404 without the flag):

| Method | Path                 | Body                | Effect                           |
| ------ | -------------------- | ------------------- | -------------------------------- |
| GET    | `/dev/clock`         | —                   | current server time              |
| POST   | `/dev/clock/advance` | `{ hours: number }` | fast-forwards the server's clock |

```bash
# buy a ticket, rent a locker, then jump 6 days forward and retrieve it
curl -X POST localhost:3000/lockers        -d '{"size":"SMALL"}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/tickets        -d '{"ADULT":1}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/locker-rentals -d '{"ticketId":"<ticketId>","size":"SMALL"}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/dev/clock/advance -d '{"hours":144}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/pickups        -d '{"lockerId":"<id>","pickupCode":"<pin>"}' -H 'Content-Type: application/json'
# -> daysStored: 6, feeCharged: 70  (5 days @ X=10 + 1 day @ 2X=20)
```

## Layout

```
src/
  domain/       pure business logic — no Express dependency
  repository/   storage interface + in-memory implementation
  api/          Express routes and app wiring
  testUtils/    FakeClock etc., shared across test files
```
