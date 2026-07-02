const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, default: "" },
    color: { type: String, default: "" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sellerName: { type: String, default: "SHOPPER" },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, default: "card" },
    provider: { type: String, enum: ["mock", "stripe"], default: "mock" },
    last4: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["unpaid", "paid", "failed"],
      default: "unpaid",
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    amount: { type: Number, required: true }, // grand total charged (incl. tax)
    subtotalAmount: { type: Number, default: 0 }, // items total before discount
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 }, // GST
    paymentMethod: { type: String, enum: ["card", "cod"], default: "card" },
    promoCode: { type: String, default: null },
    trackingNumber: { type: String, default: "" },
    courierName: { type: String, default: "" },
    expectedDelivery: { type: Date, default: null },
    shippingAddress: { type: addressSchema, required: true },
    payment: { type: paymentSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ "items.seller": 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model("Order", orderSchema);
