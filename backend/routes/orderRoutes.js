const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect, admin } = require("../middleware/auth");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getInvoice,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/", protect, asyncHandler(createOrder));
router.get("/", protect, asyncHandler(getMyOrders));

// Admin (static paths before the "/:id" param route)
router.get("/all", protect, admin, asyncHandler(getAllOrders));
router.patch("/:id/status", protect, admin, asyncHandler(updateOrderStatus));

// Owner/admin single order + owner cancel
router.get("/:id", protect, asyncHandler(getOrderById));
router.get("/:id/invoice", protect, asyncHandler(getInvoice));
router.patch("/:id/cancel", protect, asyncHandler(cancelOrder));

module.exports = router;
