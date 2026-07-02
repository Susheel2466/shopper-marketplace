# SHOPPER — Full-Stack E-Commerce Marketplace

A production-style, multi-vendor e-commerce platform: catalog with variants,
search, cart, coupons, COD/card checkout with GST, orders + fulfillment,
reviews, wishlist, returns, seller accounts, and an admin dashboard.

- **Frontend:** React 19 + Vite 8, React Router 7, Context API, Vitest
- **Backend:** Node/Express, MongoDB (Mongoose), JWT auth, Jest + supertest
- **Optional integrations** (all off by default, graceful fallbacks): Stripe,
  Meilisearch, Redis, Cloudinary, Shiprocket, SMTP email, Sentry

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | 22 tested |
| MongoDB | 6+ | local `mongod` or MongoDB Atlas |
| Docker | any | only for optional Meilisearch / Redis |

---

## Quick start

Two processes: backend (`:4000`) and frontend (`:3000`).

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env          # then edit values (see "Environment" below)
npm run seed                  # loads 36 products, coupons, admin, 2 sellers
npm run dev                   # http://localhost:4000  (nodemon; `npm start` for plain node)

# 2. Frontend (new terminal, from repo root)
npm install
cp .env.example .env          # API URL (public defaults)
# put keys in .env.local (gitignored) — see "Environment"
npm run dev                   # http://localhost:3000
```

Open http://localhost:3000. The app runs fully on **MongoDB + COD** with no
third-party keys.

---

## Default logins (after `npm run seed`)

| Role | Email | Password |
|------|-------|----------|
| Admin | value of `ADMIN_EMAIL` (default `admin@shopper.com`) | value of `ADMIN_PASSWORD` (default `admin123`) |
| Seller | `seller1@shopper.com` / `seller2@shopper.com` | `seller123` |
| Customer | sign up in the UI | — |

Admin credentials are controlled by `ADMIN_EMAIL` / `ADMIN_PASSWORD` in
`backend/.env`. Change them there and re-run `npm run seed`.

---

## Environment

Env files are **gitignored** — commit only the `.example` templates. In
production, set these in your host's dashboard instead of files.

### Frontend (repo root)

Every `VITE_` var is inlined into the browser bundle, so it is **public** —
never put a real secret here.

- `.env` — non-secret defaults (e.g. `VITE_API_URL`)
- `.env.local` — your keys / machine overrides (loaded last, wins)

| Var | Purpose |
|-----|---------|
| `VITE_API_URL` | Backend base URL (default `http://localhost:4000/api`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key; blank = mock card form |

### Backend (`backend/.env`)

| Var | Required | Purpose |
|-----|----------|---------|
| `PORT` | — | API port (default 4000) |
| `MONGO_URI` | ✅ | Mongo connection string |
| `JWT_SECRET` | ✅ | Long random string (server refuses weak values in prod) |
| `JWT_EXPIRES_IN` / `JWT_REMEMBER_EXPIRES_IN` | — | Session lengths (`1d` / `30d`) |
| `CLIENT_URL` | — | Allowed CORS origin(s), comma-separated |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | Seeded admin account |

---

## Optional integrations

Each is **off by default** and falls back to a built-in behavior. Set the env
var(s) to switch it on — no code changes needed.

| Integration | Enable with | Fallback when blank | Install |
|-------------|-------------|---------------------|---------|
| **Stripe** (card payments) | `STRIPE_SECRET_KEY` + `VITE_STRIPE_PUBLISHABLE_KEY` | mock card processor | built-in |
| **Meilisearch** (search) | `MEILI_HOST` + `MEILI_KEY` | MongoDB regex search | built-in |
| **Redis** (cache) | `REDIS_URL` | in-memory cache | `npm i ioredis` |
| **Cloudinary** (image CDN) | `CLOUDINARY_URL` | local `public/images` disk | `npm i cloudinary` |
| **Shiprocket** (courier) | `COURIER_PROVIDER=shiprocket` + `SHIPROCKET_*` | rule-based ETA + synthetic tracking | built-in |
| **SMTP** (email) | `SMTP_HOST/PORT/USER/PASS` | logs emails to console | built-in |
| **Sentry** (errors) | `SENTRY_DSN` | disabled | built-in |

