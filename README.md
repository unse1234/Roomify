# Roomify

A two-sided short-stay rental marketplace (Airbnb pattern) built on the MERN
stack. Guests browse and filter listings, save a wishlist, check availability,
request bookings, message hosts and review completed stays. Hosts create and
manage listings and confirm bookings. There is also an admin role (endpoints
exist; UI is minimal).

- **backend/** — Node 20, Express 5, Mongoose 9, Socket.io (ESM)
- **frontend/** — React 19, Vite, Tailwind 4, React Query 5

## Prerequisites

- Node 20+
- MongoDB **as a replica set** (or MongoDB Atlas). Bookings, reviews and chat
  use multi-document transactions, which fail on a standalone `mongod`. The
  server logs a clear error at boot if the topology can't support them.
  The quickest local option is `docker compose up` (below).
- An [ImageKit](https://imagekit.io) account for property image storage.

## Quick start

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill in MONGO_URI, JWT_SECRET (32+ chars), IMAGEKIT_*
npm install
npm run dev                   # http://localhost:3000  (GET /health, GET /ready)

# 2. Frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:5173

# 3. Optional: seed demo data (Islamabad / Lahore / Karachi / Dubai)
cd backend && npm run seed
```

### With Docker (Mongo replica set + API)

```bash
# needs IMAGEKIT_* exported or in a root .env
docker compose up --build
```

## Environment variables

Both apps validate/read their config from `.env`. See `backend/.env.example`
and `frontend/.env.example` for the full annotated list. Backend highlights:

| Variable | Notes |
|---|---|
| `MONGO_URI` | must point at a replica set |
| `JWT_SECRET` | **32+ characters** — the server refuses to boot otherwise |
| `FRONTEND_URL` | web origin, used for CORS (REST + Socket.io) |
| `COOKIE_SAMESITE` | `none` (cross-site, default) or `lax` (same-site — restores CSRF protection) |
| `TRUST_PROXY` | number of proxies in front of the API; required for correct rate limiting |
| `IMAGEKIT_*` | image storage credentials |

## Scripts

**backend/**

| Script | Purpose |
|---|---|
| `npm run dev` | start with nodemon |
| `npm run lint` / `npm test` | ESLint / node:test suite |
| `npm run seed` | load demo data |
| `npm run sync-indexes` | align DB indexes with the schemas |
| `npm run migrate:chat-pairkey` | one-off conversation uniqueness migration |
| `npm run booking-jobs -- --dry-run` | preview the lifecycle scheduler |

**frontend/**

| Script | Purpose |
|---|---|
| `npm run dev` / `npm run build` | Vite dev server / production build |
| `npm run lint` / `npm test` | ESLint / node:test suite |

## Deploying

- Frontend builds to a static bundle (`npm run build` → `dist/`) — host on any
  static host / CDN.
- Backend: `backend/Dockerfile` builds a production image. Set every variable
  from `.env.example`, point `MONGO_URI` at a replica set, set `TRUST_PROXY`
  to match your load balancer, and gate traffic on `GET /ready` (not
  `/health`). The process handles `SIGTERM` for zero-drop deploys.
- CI (`.github/workflows/ci.yml`) runs lint + test on both apps and build on
  the frontend for every push and PR.

## Architecture notes

See `docs/error-handling.md` for the error-handling contract. Key decisions:
transactional booking with a property-level lock, price snapshotting at
booking time, denormalized read models (property rating, conversation
preview + unread counts), cursor pagination for chat history, and a single
zod-validated config module.
