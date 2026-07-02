const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { validateCoupon } = require("../controllers/couponController");

const router = express.Router();

router.get("/:code", asyncHandler(validateCoupon));

module.exports = router;
