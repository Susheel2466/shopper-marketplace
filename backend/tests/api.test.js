// Set required env BEFORE requiring the app (read at module load).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET_TEST ||
  "test-secret-0123456789-0123456789-0123456789-abcdef";
process.env.MONGO_URI =
  process.env.MONGO_URI_TEST || "mongodb://127.0.0.1:27017/shopper_test";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const User = require("../models/User");

const ADDRESS = {
  fullName: "Test User",
  phone: "5551234",
  line1: "1 Test St",
  city: "Town",
  state: "CA",
  postalCode: "90001",
  country: "USA",
};

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([
    Product.deleteMany({}),
    Coupon.deleteMany({}),
    User.deleteMany({}),
  ]);
  await Product.create({
    id: 1,
    name: "Test Blouse",
    category: "women",
    image: "product_1.png",
    brand: "TestBrand",
    sizes: ["S", "M"],
    colors: ["Pink"],
    new_price: 50,
    old_price: 80,
    variants: [
      { size: "S", color: "Pink", stock: 5 },
      { size: "M", color: "Pink", stock: 0 },
    ],
    available: true,
  });
  await Coupon.create({
    code: "SHOPPER10",
    discountType: "percent",
    discountValue: 10,
    minOrder: 0,
    active: true,
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

const signup = (email) =>
  request(app)
    .post("/api/auth/signup")
    .send({ name: "Test", email, password: "secret123" });

describe("Auth", () => {
  test("signup returns a token", async () => {
    const res = await signup("a@example.com");
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("a@example.com");
  });

  test("login with correct credentials works", async () => {
    await signup("b@example.com");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "b@example.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test("login with wrong password is rejected", async () => {
    await signup("c@example.com");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "c@example.com", password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  test("short password fails validation", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "X", email: "d@example.com", password: "short" });
    expect(res.status).toBe(400);
  });
});

describe("Products", () => {
  test("GET /api/products returns a list with computed stock", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].totalStock).toBe(5);
  });

  test("search returns paginated shape", async () => {
    const res = await request(app).get("/api/products/search?search=Blouse");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("total");
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});

describe("Coupons", () => {
  test("valid coupon returns discount", async () => {
    const res = await request(app).get("/api/coupons/SHOPPER10?subtotal=100");
    expect(res.body.valid).toBe(true);
    expect(res.body.discountAmount).toBe(10);
  });
  test("unknown coupon is invalid", async () => {
    const res = await request(app).get("/api/coupons/NOPE?subtotal=100");
    expect(res.body.valid).toBe(false);
  });
});

describe("Orders (variant inventory)", () => {
  let token;
  beforeAll(async () => {
    const res = await signup("buyer@example.com");
    token = res.body.token;
  });

  test("order a valid variant decrements only that variant", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: 1, quantity: 2, size: "S", color: "Pink" }],
        shippingAddress: ADDRESS,
        payment: { cardNumber: "4242424242424242" },
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("paid");
    const product = await Product.findOne({ id: 1 });
    const sPink = product.variants.find((v) => v.size === "S" && v.color === "Pink");
    expect(sPink.stock).toBe(3); // 5 - 2
  });

  test("ordering an out-of-stock variant is blocked", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: 1, quantity: 1, size: "M", color: "Pink" }],
        shippingAddress: ADDRESS,
        payment: { cardNumber: "4242424242424242" },
      });
    expect(res.status).toBe(400);
  });

  test("order requires auth", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ productId: 1, quantity: 1, size: "S", color: "Pink" }] });
    expect(res.status).toBe(401);
  });

  test("order requires a shipping address", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: 1, quantity: 1, size: "S", color: "Pink" }],
        payment: { cardNumber: "4242424242424242" },
      });
    expect(res.status).toBe(400);
  });
});