### Meilisearch (recommended for real search)

```bash
docker run -d --name shopper-meili -p 7700:7700 \
  -e MEILI_MASTER_KEY=devkey123 getmeili/meilisearch:v1.10
# backend/.env:  MEILI_HOST=http://127.0.0.1:7700  MEILI_KEY=devkey123
cd backend && npm run index   # sync catalog into the index
```

The index stays in sync automatically on product create/edit/delete;
`npm run index` re-syncs everything on demand.

### Redis

```bash
docker run -d --name shopper-redis -p 6379:6379 redis:7-alpine
cd backend && npm i ioredis
# backend/.env:  REDIS_URL=redis://127.0.0.1:6379
```

Cache calls fail open — if Redis is down, the app serves from MongoDB.

### Cloudinary

```bash
cd backend && npm i cloudinary
# backend/.env:  CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>
```

Copy the URL verbatim from the Cloudinary dashboard. Uploaded product images
then return a CDN URL (required once deployed — hosted disks are ephemeral).

### Shiprocket

```
# backend/.env
COURIER_PROVIDER=shiprocket
SHIPROCKET_EMAIL=api-user@yourdomain.com
SHIPROCKET_PASSWORD=...
COURIER_PICKUP_PINCODE=560001
COURIER_PICKUP_NAME=Primary
```

> Verify Shiprocket's request/response field names against your account docs
> the first time you enable it — courier APIs change. Any failure falls back to
> the rule-based estimate so checkout never breaks.

---

## Tests

```bash
# Backend (Jest + supertest, needs a reachable MongoDB)
cd backend && npm test

# Frontend (Vitest + React Testing Library)
npm test
```

CI runs both on push/PR — see `.github/workflows/ci.yml`.

---

## Project structure

```
ecommerce-ui/
├─ src/                      # Frontend (Vite/React)
│  ├─ Pages/                 # Shop, Product, Cart, Checkout, Orders, Profile,
│  │                         #   Admin*, Seller*, LoginSignup, Wishlist, ...
│  ├─ Components/            # Navbar, Hero, Item, ProtectedRoute, Reviews, ...
│  ├─ Context/               # Shop, Auth, Wishlist, Toast providers
│  ├─ services/api.js        # All backend calls
│  └─ hooks/
├─ backend/
│  ├─ app.js                 # Express app (mounts routes, middleware) — testable
│  ├─ server.js              # Connects Mongo + listens
│  ├─ models/                # Product, Order, User, Coupon, Review, Return, ...
│  ├─ controllers/           # Route handlers
│  ├─ routes/                # /api/* route definitions
│  ├─ middleware/            # auth (protect/admin/seller), validators
│  ├─ utils/                 # cache, searchEngine, courier, computeCart, email
│  ├─ scripts/               # seed.js, index-search.js
│  └─ tests/                 # Jest + supertest
└─ .github/workflows/ci.yml
```

### API surface (`/api/*`)

`products` · `auth` · `orders` · `coupons` · `payments` · `wishlist` ·
`addresses` · `admin` (stats) · `returns` · `seller` · `uploads` · `shipping` ·
`newsletter`

---

## Deployment (outline)

1. **Database:** MongoDB Atlas → set `MONGO_URI`.
2. **Backend:** deploy to Render/Railway/Fly; set env vars in the dashboard
   (never ship `.env`). Set `NODE_ENV=production`, a strong `JWT_SECRET`, and
   `CLIENT_URL` to the frontend origin.
3. **Frontend:** `npm run build` → deploy `build/` to Vercel/Netlify; set
   `VITE_API_URL` to the deployed API.
4. **Images:** enable Cloudinary (hosted filesystems are wiped on redeploy).
5. Optionally enable Meilisearch, Redis, Stripe, Shiprocket, SMTP, Sentry.
