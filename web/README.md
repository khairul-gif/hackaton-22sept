# Locker UI

React + TypeScript frontend for the Amusement eTicketing and Smart Locker
Solution, driven entirely by the REST API in `../server`. Client-side
routed (react-router) — each step is its own page rather than a single
panel:

- **`/`** — landing page, "Start" into the visitor flow
- **`/tickets`** — buy Adult/Child/OKU tickets (pick a quantity per type)
- **`/locker`** — choose a locker zone; shows live availability
- **`/payment`** — review the order and pay (simulated checkout)
- **`/receipt`** — confirms payment, shows the locker ID + PIN
- **`/admin`** — operator view: seed lockers, reopen a locker with its
  PIN (not part of the visitor flow)

## Running

The dev server proxies `/api/*` to `http://localhost:3000` (see
`vite.config.ts`), so start the backend first.

```bash
# terminal 1
cd ../server && npm install && npm run dev

# terminal 2
npm install
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

## Build

```bash
npm run build
```
