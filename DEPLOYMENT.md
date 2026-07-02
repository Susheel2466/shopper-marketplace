# Deployment — Vercel (frontend) + Render (backend) + MongoDB Atlas

This deploys the SHOPPER app to production:

- **Frontend** (React/Vite) → **Vercel**
- **Backend** (Express API) → **Render** (uses `render.yaml`)
- **Database** → **MongoDB Atlas**
- **Images** → **Cloudinary** (recommended — Render's disk is wiped on redeploy)

Config files are already in the repo: [vercel.json](vercel.json),
[render.yaml](render.yaml), `.nvmrc`, and `engines` in both `package.json`s.

Accounts you'll need (all have free tiers): GitHub, MongoDB Atlas, Render, Vercel.

---

## Order matters

Backend and frontend each need the other's URL, so deploy in this order:

1. Push to GitHub
2. MongoDB Atlas → get `MONGO_URI`
3. Backend on Render → get the API URL
4. Seed the database
5. Frontend on Vercel (set `VITE_API_URL` = the Render URL) → get the site URL
6. Back to Render: set `CLIENT_URL` = the Vercel URL, redeploy (fixes CORS)
7. (Recommended) Enable Cloudinary for uploads

---

## Step 0 — Push to GitHub

The repo has no remote yet. Create an **empty** GitHub repo (no README), then:

```bash
git add -A
git commit -m "Full-stack SHOPPER app ready for deployment"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`node_modules`, `.env*`, `.mongo-data`, and runtime `upload_*` images are
gitignored; the 36 catalog images and all source are committed.

---

## Step 1 — MongoDB Atlas

1. Create a free **M0** cluster (any region).
2. **Database Access** → add a user (username + password). Save these.
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — Render's
   egress IPs aren't fixed on the free tier).
4. **Connect → Drivers** → copy the SRV string and insert your password and a
   db name:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/shopper?retryWrites=true&w=majority
   ```
   This is your `MONGO_URI`.

---

## Step 2 — Backend on Render

1. **New → Blueprint**, pick your GitHub repo. Render reads `render.yaml` and
   creates the `shopper-api` web service (root dir `backend`, `node server.js`,
   health check `/`). `JWT_SECRET` is auto-generated.
2. When prompted, fill the `sync:false` env vars:
   - `MONGO_URI` = your Atlas string
   - `CLIENT_URL` = `http://localhost:3000` for now (you'll fix it in Step 6)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` = your admin login
3. Deploy. When live, note the URL, e.g. `https://shopper-api.onrender.com`.
   Open it — you should see `{"status":"ok"}`.

> Free tier sleeps after ~15 min idle; the first request then takes ~30–60s to
> wake. Fine for a demo; upgrade the plan to keep it warm.

---

## Step 3 — Seed the database

Point the seed at Atlas from your machine (one-time):

```bash
cd backend
MONGO_URI="<your-atlas-uri>" ADMIN_EMAIL="<you>" ADMIN_PASSWORD="<pw>" npm run seed
```

Loads 36 products, coupons, the admin, and 2 sellers into Atlas. (Alternatively,
use Render's **Shell** tab and run `npm run seed` there.)

---

## Step 4 — Frontend on Vercel

1. **Add New → Project**, import the same repo. Vercel auto-detects Vite and
   reads `vercel.json` (build → `build/`, SPA rewrites).
2. **Environment Variables** → add:
   - `VITE_API_URL` = `https://shopper-api.onrender.com/api`  ← note the `/api`
3. Deploy. Note the site URL, e.g. `https://shopper.vercel.app`.

> `VITE_` vars are baked in at **build time** — after changing `VITE_API_URL`
> you must redeploy for it to take effect.

---

## Step 5 — Fix CORS (connect the two)

1. In **Render → shopper-api → Environment**, set `CLIENT_URL` to your exact
   Vercel URL (`https://shopper.vercel.app`, no trailing slash). Add multiple
   comma-separated if you have a custom domain too.
2. Save → Render redeploys. The API now accepts requests from your frontend.

Verify: open the Vercel site, sign up, browse, add to cart, place a COD order,
log in as admin, mark it shipped.

---

## Step 6 — Cloudinary for uploads (recommended)

Render's filesystem is ephemeral, so admin/seller image uploads written to disk
vanish on the next deploy. Point uploads at Cloudinary instead:

1. Create a free Cloudinary account → copy the `CLOUDINARY_URL` from the
   dashboard (`cloudinary://<key>:<secret>@<cloud_name>`).
2. In `backend/package.json` add `cloudinary` (or run `npm i cloudinary` and
   commit the lockfile) so it's installed on Render.
3. In **Render → Environment**, add `CLOUDINARY_URL`. Redeploy.

The 36 catalog images are committed and served fine either way; this only
affects **new** uploads. (Verified: the upload route auto-switches to Cloudinary
when `CLOUDINARY_URL` is set.)

---

## Optional integrations (add anytime in Render → Environment)

| Feature | Vars |
|---|---|
| Card payments | `STRIPE_SECRET_KEY` (+ `VITE_STRIPE_PUBLISHABLE_KEY` on Vercel) |
| Search | `MEILI_HOST`, `MEILI_KEY` (needs a hosted Meilisearch) |
| Cache | `REDIS_URL` (+ `npm i ioredis`) |
| Courier | `COURIER_PROVIDER=shiprocket`, `SHIPROCKET_*` |
| Email | `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` |
| Error tracking | `SENTRY_DSN` |

Each falls back gracefully when unset — see [README.md](README.md).

---

## Redeploys

Both platforms auto-deploy on push to `main`. Backend env changes redeploy on
save; frontend `VITE_` changes require a redeploy to rebuild.
