const Coupon = require("../models/Coupon");
const evaluateCoupon = require("../utils/evaluateCoupon");

// GET /api/coupons/:code?subtotal=123
// Always responds 200 with a { valid, message, ... } result so the client can
// show the outcome inline. `subtotal` is needed to check minimum-order rules.
const validateCoupon = async (req, res) => {
  const code = (req.params.code || "").toUpperCase();
  const subtotal = Number(req.query.subtotal) || 0;

  const coupon = await Coupon.findOne({ code });
  const result = evaluateCoupon(coupon, subtotal);
  res.json(result);
};

module.exports = { validateCoupon };
