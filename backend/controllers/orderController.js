const Order = require("../models/Order");
const Product = require("../models/Product");
const computeCart = require("../utils/computeCart");
const processPayment = require("../utils/processPayment");
const { stripe, stripeEnabled } = require("../utils/stripe");
const Coupon = require("../models/Coupon");
const {
  sendMail,
  orderConfirmationEmail,
  orderStatusEmail,
} = require("../utils/email");
const { createShipment } = require("../utils/courier");

const REQUIRED_ADDRESS_FIELDS = [
  "fullName",
  "phone",
  "line1",
  "city",
  "state",
  "postalCode",
  "country",
];

// Verifies/charges payment and returns the payment sub-document, or an
// { error, status } the caller should respond with.
// - Stripe mode: confirm a PaymentIntent created earlier was actually paid
//   for the expected amount (client can't fake it).
// - Mock mode: run the local mock processor on the card number.
const settlePayment = async ({ paymentIntentId, payment, finalAmount }) => {
  if (stripeEnabled() && paymentIntentId) {
    // Expand latest_charge — recent Stripe API versions don't include `charges`
    // on the PaymentIntent by default.
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    if (intent.status !== "succeeded") {
      return { error: "Payment was not completed.", status: 402 };
    }
    if (intent.amount !== Math.round(finalAmount * 100)) {
      return { error: "Payment amount mismatch.", status: 400 };
    }
    const last4 =
      intent.latest_charge?.payment_method_details?.card?.last4 || "";
    return {
      payment: {
        method: "card",
        provider: "stripe",
        last4,
        transactionId: intent.id,
        status: "paid",
      },
    };
  }

  // Mock fallback (no Stripe configured).
  const result = await processPayment({
    cardNumber: payment && payment.cardNumber,
    amount: finalAmount,
  });
  if (!result.success) {
    return { error: result.message || "Payment failed", status: 402 };
  }
  return {
    payment: {
      method: "card",
      provider: "mock",
      last4: result.last4,
      transactionId: result.transactionId,
      status: "paid",
    },
  };
};

// POST /api/orders   (protected)
// body: { items: [{productId, quantity}], promoCode?, shippingAddress, payment? | paymentIntentId? }
const createOrder = async (req, res) => {
  const {
    items,
    promoCode,
    shippingAddress,
    payment,
    paymentIntentId,
    paymentMethod = "card",
  } = req.body;

  // Shipping address is required and must be complete.
  if (
    !shippingAddress ||
    REQUIRED_ADDRESS_FIELDS.some(
      (f) => !shippingAddress[f] || !String(shippingAddress[f]).trim()
    )
  ) {
    return res
      .status(400)
      .json({ message: "A complete shipping address is required" });
  }

  // Authoritative amount from the DB (prices + coupon + GST) — never trust client.
  const cart = await computeCart(items, promoCode);
  if (cart.error) {
    return res.status(400).json({ message: cart.error });
  }
  const { orderItems, subtotal, discount, tax, grandTotal, appliedPromo, couponDoc } = cart;

  // Cash on Delivery: no gateway; order is unpaid + pending until delivered.
  // Card: settle now (Stripe or mock) for the grand total incl. GST.
  let paymentInfo;
  let orderStatus;
  if (paymentMethod === "cod") {
    paymentInfo = { method: "cod", provider: "mock", status: "unpaid" };
    orderStatus = "pending";
  } else {
    const settled = await settlePayment({
      paymentIntentId,
      payment,
      finalAmount: grandTotal,
    });
    if (settled.error) {
      return res.status(settled.status).json({ message: settled.error });
    }
    paymentInfo = settled.payment;
    orderStatus = "paid";
  }

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    amount: grandTotal,
    subtotalAmount: subtotal,
    discount,
    tax,
    paymentMethod,
    promoCode: appliedPromo,
    shippingAddress: {
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || "",
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
    },
    payment: paymentInfo,
    status: orderStatus,
  });

  // Decrement the matching variant's stock now that payment succeeded.
  await Promise.all(
    orderItems.map((item) =>
      Product.updateOne(
        { id: item.productId },
        { $inc: { "variants.$[v].stock": -item.quantity } },
        {
          arrayFilters: [
            { "v.size": item.size || "", "v.color": item.color || "" },
          ],
        }
      )
    )
  );

  // Count the coupon redemption now that the order succeeded.
  if (couponDoc) {
    await Coupon.updateOne({ _id: couponDoc._id }, { $inc: { usedCount: 1 } });
  }

  // Order-confirmation email (fire-and-forget).
  if (req.user.email) {
    sendMail(orderConfirmationEmail(order, req.user.email));
  }

  res.status(201).json(order);
};

