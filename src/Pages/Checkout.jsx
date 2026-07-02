import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "./CSS/Checkout.css";
import { ShopContext } from "../Context/ShopContext";
import { AuthContext } from "../Context/AuthContext";
import {
  createOrder,
  createPaymentIntent,
  validateCoupon,
  getAddresses,
  getDeliveryEstimate,
} from "../services/api";
import { getStripe, stripeEnabled } from "../services/stripe";
import { useToast } from "../Context/ToastContext";

const stripePromise = getStripe();

const emptyAddress = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const CARD_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#333",
      fontFamily: "poppins, sans-serif",
      "::placeholder": { color: "#aaa" },
    },
    invalid: { color: "#c0392b" },
  },
};

const CheckoutInner = () => {
  const isStripe = stripeEnabled();
  const stripe = useStripe();
  const elements = useElements();

  const { all_product, cartItems, getTotalCartAmount, clearCart } =
    useContext(ShopContext);
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const couponCode = location.state?.couponCode || null;

  const [address, setAddress] = useState(emptyAddress);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState("new");
  // Mock-mode card fields (ignored in Stripe mode).
  const [mockCard, setMockCard] = useState({ nameOnCard: "", cardNumber: "", expiry: "", cvc: "" });
  const [cardComplete, setCardComplete] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState("card"); // "card" | "cod"
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  const subtotal = getTotalCartAmount();
  const taxable = subtotal - discount;
  const tax = Number((taxable * 0.18).toFixed(2)); // GST 18%
  const total = Number((taxable + tax).toFixed(2));
  // Cart lines joined to their product (skip any whose product didn't load).
  const lines = Object.entries(cartItems)
    .map(([key, entry]) => ({
      key,
      ...entry,
      product: all_product.find((p) => p.id === Number(entry.productId)),
    }))
    .filter((l) => l.product);

  // Load saved addresses; preselect default and prefill the form.
  useEffect(() => {
    let mounted = true;
    getAddresses(token)
      .then((list) => {
        if (!mounted || !list.length) return;
        setSavedAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        setSelectedAddrId(def._id);
        const { _id, isDefault, ...fields } = def;
        setAddress((prev) => ({ ...prev, ...fields }));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [token]);

  const pickAddress = (id) => {
    setSelectedAddrId(id);
    if (id === "new") {
      setAddress(emptyAddress);
      return;
    }
    const a = savedAddresses.find((x) => x._id === id);
    if (a) {
      const { _id, isDefault, ...fields } = a;
      setAddress({ ...emptyAddress, ...fields });
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!couponCode || subtotal === 0) {
      setDiscount(0);
      return;
    }
    validateCoupon(couponCode, subtotal)
      .then((res) => mounted && setDiscount(res.valid ? res.discountAmount : 0))
      .catch(() => mounted && setDiscount(0));
    return () => {
      mounted = false;
    };
  }, [couponCode, subtotal]);

  const changeAddress = (e) =>
    setAddress({ ...address, [e.target.name]: e.target.value });

  // Fetch a delivery estimate when a 6-digit pincode is entered.
  useEffect(() => {
    const pin = (address.postalCode || "").replace(/\D/g, "");
    if (pin.length !== 6) {
      setDelivery(null);
      return;
    }
    let mounted = true;
    getDeliveryEstimate(pin)
      .then((d) => mounted && setDelivery(d))
      .catch(() => mounted && setDelivery(null));
    return () => {
      mounted = false;
    };
  }, [address.postalCode]);
  const changeMockCard = (e) =>
    setMockCard({ ...mockCard, [e.target.name]: e.target.value });

  const validate = () => {
    const required = ["fullName", "phone", "line1", "city", "state", "postalCode", "country"];
    if (required.some((f) => !address[f].trim())) {
      return "Please fill in all required address fields.";
    }
    if (payMethod === "cod") return ""; // no card needed for Cash on Delivery
    if (isStripe) {
      if (!cardComplete) return "Please enter complete card details.";
    } else {
      if (!mockCard.nameOnCard.trim()) return "Please enter the name on the card.";
      if (mockCard.cardNumber.replace(/\D/g, "").length < 12)
        return "Please enter a valid card number.";
      if (!/^\d{2}\/\d{2}$/.test(mockCard.expiry))
        return "Card expiry must be in MM/YY format.";
      if (!/^\d{3,4}$/.test(mockCard.cvc)) return "Please enter a valid CVC.";
    }
    return "";
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    setPlacing(true);

    const items = lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      size: l.size,
      color: l.color,
    }));

    try {
      if (payMethod === "cod") {
        await createOrder({
          items,
          promoCode: couponCode,
          shippingAddress: address,
          paymentMethod: "cod",
          token,
        });
      } else if (isStripe) {
        if (!stripe || !elements) {
          setError("Payment form is still loading. Please wait a moment.");
          setPlacing(false);
          return;
        }
        // 1. Create a PaymentIntent (amount computed server-side).
        const { clientSecret } = await createPaymentIntent({
          items,
          promoCode: couponCode,
          token,
        });
        // 2. Confirm the card payment client-side (card data never hits our server).
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: { name: address.fullName, phone: address.phone },
          },
        });
        if (result.error) {
          throw new Error(result.error.message);
        }
        // 3. Create the order, referencing the succeeded PaymentIntent.
        await createOrder({
          items,
          promoCode: couponCode,
          shippingAddress: address,
          paymentIntentId: result.paymentIntent.id,
          token,
        });
      } else {
        // Mock mode: send the card number to the backend's mock processor.
        await createOrder({
          items,
          promoCode: couponCode,
          shippingAddress: address,
          payment: { cardNumber: mockCard.cardNumber },
          token,
        });
      }
      clearCart();
      toast.success("Payment successful — order placed!");
      navigate("/orders", { state: { justOrdered: true } });
    } catch (err) {
      setError(err.message || "Could not place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="checkout checkout-empty">
        <p>Your cart is empty.</p>
        <Link to="/" className="checkout-shop-link">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <form className="checkout" onSubmit={handlePlaceOrder}>
      <div className="checkout-forms">
        <section className="checkout-section">
          <h2>Shipping Address</h2>
          {savedAddresses.length > 0 && (
            <div className="checkout-saved">
              {savedAddresses.map((a) => (
                <label
                  key={a._id}
                  className={`checkout-saved-card ${selectedAddrId === a._id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="savedAddr"
                    checked={selectedAddrId === a._id}
                    onChange={() => pickAddress(a._id)}
                  />
                  <span>
                    <strong>{a.fullName}</strong> · {a.phone}
                    <br />
                    {a.line1}, {a.city}, {a.state} {a.postalCode}
                  </span>
                </label>
              ))}
              <label
                className={`checkout-saved-card ${selectedAddrId === "new" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="savedAddr"
                  checked={selectedAddrId === "new"}
                  onChange={() => pickAddress("new")}
                />
                <span>Use a new address</span>
              </label>
            </div>
          )}
          <div className="checkout-grid">
            <input name="fullName" aria-label="Full name" placeholder="Full name *" value={address.fullName} onChange={changeAddress} />
            <input name="phone" aria-label="Phone" placeholder="Phone *" value={address.phone} onChange={changeAddress} />
            <input className="span-2" name="line1" aria-label="Address line 1" placeholder="Address line 1 *" value={address.line1} onChange={changeAddress} />
            <input className="span-2" name="line2" aria-label="Address line 2" placeholder="Address line 2 (optional)" value={address.line2} onChange={changeAddress} />
            <input name="city" aria-label="City" placeholder="City *" value={address.city} onChange={changeAddress} />
            <input name="state" aria-label="State" placeholder="State *" value={address.state} onChange={changeAddress} />
            <input name="postalCode" aria-label="Postal code" placeholder="Postal code *" value={address.postalCode} onChange={changeAddress} />
            <input name="country" aria-label="Country" placeholder="Country *" value={address.country} onChange={changeAddress} />
          </div>
        </section>

        <section className="checkout-section">
          <h2>Payment</h2>
          <div className="checkout-paymethods">
            <label className={`checkout-paymethod ${payMethod === "card" ? "selected" : ""}`}>
              <input type="radio" name="payMethod" checked={payMethod === "card"} onChange={() => setPayMethod("card")} />
              Card
            </label>
            <label className={`checkout-paymethod ${payMethod === "cod" ? "selected" : ""}`}>
              <input type="radio" name="payMethod" checked={payMethod === "cod"} onChange={() => setPayMethod("cod")} />
              Cash on Delivery
            </label>
          </div>

          {payMethod === "cod" ? (
            <p className="checkout-test-hint">
              Pay in cash when your order is delivered. No card required.
            </p>
          ) : isStripe ? (
            <>
              <p className="checkout-test-hint">
                Test card: 4242 4242 4242 4242 · any future expiry · any CVC ·
                any ZIP.
              </p>
              <div className="checkout-card-element">
                <CardElement
                  options={CARD_OPTIONS}
                  onChange={(e) => setCardComplete(e.complete)}
                />
              </div>
            </>
          ) : (
            <>
              <p className="checkout-test-hint">
                Mock mode (no Stripe key set). Card 4242 4242 4242 4242 succeeds;
                any number ending 0002 is declined.
              </p>
              <div className="checkout-grid">
                <input className="span-2" name="nameOnCard" aria-label="Name on card" placeholder="Name on card *" value={mockCard.nameOnCard} onChange={changeMockCard} />
                <input className="span-2" name="cardNumber" aria-label="Card number" placeholder="Card number *" value={mockCard.cardNumber} onChange={changeMockCard} />
                <input name="expiry" aria-label="Card expiry MM/YY" placeholder="MM/YY *" value={mockCard.expiry} onChange={changeMockCard} />
                <input name="cvc" aria-label="Card CVC" placeholder="CVC *" value={mockCard.cvc} onChange={changeMockCard} />
              </div>
            </>
          )}
        </section>
      </div>

      <aside className="checkout-summary">
        <h2>Order Summary</h2>
        <div className="checkout-items">
          {lines.map((l) => (
            <div className="checkout-item" key={l.key}>
              <span>
                {l.product.name.length > 24
                  ? l.product.name.slice(0, 24) + "…"
                  : l.product.name}
                {l.size || l.color ? ` (${[l.size, l.color].filter(Boolean).join("/")})` : ""}{" "}
                × {l.quantity}
              </span>
              <span>${(l.product.new_price * l.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        {delivery && (
          <p className="checkout-delivery">
            {delivery.serviceable
              ? `🚚 Delivery in ~${delivery.etaDays} days (${delivery.zone})${delivery.codAvailable ? "" : " · COD not available"}`
              : `⚠️ ${delivery.message || "Not serviceable"}`}
          </p>
        )}
        <div className="checkout-line">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="checkout-line discount">
            <span>Discount ({couponCode})</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        <div className="checkout-line">
          <span>GST (18%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="checkout-line">
          <span>Shipping</span>
          <span>Free</span>
        </div>
        <div className="checkout-line checkout-total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        {error && <p className="checkout-error">{error}</p>}
        <button type="submit" disabled={placing}>
          {placing
            ? "PROCESSING..."
            : payMethod === "cod"
            ? `PLACE ORDER · $${total.toFixed(2)}`
            : `PAY $${total.toFixed(2)}`}
        </button>
      </aside>
    </form>
  );
};

const Checkout = () => (
  <Elements stripe={stripePromise}>
    <CheckoutInner />
  </Elements>
);

export default Checkout;
