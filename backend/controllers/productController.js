const Product = require("../models/Product");
const {
  searchEnabled,
  meiliSearch,
  meiliSuggest,
  indexOne,
  removeOne,
} = require("../utils/searchEngine");
const cache = require("../utils/cache");

// Convert a stored image into a fully-qualified URL the frontend can use
// directly as an <img src>. A bare filename (e.g. "product_1.png") is served
// from /images; a full URL (http...) is passed through unchanged.
const withImageUrl = (req) => (product) => {
  const obj = product.toObject ? product.toObject() : product;
  const image =
    obj.image && /^https?:\/\//i.test(obj.image)
      ? obj.image
      : `${req.protocol}://${req.get("host")}/images/${obj.image}`;
  const totalStock = (obj.variants || []).reduce((s, v) => s + (v.stock || 0), 0);
  return { ...obj, image, totalStock, inStock: totalStock > 0 };
};

// GET /api/products  (cached ~60s; invalidated on any product mutation)
const getProducts = async (req, res) => {
  let products = await cache.get("products:all");
  if (!products) {
    products = await Product.find({ available: true }).sort({ id: 1 }).lean();
    await cache.set("products:all", products, 60000);
  }
  res.json(products.map(withImageUrl(req)));
};

// GET /api/products/popular
const getPopularProducts = async (req, res) => {
  const products = await Product.find({ popular: true }).sort({ id: 1 });
  res.json(products.map(withImageUrl(req)));
};

// GET /api/products/newcollections
const getNewCollections = async (req, res) => {
  const products = await Product.find({ newCollection: true }).sort({ id: 1 });
  res.json(products.map(withImageUrl(req)));
};

// GET /api/products/search
// Query: search, category, brand, minPrice, maxPrice, sort, page, limit
// Returns { items, total, page, pages, brands } — server-side filter/sort/paginate.
const searchProducts = async (req, res) => {
  const {
    search,
    category,
    brand,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 12,
  } = req.query;

  const filter = { available: true };
  if (search) filter.name = { $regex: String(search).trim(), $options: "i" };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (minPrice || maxPrice) {
    filter.new_price = {};
    if (minPrice) filter.new_price.$gte = Number(minPrice);
    if (maxPrice) filter.new_price.$lte = Number(maxPrice);
  }

  const sortMap = {
    price_asc: { new_price: 1 },
    price_desc: { new_price: -1 },
    rating: { avgRating: -1 },
    newest: { createdAt: -1 },
  };
  const sortBy = sortMap[sort] || { id: 1 };

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * perPage;

  // Use Meilisearch when configured (relevance + typo tolerance + facets).
  if (searchEnabled()) {
    const result = await meiliSearch({
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      sort,
      page: pageNum,
      limit: perPage,
    });
    result.items = result.items.map(withImageUrl(req));
    return res.json(result);
  }

  const [items, total, brands] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(perPage),
    Product.countDocuments(filter),
    // distinct brands within the current category (for the filter UI)
    Product.distinct("brand", category ? { category, available: true } : { available: true }),
  ]);

  res.json({
    items: items.map(withImageUrl(req)),
    total,
    page: pageNum,
    pages: Math.ceil(total / perPage),
    brands: brands.sort(),
  });
};

// GET /api/products/suggest?q= - lightweight autocomplete (max 6)
const suggest = async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);

  if (searchEnabled()) {
    const hits = await meiliSuggest(q);
    return res.json(
      hits.map((h) => ({ id: h.pk, name: h.name, image: withImageUrl(req)(h).image }))
    );
  }

  const products = await Product.find({
    available: true,
    name: { $regex: q, $options: "i" },
  })
    .limit(6)
    .select("id name image");
  res.json(products.map((p) => ({ id: p.id, name: p.name, image: withImageUrl(req)(p).image })));
};

// GET /api/products/brands - distinct brands grouped by category (for the menu)
const getBrands = async (req, res) => {
  const rows = await Product.aggregate([
    { $match: { available: true } },
    { $group: { _id: "$category", brands: { $addToSet: "$brand" } } },
  ]);
  const grouped = rows.reduce((acc, r) => {
    acc[r._id] = r.brands.sort();
    return acc;
  }, {});
  res.json(grouped);
};

// GET /api/products/admin   (admin) - every product, including unavailable
const getAllProductsAdmin = async (req, res) => {
  const products = await Product.find().sort({ id: 1 });
  res.json(products.map(withImageUrl(req)));
};

