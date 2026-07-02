// Seed coupons. Demonstrates percent vs fixed, minimum order, expiry, and
// usage limits. expiresAt uses explicit dates so seeding is deterministic.

const coupons = [
  {
    code: "SHOPPER10",
    description: "10% off your order",
    discountType: "percent",
    discountValue: 10,
    minOrder: 0,
    expiresAt: null,
    usageLimit: null,
    active: true,
  },
  {
    code: "SAVE20",
    description: "20% off orders over $200",
    discountType: "percent",
    discountValue: 20,
    minOrder: 200,
    expiresAt: null,
    usageLimit: null,
    active: true,
  },
  {
    code: "FLAT15",
    description: "$15 off orders over $100",
    discountType: "fixed",
    discountValue: 15,
    minOrder: 100,
    expiresAt: null,
    usageLimit: null,
    active: true,
  },
  {
    code: "WELCOME5",
    description: "$5 off, first 100 redemptions",
    discountType: "fixed",
    discountValue: 5,
    minOrder: 0,
    expiresAt: null,
    usageLimit: 100,
    active: true,
  },
  {
    code: "EXPIRED50",
    description: "Expired 50% off (for testing expiry)",
    discountType: "percent",
    discountValue: 50,
    minOrder: 0,
    expiresAt: new Date("2020-01-01T00:00:00Z"),
    usageLimit: null,
    active: true,
  },
];

module.exports = coupons;
