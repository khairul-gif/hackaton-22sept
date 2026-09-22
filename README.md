# Amusement Park Smart Locker

A demo of a self-service locker system for an amusement park, where a
visitor buys entry tickets, rents a storage locker for the day, and pays
for it — all before ever talking to a person.

## The idea

Visitors arriving at the park don't want to carry bags around all day, but
staffed cloakrooms don't scale. This system lets a visitor use a kiosk (or
their phone) to:

1. **Buy tickets** — Adult, Child, or OKU (disabled-visitor) admission, any
   mix, priced per type.
2. **Choose a locker zone** — Zone A/B/C (small/medium/large), each with
   its own daily rate, shown live availability.
3. **Pay and get a PIN** — a simulated checkout opens a locker and hands
   back a PIN.
4. **Reopen the locker later** — enter the locker ID + PIN at any point;
   the storage fee (tiered — cheap for the first few days, steeper the
   longer a locker sits full) is billed to the ticket that funded it.

There's also a lightweight **operator view** for seeding the locker pool
and reopening a locker on someone's behalf — the kind of thing park staff
would use, kept separate from the visitor-facing flow.

## How it's built

- **`server/`** — Express + TypeScript API. Business logic (ticket
  pricing, locker allocation, tiered storage fees, concurrency-safe
  rentals) lives in a framework-free domain layer, tested independently of
  HTTP. See [`server/README.md`](server/README.md) for the full API
  reference and how to demo the tiered fee live without waiting real days.
- **`web/`** — React + TypeScript frontend (Vite), using client-side
  routing so each step of the visitor flow (`/tickets`, `/locker`,
  `/payment`, `/receipt`) is its own page. See
  [`web/README.md`](web/README.md).

## Running it locally

```bash
# terminal 1 — API on http://localhost:3000
cd server && npm install && npm run dev

# terminal 2 — UI on http://localhost:5173 (proxies /api to the server)
cd web && npm install && npm run dev
```

Open http://localhost:5173. Start on the landing page, or go straight to
`/admin` to add a locker or two before running through the visitor flow —
tickets won't have anywhere to rent without at least one locker seeded.
