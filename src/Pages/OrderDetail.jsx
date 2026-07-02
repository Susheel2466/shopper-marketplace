import React, { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./CSS/OrderDetail.css";
import { AuthContext } from "../Context/AuthContext";
import { getOrderById, cancelOrder, requestReturn, openInvoice } from "../services/api";
import { useToast } from "../Context/ToastContext";
import Loader from "../Components/Loader/Loader";

const STEPS = ["pending", "paid", "shipped", "delivered"];
const STEP_LABELS = {
  pending: "Placed",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
};

const OrderDetail = () => {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnMsg, setReturnMsg] = useState("");
  const [returning, setReturning] = useState(false);

  const load = () => {
    setLoading(true);
    getOrderById(id, token)
      .then((data) => {
        setOrder(data);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load order."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const doCancel = async () => {
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(true);
    try {
      const updated = await cancelOrder(id, token);
      setOrder(updated);
      toast.success("Order cancelled");
    } catch (err) {
      toast.error(err.message || "Could not cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  const submitReturn = async () => {
    if (!returnReason.trim()) {
      setReturnMsg("Please enter a reason.");
      return;
    }
    setReturning(true);
    setReturnMsg("");
    try {
      await requestReturn(order._id, returnReason, token);
      setReturnMsg("Return requested. We'll review it shortly.");
      setReturnReason("");
      toast.success("Return requested");
    } catch (err) {
      setReturnMsg("");
      toast.error(err.message || "Could not request return.");
    } finally {
      setReturning(false);
    }
  };

  if (loading) return <Loader message="Loading order..." />;
  if (error) return <div className="orderdetail-error">{error}</div>;
  if (!order) return null;

  const cancelled = order.status === "cancelled";
  const currentStep = STEPS.indexOf(order.status);
  const canCancel = ["pending", "paid"].includes(order.status);
  const canReturn = order.status === "delivered";

  return (
    <div className="orderdetail">
      <Link to="/orders" className="orderdetail-back">← Back to orders</Link>
      <div className="orderdetail-head">
        <h1>Order #{order._id.slice(-6).toUpperCase()}</h1>
        <span className={`orderdetail-status orderdetail-status-${order.status}`}>
          {order.status}
        </span>
      </div>
      <p className="orderdetail-date">
        Placed {new Date(order.createdAt).toLocaleString()}
      </p>

      {cancelled ? (
        <div className="orderdetail-cancelled">This order was cancelled.</div>
      ) : (
        <div className="orderdetail-timeline">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`orderdetail-step ${i <= currentStep ? "done" : ""}`}
            >
              <span className="orderdetail-dot" />
              <span className="orderdetail-step-label">{STEP_LABELS[step]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="orderdetail-grid">
        <div className="orderdetail-card">
          <h3>Items</h3>
          {order.items.map((item, i) => (
            <div className="orderdetail-item" key={i}>
              <span>{item.name} × {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="orderdetail-totals">
            {order.subtotalAmount > 0 && (
              <div className="orderdetail-total-row">
                <span>Subtotal</span>
                <span>${order.subtotalAmount.toFixed(2)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="orderdetail-total-row discount">
                <span>Discount {order.promoCode ? `(${order.promoCode})` : ""}</span>
                <span>-${order.discount.toFixed(2)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="orderdetail-total-row">
                <span>GST (18%)</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="orderdetail-total-row grand">
              <span>Total</span>
              <span>${order.amount.toFixed(2)}</span>
            </div>
          </div>
          <button
            type="button"
            className="orderdetail-invoice"
            onClick={() => openInvoice(order._id, token).catch(() => toast.error("Could not open invoice"))}
          >
            View / print invoice
          </button>
        </div>

        <div className="orderdetail-card">
          <h3>Shipping</h3>
          {order.shippingAddress && (
            <p className="orderdetail-address">
              {order.shippingAddress.fullName}<br />
              {order.shippingAddress.phone}<br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.postalCode}<br />
              {order.shippingAddress.country}
            </p>
          )}
          {order.trackingNumber && (
            <>
              <h3 style={{ marginTop: 16 }}>Tracking</h3>
              <p>
                #{order.trackingNumber}
                {order.expectedDelivery
                  ? ` · Expected by ${new Date(order.expectedDelivery).toLocaleDateString()}`
                  : ""}
              </p>
            </>
          )}
          <h3 style={{ marginTop: 16 }}>Payment</h3>
          <p>
            {order.paymentMethod === "cod"
              ? `Cash on Delivery · ${order.payment?.status || "unpaid"}`
              : `${order.payment?.provider === "stripe" ? "Stripe" : "Card"} •••• ${order.payment?.last4 || "----"} · ${order.payment?.status || "paid"}`}
          </p>

          {canCancel && (
            <button
              className="orderdetail-cancel"
              onClick={doCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel order"}
            </button>
          )}

          {canReturn && (
            <div className="orderdetail-return">
              <h3>Return this order</h3>
              <textarea
                placeholder="Reason for return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
              {returnMsg && <p className="orderdetail-return-msg">{returnMsg}</p>}
              <button onClick={submitReturn} disabled={returning}>
                {returning ? "Submitting..." : "Request return"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
