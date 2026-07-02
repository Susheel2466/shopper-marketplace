// Seed catalog — mirrors the frontend's all_product.js (36 items).
// `image` is just the filename; it's served from /public/images and turned
// into a full URL by the product controller.

const NAMES = {
  women: "Striped Flutter Sleeve Overlap Collar Peplum Hem Blouse",
  men: "Men Green Solid Zippered Full-Zip Slim Fit Bomber Jacket",
  kid: "Boys Orange Colourblocked Hooded Sweatshirt",
};

// Per-id price overrides; everything else defaults to 85.0 / 120.5.
const PRICE_OVERRIDES = {
  1: { new_price: 50.0, old_price: 80.5 },
  3: { new_price: 60.0, old_price: 100.5 },
  4: { new_price: 100.0, old_price: 150.0 },
};

const POPULAR_IDS = new Set([1, 2, 3, 4]);
const NEW_COLLECTION_IDS = new Set([2, 8, 12, 14, 15, 17, 28, 35]);

// Per-id stock overrides to demo low/out-of-stock; everything else gets 50.
const STOCK_OVERRIDES = { 5: 3, 36: 0 };

// Brand pools per category (cycled by id) so the brand filter has real values.
const BRANDS = {
  women: ["Roadster", "H&M", "Biba", "ONLY"],
  men: ["HRX", "Nike", "Levis", "Puma"],
  kid: ["YK", "Max Kids", "Gini & Jony"],
};
const COLORS = {
  women: ["Pink", "White"],
  men: ["Green", "Black"],
  kid: ["Orange", "Blue"],
};

const categoryFor = (id) => {
  if (id <= 12) return "women";
  if (id <= 24) return "men";
  return "kid";
};

const products = Array.from({ length: 36 }, (_, i) => {
  const id = i + 1;
  const category = categoryFor(id);
  const prices = PRICE_OVERRIDES[id] || { new_price: 85.0, old_price: 120.5 };
  const brandPool = BRANDS[category];
  const sizes = ["S", "M", "L", "XL", "XXL"];
  const colors = COLORS[category];
  const perVariantStock =
    STOCK_OVERRIDES[id] !== undefined ? STOCK_OVERRIDES[id] : 50;
  // One inventory row per (size, color) combination.
  const variants = sizes.flatMap((size) =>
    colors.map((color) => ({ size, color, stock: perVariantStock }))
  );
  return {
    id,
    name: NAMES[category],
    category,
    image: `product_${id}.png`,
    images: [`product_${id}.png`],
    brand: brandPool[id % brandPool.length],
    sizes,
    colors,
    new_price: prices.new_price,
    old_price: prices.old_price,
    variants,
    popular: POPULAR_IDS.has(id),
    newCollection: NEW_COLLECTION_IDS.has(id),
    available: true,
  };
});

module.exports = products;
