const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const evaluateCoupon = require("./evaluateCoupon");

const GST_RATE = 0.18; // 18% GST

// Computes the authoritative order total from item ids + an optional coupon,
// pulling prices from the DB so the client can never set its own total.
// Shared by createPaymentIntent and createOrder so the two always agree.
//
// Returns { error } on failure, otherwise:
//   { orderItems, subtotal, discount, appliedPromo, couponDoc, finalAmount }
const computeCart = async (items, promoCode) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Order must contain items" };
  }

  const ids = items.map((i) => Number(i.productId));
  const products = await Product.find({ id: { $in: ids } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = byId.get(Number(item.productId));
    if (!product) {
      return { error: `Product ${item.productId} not found` };
    }
    const quantity = Number(item.quantity) || 0;
    if (quantity < 1) continue;

    const size = item.size || "";
    const color = item.color || "";
    const label = `"${product.name}"${size ? ` (${size}${color ? `/${color}` : ""})` : ""}`;

    // Find the matching variant and check its stock.
    const variants = product.variants || [];
    const variant = variants.find(
      (v) => (v.size || "") === size && (v.color || "") === color
    );
    // If the product has variants, a matching one must exist with enough stock.
    if (variants.length > 0) {
      if (!variant) {
        return { error: `Selected option for ${label} is unavailable.` };
      }
      if (variant.stock < quantity) {
        return {
          error:
            variant.stock === 0
              ? `${label} is out of stock.`
              : `Only ${variant.stock} left of ${label}.`,
        };
      }
    }

    subtotal += product.new_price * quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.new_price,
      quantity,
      size,
      color,
      seller: product.seller,
      sellerName: product.sellerName || "SHOPPER",
    });
  }

  if (orderItems.length === 0) {
    return { error: "Order must contain items" };
  }

  let appliedPromo = null;
  let discount = 0;
  let couponDoc = null;
  if (promoCode) {
    couponDoc = await Coupon.findOne({ code: promoCode.toUpperCase() });
    const result = evaluateCoupon(couponDoc, subtotal);
    if (result.valid) {
      discount = result.discountAmount;
      appliedPromo = result.code;
    } else {
      couponDoc = null;
    }
  }

  const taxable = subtotal - discount;
  const tax = Number((taxable * GST_RATE).toFixed(2));
  const finalAmount = Number(taxable.toFixed(2)); // pre-tax (items - discount)
  const grandTotal = Number((taxable + tax).toFixed(2)); // charged to the customer
  return {
    orderItems,
    subtotal: Number(subtotal.toFixed(2)),
    discount,
    appliedPromo,
    couponDoc,
    finalAmount,
    tax,
    grandTotal,
  };
};

module.exports = computeCart;
