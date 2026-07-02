const User = require("../models/User");
const Product = require("../models/Product");

const imageUrl = (req, image) =>
  image && /^https?:\/\//i.test(image)
    ? image
    : `${req.protocol}://${req.get("host")}/images/${image}`;

// GET /api/wishlist   (protected) - full product objects for the user's wishlist
const getWishlist = async (req, res) => {
  const user = await User.findById(req.user._id).select("wishlist");
  const ids = user ? user.wishlist : [];
  const products = await Product.find({ id: { $in: ids }, available: true });
  res.json(
    products.map((p) => {
      const obj = p.toObject();
      return { ...obj, image: imageUrl(req, obj.image) };
    })
  );
};

// POST /api/wishlist/:id   (protected) - add (idempotent via $addToSet)
const addToWishlist = async (req, res) => {
  const productId = Number(req.params.id);
  const product = await Product.findOne({ id: productId });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  await User.updateOne(
    { _id: req.user._id },
    { $addToSet: { wishlist: productId } }
  );
  const user = await User.findById(req.user._id).select("wishlist");
  res.json({ wishlist: user.wishlist });
};

// DELETE /api/wishlist/:id   (protected) - remove
const removeFromWishlist = async (req, res) => {
  const productId = Number(req.params.id);
  await User.updateOne(
    { _id: req.user._id },
    { $pull: { wishlist: productId } }
  );
  const user = await User.findById(req.user._id).select("wishlist");
  res.json({ wishlist: user.wishlist });
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
