const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth");
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistController");

const router = express.Router();

router.get("/", protect, asyncHandler(getWishlist));
router.post("/:id", protect, asyncHandler(addToWishlist));
router.delete("/:id", protect, asyncHandler(removeFromWishlist));

module.exports = router;