// GET /api/products/:id/recommended
// Same category (and ideally same brand) as the product, excluding itself.
const getRecommended = async (req, res) => {
  const id = Number(req.params.id);
  const product = await Product.findOne({ id });
  if (!product) return res.json([]);

  // Prefer same brand, then fill from same category.
  const sameBrand = await Product.find({
    id: { $ne: id },
    category: product.category,
    brand: product.brand,
    available: true,
  }).limit(4);

  let recs = sameBrand;
  if (recs.length < 4) {
    const more = await Product.find({
      id: { $ne: id, $nin: recs.map((p) => p.id) },
      category: product.category,
      available: true,
    }).limit(4 - recs.length);
    recs = recs.concat(more);
  }

  res.json(recs.map(withImageUrl(req)));
};

// GET /api/products/:id   (numeric id)
const getProductById = async (req, res) => {
  const product = await Product.findOne({ id: Number(req.params.id) });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json(withImageUrl(req)(product));
};

// POST /api/products   (admin)   auto-assigns the next numeric id
const createProduct = async (req, res) => {
  const {
    name,
    category,
    image,
    new_price,
    old_price,
    variants,
    sizes,
    colors,
    popular,
    newCollection,
    available,
  } = req.body;

  if (!name || !category || new_price == null || old_price == null) {
    return res
      .status(400)
      .json({ message: "name, category, new_price and old_price are required" });
  }

  const last = await Product.findOne().sort({ id: -1 }).select("id");
  const nextId = (last ? last.id : 0) + 1;

  const cleanVariants = Array.isArray(variants)
    ? variants
        .filter((v) => v && (v.size || v.color))
        .map((v) => ({ size: v.size || "", color: v.color || "", stock: Number(v.stock) || 0 }))
    : [];

  const product = await Product.create({
    id: nextId,
    name,
    category,
    image: image || "product_1.png",
    new_price,
    old_price,
    variants: cleanVariants,
    sizes: Array.isArray(sizes) ? sizes : [...new Set(cleanVariants.map((v) => v.size).filter(Boolean))],
    colors: Array.isArray(colors) ? colors : [...new Set(cleanVariants.map((v) => v.color).filter(Boolean))],
    // Ownership: the creating seller owns it; admins list under "SHOPPER".
    seller: req.user._id,
    sellerName: req.user.role === "seller" ? req.user.shopName : "SHOPPER",
    popular: Boolean(popular),
    newCollection: Boolean(newCollection),
    available: available != null ? Boolean(available) : true,
  });

  await cache.clear();
  indexOne(product).catch(() => {}); // keep search index in sync (best-effort)
  res.status(201).json(withImageUrl(req)(product));
};

// PUT /api/products/:id   (admin)
const updateProduct = async (req, res) => {
  const allowed = [
    "name",
    "category",
    "image",
    "new_price",
    "old_price",
    "variants",
    "sizes",
    "colors",
    "popular",
    "newCollection",
    "available",
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Normalize variants and keep sizes/colors in sync when variants are edited.
  if (Array.isArray(updates.variants)) {
    updates.variants = updates.variants
      .filter((v) => v && (v.size || v.color))
      .map((v) => ({ size: v.size || "", color: v.color || "", stock: Number(v.stock) || 0 }));
    if (updates.sizes === undefined) {
      updates.sizes = [...new Set(updates.variants.map((v) => v.size).filter(Boolean))];
    }
    if (updates.colors === undefined) {
      updates.colors = [...new Set(updates.variants.map((v) => v.color).filter(Boolean))];
    }
  }

  const existing = await Product.findOne({ id: Number(req.params.id) });
  if (!existing) {
    return res.status(404).json({ message: "Product not found" });
  }
  // Sellers may only edit their own products (admins may edit any).
  if (req.user.role === "seller" && String(existing.seller) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only edit your own products" });
  }

  Object.assign(existing, updates);
  await existing.save();
  await cache.clear();
  indexOne(existing).catch(() => {}); // keep search index in sync
  res.json(withImageUrl(req)(existing));
};

// DELETE /api/products/:id   (owner seller or admin)
const deleteProduct = async (req, res) => {
  const product = await Product.findOne({ id: Number(req.params.id) });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  if (req.user.role === "seller" && String(product.seller) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only delete your own products" });
  }
  await product.deleteOne();
  await cache.clear();
  removeOne(product.id).catch(() => {}); // drop from search index
  res.json({ message: "Product deleted", id: product.id });
};

module.exports = {
  getProducts,
  getPopularProducts,
  getNewCollections,
  searchProducts,
  suggest,
  getBrands,
  getAllProductsAdmin,
  getProductById,
  getRecommended,
  createProduct,
  updateProduct,
  deleteProduct,
};
