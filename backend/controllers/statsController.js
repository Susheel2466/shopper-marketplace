const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Coupon = require("../models/Coupon");

// GET /api/admin/stats   (admin)
// One call returns the headline numbers for the dashboard.
const getStats = async (req, res) => {
  // Revenue + counts come from non-cancelled orders.
  const paidMatch = { status: { $ne: "cancelled" } };

  const [
    revenueAgg,
    totalOrders,
    ordersByStatus,
    topProductsAgg,
    lowStock,
    totalCustomers,
    couponUsage,
    revenueByDay,
  ] = await Promise.all([
    Order.aggregate([
      { $match: paidMatch },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]),
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: paidMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]),
    // Products whose total variant stock is low.
    Product.aggregate([
      {
        $project: {
          id: 1,
          name: 1,
          totalStock: { $sum: "$variants.stock" },
        },
      },
      { $match: { totalStock: { $lte: 10 } } },
      { $sort: { totalStock: 1 } },
      { $limit: 10 },
    ]),
    User.countDocuments({ role: "user" }),
    Coupon.find({ usedCount: { $gt: 0 } })
      .sort({ usedCount: -1 })
      .select("code usedCount discountType discountValue")
      .limit(5),
    // Last 7 days of revenue for a simple bar chart.
    Order.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 7 },
    ]),
  ]);

  res.json({
    revenue: revenueAgg[0] ? Number(revenueAgg[0].revenue.toFixed(2)) : 0,
    totalOrders,
    totalCustomers,
    ordersByStatus: ordersByStatus.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {}),
    topProducts: topProductsAgg,
    lowStock,
    couponUsage,
    revenueByDay: revenueByDay.reverse(), // chronological
  });
};

module.exports = { getStats };