// GET /api/orders   (protected) - the logged-in user's orders
const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
};

// GET /api/orders/:id   (protected) - one order; owner or admin only
const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const isOwner = String(order.user) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized to view this order" });
  }
  res.json(order);
};

// GET /api/orders/:id/invoice   (owner/admin) - printable HTML invoice
const getInvoice = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  const isOwner = String(order.user) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized" });
  }

  const a = order.shippingAddress || {};
  const rows = order.items
    .map(
      (i) => `<tr>
        <td>${i.name}${i.size ? ` (${i.size}${i.color ? "/" + i.color : ""})` : ""}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">$${i.price.toFixed(2)}</td>
        <td style="text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${String(order._id).slice(-6).toUpperCase()}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#222;max-width:720px;margin:30px auto;padding:0 20px}
    h1{color:#ff4141} .muted{color:#777;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{padding:8px;border-bottom:1px solid #eee;font-size:14px}
    th{text-align:left;background:#fafafa}
    .totals{margin-top:16px;float:right;width:260px}
    .totals div{display:flex;justify-content:space-between;padding:4px 0}
    .grand{font-weight:700;font-size:18px;border-top:2px solid #222;margin-top:6px;padding-top:8px}
    @media print{.noprint{display:none}}
  </style></head><body>
    <h1>SHOPPER</h1>
    <p class="muted">Tax Invoice</p>
    <p><b>Invoice #${String(order._id).slice(-6).toUpperCase()}</b><br>
       Date: ${new Date(order.createdAt).toLocaleString()}<br>
       Payment: ${order.paymentMethod === "cod" ? "Cash on Delivery" : "Card"} (${order.payment?.status || "paid"})</p>
    <p><b>Ship to:</b><br>${a.fullName || ""}<br>${a.line1 || ""}${a.line2 ? ", " + a.line2 : ""}<br>${a.city || ""}, ${a.state || ""} ${a.postalCode || ""}<br>${a.country || ""}</p>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div><span>Subtotal</span><span>$${(order.subtotalAmount || 0).toFixed(2)}</span></div>
      ${order.discount > 0 ? `<div><span>Discount${order.promoCode ? " (" + order.promoCode + ")" : ""}</span><span>-$${order.discount.toFixed(2)}</span></div>` : ""}
      <div><span>GST (18%)</span><span>$${(order.tax || 0).toFixed(2)}</span></div>
      <div class="grand"><span>Total</span><span>$${order.amount.toFixed(2)}</span></div>
    </div>
    <div style="clear:both"></div>
    <p class="noprint muted" style="margin-top:40px">Tip: use your browser's Print to save this invoice as a PDF.</p>
  </body></html>`;

  res.set("Content-Type", "text/html").send(html);
};

// PATCH /api/orders/:id/cancel   (protected) - owner cancels a pending/paid order
const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (String(order.user) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  if (!["pending", "paid"].includes(order.status)) {
    return res
      .status(400)
      .json({ message: `Cannot cancel an order that is ${order.status}` });
  }

  order.status = "cancelled";
  await order.save();

  // Return the reserved stock to the matching variant.
  await Promise.all(
    order.items.map((item) =>
      Product.updateOne(
        { id: item.productId },
        { $inc: { "variants.$[v].stock": item.quantity } },
        {
          arrayFilters: [
            { "v.size": item.size || "", "v.color": item.color || "" },
          ],
        }
      )
    )
  );

  res.json(order);
};

// GET /api/orders/all   (admin) - every order, with customer info
const getAllOrders = async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(orders);
};

const ALLOWED_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

// PATCH /api/orders/:id/status   (admin)   body: { status }
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = status;

  // On shipment, create a shipment with the courier (real when configured,
  // else a synthetic tracking number + rule-based ETA).
  if (status === "shipped" && !order.trackingNumber) {
    const shipment = await createShipment(order);
    order.trackingNumber = shipment.trackingNumber;
    order.expectedDelivery = shipment.expectedDelivery;
    if (shipment.courierName) order.courierName = shipment.courierName;
  }

  await order.save();

  // Notify the customer of the status change (fire-and-forget).
  if (order.user && order.user.email) {
    sendMail(orderStatusEmail(order, order.user.email));
  }

  res.json(order);
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getInvoice,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
