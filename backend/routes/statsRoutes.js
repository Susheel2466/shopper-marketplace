const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect, admin } = require("../middleware/auth");
const { getStats } = require("../controllers/statsController");
const {
  listSellers,
  setSellerApproval,
} = require("../controllers/sellerController");

const router = express.Router();

router.get("/stats", protect, admin, asyncHandler(getStats));

// Admin seller management
router.get("/sellers", protect, admin, asyncHandler(listSellers));
router.patch("/sellers/:id", protect, admin, asyncHandler(setSellerApproval));

module.exports = router;
