// Single source of truth for coupon rules. Returns a plain result object so the
// same logic backs both GET /coupons/:code and order creation.
const evaluateCoupon = (coupon, subtotal) => {
  if (!coupon || !coupon.active) {
    return { valid: false, message: "Invalid coupon code." };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, message: "This coupon has expired." };
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: "This coupon is no longer available." };
  }

  if (subtotal < coupon.minOrder) {
    const needed = (coupon.minOrder - subtotal).toFixed(2);
    return {
      valid: false,
      message: `Add $${needed} more to use this coupon (min order $${coupon.minOrder}).`,
    };
  }

  const discountAmount =
    coupon.discountType === "percent"
      ? subtotal * (coupon.discountValue / 100)
      : Math.min(coupon.discountValue, subtotal);

  const label =
    coupon.discountType === "percent"
      ? `${coupon.discountValue}% off`
      : `$${coupon.discountValue} off`;

  return {
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrder: coupon.minOrder,
    discountAmount: Number(discountAmount.toFixed(2)),
    message: `Coupon applied — ${label}!`,
  };
};

module.exports = evaluateCoupon;
