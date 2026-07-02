const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const savedAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String, default: "" },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["user", "admin", "seller"], default: "user" },
    // Seller fields (used when role === "seller")
    shopName: { type: String, default: "" },
    sellerApproved: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 0.1 }, // platform's cut (10%)
    wishlist: { type: [Number], default: [] }, // numeric product ids
    addresses: { type: [savedAddressSchema], default: [] },
  },
  { timestamps: true }
);

// Hash the password before saving whenever it changed.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
