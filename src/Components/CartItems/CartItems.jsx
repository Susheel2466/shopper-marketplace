import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CartItems.css";
import { ShopContext } from "../../Context/ShopContext";
import { validateCoupon } from "../../services/api";
import { useToast } from "../../Context/ToastContext";
import remove_icon from "../Assets/cart_cross_icon.png";

const CartItems = () => {
  const {
    all_product,
    cartItems,
    addToCart,
    removeOne,
    removeLine,
    getTotalCartAmount,
  } = useContext(ShopContext);

  const navigate = useNavigate();
  const toast = useToast();

  // Cart lines: [key, { productId, size, color, quantity }] joined to product.
  const lines = Object.entries(cartItems)
    .map(([key, entry]) => ({
      key,
      ...entry,
      product: all_product.find((p) => p.id === Number(entry.productId)),
    }))
    .filter((l) => l.product);

  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [promoOk, setPromoOk] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // {code, discountType, discountValue, minOrder}
  const [applying, setApplying] = useState(false);

  const subtotal = getTotalCartAmount();
  const hasItems = lines.length > 0;

  // Recompute the discount live from the applied coupon and current subtotal.
  const discountAmount = (() => {
    if (!appliedCoupon || subtotal < appliedCoupon.minOrder) return 0;
    return appliedCoupon.discountType === "percent"
      ? subtotal * (appliedCoupon.discountValue / 100)
      : Math.min(appliedCoupon.discountValue, subtotal);
  })();
  const total = subtotal - discountAmount;

  const applyPromo = async () => {
    if (!promo.trim()) return;
    setApplying(true);
    try {
      const result = await validateCoupon(promo, subtotal);
      if (result.valid) {
        setAppliedCoupon({
          code: result.code,
          discountType: result.discountType,
          discountValue: result.discountValue,
          minOrder: result.minOrder || 0,
        });
        setPromoOk(true);
        setPromoMsg(result.message || "Coupon applied!");
        toast.success(result.message || "Coupon applied!");
      } else {
        setAppliedCoupon(null);
        setPromoOk(false);
        setPromoMsg(result.message || "Invalid coupon code.");
        toast.error(result.message || "Invalid coupon code.");
      }
    } catch (err) {
      setAppliedCoupon(null);
      setPromoOk(false);
      setPromoMsg(err.message || "Could not validate coupon.");
      toast.error(err.message || "Could not validate coupon.");
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setPromo("");
    setPromoMsg("");
    setPromoOk(false);
  };

  const goToCheckout = () => {
    if (!hasItems) return;
    navigate("/checkout", {
      state: { couponCode: appliedCoupon ? appliedCoupon.code : null },
    });
  };

  return (
    <div className="cartitems">
      <div className="cartitems-format-main">
        <p>Products</p>
        <p>Title</p>
        <p>Price</p>
        <p>Quantity</p>
        <p>Total</p>
        <p>Remove</p>
      </div>
      <hr />
      {lines.map(({ key, product, size, color, quantity }) => (
        <div key={key}>
          <div className="cartitems-format cartitems-format-main">
            <img
              src={product.image}
              alt={product.name}
              className="carticon-product-icon"
            />
            <div>
              <p>{product.name}</p>
              {(size || color) && (
                <p className="cartitems-variant">
                  {size}
                  {size && color ? " · " : ""}
                  {color}
                </p>
              )}
            </div>
            <p>${product.new_price}</p>
            <span className="cartitems-quantity" aria-label={`Quantity ${quantity}`}>
              {quantity}
            </span>
            <p>${(product.new_price * quantity).toFixed(2)}</p>
            <div className="cartitems-remove-buttons">
              <button
                aria-label={`Increase quantity of ${product.name}`}
                onClick={() => addToCart(product.id, size, color)}
              >
                +
              </button>
              <button
                aria-label={`Decrease quantity of ${product.name}`}
                onClick={() => removeOne(key)}
              >
                -
              </button>
              <button
                type="button"
                className="cartitems-remove-line"
                aria-label={`Remove ${product.name} from cart`}
                onClick={() => removeLine(key)}
              >
                <img src={remove_icon} alt="" />
              </button>
            </div>
          </div>
          <hr />
        </div>
      ))}
      {!hasItems && <p className="cartitems-empty">Your cart is empty.</p>}
      <div className="cartitems-down">
        <div className="cartitems-total">
          <h1>Cart Totals</h1>
          <div>
            <div className="cartitems-total-item">
              <p>Subtotal</p>
              <p>${subtotal.toFixed(2)}</p>
            </div>
            <hr />
            {discountAmount > 0 && (
              <>
                <div className="cartitems-total-item">
                  <p>Discount ({appliedCoupon.code})</p>
                  <p>-${discountAmount.toFixed(2)}</p>
                </div>
                <hr />
              </>
            )}
            <div className="cartitems-total-item">
              <p>Shipping Fee</p>
              <p>Free</p>
            </div>
            <hr />
            <div className="cartitems-total-item">
              <h3>Total</h3>
              <h3>${total.toFixed(2)}</h3>
            </div>
          </div>
          <button onClick={goToCheckout} disabled={!hasItems}>
            PROCEED TO CHECKOUT
          </button>
        </div>
        <div className="cartitems-promocode">
          <p>If you have a promo code, Enter it here</p>
          <div className="cartitems-promobox">
            <input
              type="text"
              placeholder="promo code"
              aria-label="Promo code"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              disabled={!!appliedCoupon}
            />
            {appliedCoupon ? (
              <button onClick={removeCoupon}>Remove</button>
            ) : (
              <button onClick={applyPromo} disabled={applying}>
                {applying ? "..." : "Submit"}
              </button>
            )}
          </div>
          {promoMsg && (
            <p
              className={
                promoOk ? "cartitems-promo-msg" : "cartitems-promo-msg error"
              }
            >
              {promoMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartItems;
