// Mock payment processor. Swap the body for a real Stripe PaymentIntent later;
// the callers only depend on the { success, last4, transactionId, message } shape.
//
// Test behaviour:
//   - card number ending in "0002" is declined (Stripe-style test decline)
//   - any other 12+ digit number succeeds
const processPayment = async ({ cardNumber, amount }) => {
  const digits = String(cardNumber || "").replace(/\D/g, "");

  if (digits.length < 12) {
    return { success: false, message: "Invalid card number." };
  }
  if (digits.endsWith("0002")) {
    return { success: false, message: "Your card was declined." };
  }

  return {
    success: true,
    last4: digits.slice(-4),
    transactionId: `mock_${Date.now()}_${digits.slice(-4)}`,
    amount,
  };
};

module.exports = processPayment;
