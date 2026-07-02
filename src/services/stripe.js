import { loadStripe } from "@stripe/stripe-js";

// Publishable key from the frontend .env. When absent, the checkout falls back
// to the mock card form. Switching test -> live = swapping this key.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise = null;

export const getStripe = () => {
  if (!publishableKey) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export const stripeEnabled = () => Boolean(publishableKey);
