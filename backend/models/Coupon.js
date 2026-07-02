const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, default: "" },
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      required: true,
    },
    // For "percent" this is 0-100; for "fixed" it's a currency amount.
    discountValue: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0 }, // minimum subtotal to qualify
    expiresAt: { type: Date, default: null }, // null = never expires
    usageLimit: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
