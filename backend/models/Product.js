const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    size: { type: String, default: "" },
    color: { type: String, default: "" },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// `id` is a numeric field (kept separate from Mongo's _id) so the frontend can
// keep referencing products by number, exactly like the bundled data did.
const productSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ["women", "men", "kid"],
    },
    image: { type: String, required: true }, // primary image (filename or URL)
    images: { type: [String], default: [] }, // gallery (filenames or URLs)
    brand: { type: String, default: "Generic", index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    sellerName: { type: String, default: "SHOPPER" }, // denormalized shop name
    sizes: { type: [String], default: ["S", "M", "L", "XL", "XXL"] },
    colors: { type: [String], default: [] },
    new_price: { type: Number, required: true },
    old_price: { type: Number, required: true },
    // Per-variant inventory. Sizes/colors above are the selectable options;
    // these hold the actual stock per (size,color) combination.
    variants: { type: [variantSchema], default: [] },
    avgRating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    popular: { type: Boolean, default: false },
    newCollection: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound/secondary indexes for the common storefront queries.
productSchema.index({ category: 1, available: 1 });
productSchema.index({ new_price: 1 });
productSchema.index({ popular: 1 });
productSchema.index({ newCollection: 1 });
productSchema.index({ name: "text", brand: "text" }); // basic text search fallback

module.exports = mongoose.model("Product", productSchema);
