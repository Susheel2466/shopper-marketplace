# SHOPPER — Backend API

Node/Express + MongoDB API for the SHOPPER ecommerce frontend.

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) **or** a MongoDB Atlas URI

## Setup

```bash
cd backend
npm install
cp .env.example .env          # then edit values as needed
npm run seed                  # load the 36 products into MongoDB
npm run dev                   # start with nodemon (or: npm start)
```

Server runs on `http://localhost:4000` by default.

## Connect the frontend

In the **frontend** project root, create `.env`:

```
REACT_APP_API_URL=http://localhost:4000/api
```

Restart `npm start`. The product catalog, Popular, and New Collections sections
will now load from this API. (Login, orders, and newsletter still use mock logic
in the frontend until you wire those calls — endpoints below are ready.)

## API reference

Base URL: `http://localhost:4000/api`

### Products (public)

| Method | Endpoint                  | Description                |
| ------ | ------------------------- | -------------------------- |
| GET    | `/products`               | All available products     |
| GET    | `/products/popular`       | "Popular in Women" list    |
| GET    | `/products/newcollections`| "New Collections" list     |
| GET    | `/products/:id`           | Single product by numeric id |

Product shape (image is a fully-qualified URL):

```json
{
  "id": 1,
  "name": "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
  "category": "women",
  "image": "http://localhost:4000/images/product_1.png",
  "new_price": 50,
  "old_price": 80.5,
  "popular": true,
  "newCollection": false
}
```

### Auth

| Method | Endpoint        | Body                          | Returns               |
| ------ | --------------- | ----------------------------- | --------------------- |
| POST   | `/auth/signup`  | `{ name, email, password }`   | `{ user, token }`     |
| POST   | `/auth/login`   | `{ email, password }`         | `{ user, token }`     |
| GET    | `/auth/me`      | — (Bearer token)              | `{ user }`            |

### Orders (protected — send `Authorization: Bearer <token>`)

| Method | Endpoint   | Body                                              | Returns      |
| ------ | ---------- | ------------------------------------------------- | ------------ |
| POST   | `/orders`  | `{ items: [{ productId, quantity }], promoCode? }`| created order |
| GET    | `/orders`  | —                                                 | user's orders |

Prices are recomputed server-side from the DB, so the client can't tamper with
totals. Promo `SHOPPER10` applies 10% off.

### Newsletter (public)

| Method | Endpoint       | Body          | Returns        |
| ------ | -------------- | ------------- | -------------- |
| POST   | `/newsletter`  | `{ email }`   | `{ message }`  |

### Payments (Stripe)

| Method | Endpoint                  | Auth   | Body                          | Returns                      |
| ------ | ------------------------- | ------ | ----------------------------- | ---------------------------- |
| POST   | `/payments/create-intent` | Bearer | `{ items, promoCode? }`       | `{ clientSecret, amount }`   |
| POST   | `/payments/webhook`       | —      | raw Stripe event              | `{ received: true }`         |

The amount is always computed **server-side** from the DB. `POST /orders` then
verifies the PaymentIntent was actually `succeeded` for that exact amount before
saving the order.

## Stripe setup (test mode)

1. Create a free account at https://stripe.com and stay in **Test mode**.
2. Copy your keys from https://dashboard.stripe.com/test/apikeys:
   - Secret key `sk_test_...` → backend `.env` `STRIPE_SECRET_KEY`
   - Publishable key `pk_test_...` → frontend `.env` `REACT_APP_STRIPE_PUBLISHABLE_KEY`
3. Restart both servers.

If `STRIPE_SECRET_KEY` is **blank**, the app uses a built-in **mock** processor
(card `4242 4242 4242 4242` succeeds, any number ending `0002` is declined) — so
everything works before you add keys.

### Test cards (Stripe test mode)
- `4242 4242 4242 4242` — succeeds
- `4000 0000 0000 0002` — declined
- Use any future expiry (e.g. `12/34`) and any 3-digit CVC.

### Webhook (optional, for local testing)
```bash
stripe login
stripe listen --forward-to localhost:4000/api/payments/webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

### Going LIVE
Swap the test keys for live keys (`sk_live_...` / `pk_live_...`) in the two
`.env` files and restart. No code changes needed.

## Project structure

```
backend/
├── server.js              # entry point
├── config/db.js           # mongoose connection
├── models/                # Product, User, Order, Newsletter
├── middleware/            # auth (JWT), asyncHandler, errorHandler
├── controllers/           # request handlers
├── routes/                # route definitions
├── data/products.js       # seed catalog (mirrors frontend)
├── scripts/seed.js        # `npm run seed`
└── public/images/         # product images served at /images/*
```
