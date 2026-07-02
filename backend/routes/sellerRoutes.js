const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect, admin, seller } = require("../middleware/auth");
const {
  applyToSell,
  getSellerProducts,
  getSellerOrders,
  getSellerStats,
} = require("../controllers/sellerController");

const router = express.Router();

// Any logged-in user can apply.
router.post("/apply", protect, asyncHandler(applyToSell));

// Approved-seller dashboard.
router.get("/products", protect, seller, asyncHandler(getSellerProducts));
router.get("/orders", protect, seller, asyncHandler(getSellerOrders));
router.get("/stats", protect, seller, asyncHandler(getSellerStats));

module.exports = router;
