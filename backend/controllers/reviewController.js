const Review = require("../models/Review");
const Product = require("../models/Product");

// Recompute and persist a product's avgRating + numReviews.
const recomputeRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  const avg = stats[0] ? Number(stats[0].avg.toFixed(2)) : 0;
  const count = stats[0] ? stats[0].count : 0;
  await Product.updateOne(
    { id: productId },
    { avgRating: avg, numReviews: count }
  );
};

// GET /api/products/:id/reviews
const getReviews = async (req, res) => {
  const productId = Number(req.params.id);
  const reviews = await Review.find({ product: productId }).sort({ createdAt: -1 });
  res.json(reviews);
};

// POST /api/products/:id/reviews   (protected)   body: { rating, text }
// Upserts: a user editing their review updates it rather than duplicating.
const addReview = async (req, res) => {
  const productId = Number(req.params.id);
  const { rating, text } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  const product = await Product.findOne({ id: productId });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const review = await Review.findOneAndUpdate(
    { product: productId, user: req.user._id },
    { rating, text: text || "", name: req.user.name },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await recomputeRating(productId);
  res.status(201).json(review);
};

module.exports = { getReviews, addReview };
