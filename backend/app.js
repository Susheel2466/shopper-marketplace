const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const Sentry = require("@sentry/node");
const pinoHttp = require("pino-http");
const { notFound, errorHandler } = require("./middleware/errorHandler");

// Error tracking — only active when SENTRY_DSN is set.
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const couponRoutes = require("./routes/couponRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const addressRoutes = require("./routes/addressRoutes");
const statsRoutes = require("./routes/statsRoutes");
const returnRoutes = require("./routes/returnRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
const { handleWebhook } = require("./controllers/paymentController");

const isTest = process.env.NODE_ENV === "test";

// Fail fast (in production) on a missing/placeholder JWT secret.
const jwtSecret = process.env.JWT_SECRET || "";
if (!isTest && (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes("change-this"))) {
  const msg =
    "⚠️  Weak or missing JWT_SECRET. Set a long random value in .env " +
    "(e.g. `node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"`).";
  if (process.env.NODE_ENV === "production") {
    console.error(msg);
    process.exit(1);
  } else {
    console.warn(msg);
  }
}

const app = express();

// Structured request logging (quiet under test).
if (process.env.NODE_ENV !== "test") {
  app.use(pinoHttp({ autoLogging: true, level: process.env.LOG_LEVEL || "info" }));
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Stripe webhook needs the raw body — before express.json().
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

app.use(express.json({ limit: "10kb" }));
app.use(mongoSanitize());

// Rate limiting (disabled under test so the suite isn't throttled).
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => isTest,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
  skip: () => isTest,
});
app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);

app.use("/images", express.static(path.join(__dirname, "public/images")));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "SHOPPER API is running" });
});

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/admin", statsRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/shipping", shippingRoutes);

// Sentry error handler (before our own) — only if configured.
if (process.env.SENTRY_DSN && Sentry.setupExpressErrorHandler) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
