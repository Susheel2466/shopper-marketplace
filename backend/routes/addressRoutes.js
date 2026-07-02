const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth");
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/addressController");

const router = express.Router();

router.get("/", protect, asyncHandler(getAddresses));
router.post("/", protect, asyncHandler(addAddress));
router.put("/:addrId", protect, asyncHandler(updateAddress));
router.delete("/:addrId", protect, asyncHandler(deleteAddress));

module.exports = router;
