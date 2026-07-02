const { stripe, stripeEnabled } = require("../utils/stripe");
const computeCart = require("../utils/computeCart");

// POST /api/payments/create-intent   (protected)
// Computes the amount server-side and creates a Stripe PaymentIntent.
// Returns the clientSecret the frontend needs to confirm the card payment.
const createPaymentIntent = async (req, res) => {
  if (!stripeEnabled()) {
    return res
      .status(400)
      .json({ message: "Stripe is not configured on the server." });
  }

  const { items, promoCode } = req.body;
  const cart = await computeCart(items, promoCode);
  if (cart.error) {
    return res.status(400).json({ message: cart.error });
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(cart.grandTotal * 100), // grand total incl. GST, in cents
    currency: "usd",
    payment_method_types: ["card"],
    metadata: {
      userId: String(req.user._id),
      promoCode: cart.appliedPromo || "",
    },
  });

  res.json({ clientSecret: intent.client_secret, amount: cart.grandTotal });
};

// POST /api/payments/webhook   (public, raw body)
// Verifies Stripe's signature and reacts to events. Order creation already
// verifies the PaymentIntent directly, so this is for reliability/auditing.
const handleWebhook = async (req, res) => {
  if (!stripeEnabled()) {
    return res.status(400).send("Stripe not configured");
  }

  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, signature, webhookSecret)
      : JSON.parse(req.body);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      console.log("✅ PaymentIntent succeeded:", event.data.object.id);
      break;
    case "payment_intent.payment_failed":
      console.log("❌ PaymentIntent failed:", event.data.object.id);
      break;
    default:
      break;
  }

  res.json({ received: true });
};

module.exports = { createPaymentIntent, handleWebhook };
