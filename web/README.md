# Locker UI

Minimal React + TypeScript frontend for the locker system, driven entirely
by the REST API in `../server`. Three panels on one page:

- **Lockers** — live availability grid
- **Delivery Agent** — create lockers, store a package, see the pickup code
- **Customer** — retrieve a package with locker ID + pickup code, see the
  storage fee

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
