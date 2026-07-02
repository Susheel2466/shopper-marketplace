const Return = require("../models/Return");
const Order = require("../models/Order");

// POST /api/returns   (protected)   body: { orderId, reason }
// A customer requests a return for a delivered order.
const requestReturn = async (req, res) => {
  const { orderId, reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "A reason is required" });
  }

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (String(order.user) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  if (order.status !== "delivered") {
    return res
      .status(400)
      .json({ message: "Only delivered orders can be returned" });
  }

  const existing = await Return.findOne({ order: orderId });
  if (existing) {
    return res
      .status(409)
      .json({ message: "A return request already exists for this order" });
  }

  const ret = await Return.create({
    order: orderId,
    user: req.user._id,
    reason: reason.trim(),
    amount: order.amount,
  });
  res.status(201).json(ret);
};

// GET /api/returns   (protected) - the user's return requests
const getMyReturns = async (req, res) => {
  const returns = await Return.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(returns);
};

// GET /api/returns/all   (admin)
const getAllReturns = async (req, res) => {
  const returns = await Return.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(returns);
};

// PATCH /api/returns/:id   (admin)   body: { status }
const updateReturnStatus = async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected", "refunded"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const ret = await Return.findById(req.params.id).populate("user", "name email");
  if (!ret) return res.status(404).json({ message: "Return not found" });

  ret.status = status;
  await ret.save();

  // When refunded, mark the underlying order cancelled.
  if (status === "refunded") {
    await Order.updateOne({ _id: ret.order }, { status: "cancelled" });
  }
  res.json(ret);
};

module.exports = {
  requestReturn,
  getMyReturns,
  getAllReturns,
  updateReturnStatus,
};
