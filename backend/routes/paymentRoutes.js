const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth");
const { createPaymentIntent } = require("../controllers/paymentController");

const router = express.Router();

// The webhook route is registered separately in server.js (it needs the raw
// body), so only the JSON routes live here.
router.post("/create-intent", protect, asyncHandler(createPaymentIntent));

module.exports = router;
