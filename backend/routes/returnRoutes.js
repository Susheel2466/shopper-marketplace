const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect, admin } = require("../middleware/auth");
const {
  requestReturn,
  getMyReturns,
  getAllReturns,
  updateReturnStatus,
} = require("../controllers/returnController");

const router = express.Router();

router.post("/", protect, asyncHandler(requestReturn));
router.get("/", protect, asyncHandler(getMyReturns));
router.get("/all", protect, admin, asyncHandler(getAllReturns));
router.patch("/:id", protect, admin, asyncHandler(updateReturnStatus));

module.exports = router;
