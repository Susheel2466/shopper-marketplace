const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const imageUrl = (req, image) =>
  image && /^https?:\/\//i.test(image)
    ? image
    : `${req.protocol}://${req.get("host")}/images/${image}`;

// POST /api/seller/apply   (protected) - a logged-in user applies to sell
const applyToSell = async (req, res) => {
  const { shopName } = req.body;
  if (!shopName || !shopName.trim()) {
    return res.status(400).json({ message: "Shop name is required" });
  }
  const user = await User.findById(req.user._id);
  if (user.role === "admin") {
    return res.status(400).json({ message: "Admins can't be sellers" });
  }
  user.role = "seller";
  user.shopName = shopName.trim();
  user.sellerApproved = false; // requires admin approval
  await user.save();
  res.json({
    message: "Application submitted. Awaiting admin approval.",
    shopName: user.shopName,
    sellerApproved: user.sellerApproved,
  });
};

// GET /api/seller/products   (seller) - this seller's products
const getSellerProducts = async (req, res) => {
  const products = await Product.find({ seller: req.user._id }).sort({ id: 1 });
  res.json(
    products.map((p) => {
      const obj = p.toObject();
      const totalStock = (obj.variants || []).reduce((s, v) => s + (v.stock || 0), 0);
      return { ...obj, image: imageUrl(req, obj.image), totalStock };
    })
  );
};

// GET /api/seller/orders   (seller) - orders containing this seller's items,
// with items filtered to just this seller's and a per-seller subtotal.
const getSellerOrders = async (req, res) => {
  const sellerId = String(req.user._id);
  const orders = await Order.find({ "items.seller": req.user._id }).sort({
    createdAt: -1,
  });
  const shaped = orders.map((o) => {
    const obj = o.toObject();
    const myItems = obj.items.filter((i) => String(i.seller) === sellerId);
    const sellerTotal = myItems.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      _id: obj._id,
      status: obj.status,
      createdAt: obj.createdAt,
      shippingAddress: obj.shippingAddress,
      items: myItems,
      sellerTotal: Number(sellerTotal.toFixed(2)),
    };
  });
  res.json(shaped);
};

// GET /api/seller/stats   (seller)
const getSellerStats = async (req, res) => {
  const sellerId = req.user._id;
  const [productCount, orderAgg] = await Promise.all([
    Product.countDocuments({ seller: sellerId }),
    Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $match: { "items.seller": sellerId } },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          unitsSold: { $sum: "$items.quantity" },
          orders: { $addToSet: "$_id" },
        },
      },
    ]),
  ]);
  const agg = orderAgg[0] || { revenue: 0, unitsSold: 0, orders: [] };
  const commissionRate = req.user.commissionRate ?? 0.1;
  const gross = Number(agg.revenue.toFixed ? agg.revenue.toFixed(2) : agg.revenue);
  res.json({
    productCount,
    unitsSold: agg.unitsSold || 0,
    orderCount: agg.orders ? agg.orders.length : 0,
    grossRevenue: Number((gross || 0).toFixed(2)),
    commissionRate,
    netEarnings: Number(((gross || 0) * (1 - commissionRate)).toFixed(2)),
  });
};

// ---- Admin seller management ----

// GET /api/admin/sellers   (admin)
const listSellers = async (req, res) => {
  const sellers = await User.find({ role: "seller" })
    .select("name email shopName sellerApproved commissionRate createdAt")
    .sort({ createdAt: -1 });
  res.json(sellers);
};

// PATCH /api/admin/sellers/:id   (admin)   body: { sellerApproved }
const setSellerApproval = async (req, res) => {
  const { sellerApproved } = req.body;
  const seller = await User.findOne({ _id: req.params.id, role: "seller" });
  if (!seller) return res.status(404).json({ message: "Seller not found" });
  seller.sellerApproved = Boolean(sellerApproved);
  await seller.save();
  res.json({ id: seller._id, sellerApproved: seller.sellerApproved });
};

module.exports = {
  applyToSell,
  getSellerProducts,
  getSellerOrders,
  getSellerStats,
  listSellers,
  setSellerApproval,
};
