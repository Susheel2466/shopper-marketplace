const Stripe = require("stripe");

// Initialize Stripe only when a secret key is configured. This lets the app
// run with the mock payment processor until you add real keys — switching
// test -> live is just swapping STRIPE_SECRET_KEY (sk_test_... -> sk_live_...).
const secretKey = process.env.STRIPE_SECRET_KEY;
const stripe = secretKey ? new Stripe(secretKey) : null;

const stripeEnabled = () => Boolean(stripe);

module.exports = { stripe, stripeEnabled };
