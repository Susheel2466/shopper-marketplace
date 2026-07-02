const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "refunded"],
      default: "requested",
    },
    amount: { type: Number, required: true }, // order amount at request time
  },
  { timestamps: true }
);

module.exports = mongoose.model("Return", returnSchema);
