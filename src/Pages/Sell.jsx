import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CSS/Sell.css";
import { AuthContext } from "../Context/AuthContext";
import { useToast } from "../Context/ToastContext";
import { applyToSell } from "../services/api";

const Sell = () => {
  const { user, token, login } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Not logged in -> send to login first.
  if (!user) {
    return (
      <div className="sell">
        <h1>Sell on SHOPPER</h1>
        <p>Please log in to apply as a seller.</p>
        <button onClick={() => navigate("/login")}>Log in</button>
      </div>
    );
  }

  if (user.role === "seller") {
    return (
      <div className="sell">
        <h1>Sell on SHOPPER</h1>
        {user.sellerApproved ? (
          <>
            <p>You're an approved seller for <strong>{user.shopName}</strong>. 🎉</p>
            <button onClick={() => navigate("/seller")}>Go to Seller Dashboard</button>
          </>
        ) : (
          <p className="sell-pending">
            Your seller application for <strong>{user.shopName}</strong> is pending
            admin approval.
          </p>
        )}
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!shopName.trim()) return;
    setSubmitting(true);
    try {
      const res = await applyToSell(shopName.trim(), token);
      // Reflect the new seller status locally (pending approval).
      login({ ...user, role: "seller", shopName: res.shopName, sellerApproved: false }, token);
      toast.success("Application submitted — awaiting approval");
      navigate("/sell");
    } catch (err) {
      toast.error(err.message || "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sell">
      <h1>Sell on SHOPPER</h1>
      <p>Open your shop and reach thousands of shoppers. Applications are reviewed by our team.</p>
      <form onSubmit={submit} className="sell-form">
        <input
          type="text"
          aria-label="Shop name"
          placeholder="Your shop name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Apply to sell"}
        </button>
      </form>
    </div>
  );
};

export default Sell;
