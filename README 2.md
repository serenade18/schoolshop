# SchoolShop frontend

React + Vite single-page app for every SchoolShop audience: the public shop, parents, schools, publishers and platform admins. See [`../docs/DESIGN.md`](../docs/DESIGN.md) for the product design and API contract.

## Stack

React 19 · Vite · TypeScript · React Router · Zustand · Axios · TanStack Query · Zod · React Hook Form · shadcn/ui + Tailwind CSS 4

## Getting started

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The backend doesn't exist yet, so `.env.development` sets `VITE_USE_MOCKS=true`: API calls are answered in the browser by `src/mocks/adapter.ts`, using the same URLs and response shapes the Django REST Framework API will use. To point at a real API, set `VITE_USE_MOCKS=false` (Vite proxies `/api` to `localhost:8000`).

### Demo accounts (mock mode)

The one-time code is always `123456`.

| Role | Phone |
|---|---|
| Parent | 0712 345 678 |
| School admin | 0722 000 111 |
| Publisher | 0700 000 444 |
| Platform admin | 0799 000 999 |

At checkout, any M-Pesa number ending in `000` simulates a declined payment.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Oxlint |
| `npm run preview` | Serve the production build |

## Layout

```
src/
  app/router.tsx        routes, per-role guards, lazy-loaded role areas
  lib/api/              schemas.ts (Zod contracts), client.ts (Axios), endpoints.ts, queries.ts (TanStack Query)
  stores/               auth.ts, cart.ts (Zustand, persisted)
  components/ui/        shadcn/ui primitives (components.json is set up for the shadcn CLI)
  components/layout/    PublicLayout, ParentLayout, DashboardLayout, RequireRole
  components/common/    shared app components
  pages/                public/, auth/, parent/, school/, publisher/, admin/
  mocks/                fixtures and the mock Axios adapter
```

Brand tokens (ink, paper, sun, flame…) live in `src/index.css` and are available as Tailwind utilities, e.g. `bg-ink`, `text-accent-text`, `from-sun to-flame`.

## What's built

- Public site: home with school search, shop by grade, school page with per-grade lists
- Sign in with phone + SMS code
- Parent: children, booklist (untick owned items, optional extras), checkout with M-Pesa, payment waiting/paid/failed, order tracking, order history
- School overview, publisher school orders with pick list, platform admin overview
- Every other dashboard menu entry routes to a placeholder until it's built
