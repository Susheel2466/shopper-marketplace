import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./CSS/Orders.css";
import { AuthContext } from "../Context/AuthContext";
import { getOrders } from "../services/api";
import Loader from "../Components/Loader/Loader";

const Orders = () => {
  const { token } = useContext(AuthContext);
  const location = useLocation();
  const justOrdered = location.state?.justOrdered;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getOrders(token)
      .then((data) => {
        if (!mounted) return;
        setOrders(data);
        setError("");
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Could not load orders.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  if (loading) return <Loader message="Loading your orders..." />;
  if (error) return <div className="orders-error">{error}</div>;

  return (
    <div className="orders">
      <h1>My Orders</h1>

      {justOrdered && (
        <div className="orders-banner">
          🎉 Payment successful — your order has been placed!
        </div>
      )}

      {orders.length === 0 ? (
        <div className="orders-empty">
          <p>You haven't placed any orders yet.</p>
          <Link to="/" className="orders-shop-link">
            Start shopping
          </Link>
        </div>
      ) : (
        orders.map((order) => (
          <Link
            to={`/orders/${order._id}`}
            className="order-card order-card-link"
            key={order._id}
          >
            <div className="order-head">
              <div className="order-meta">
                <span className="order-id">
                  Order #{order._id.slice(-6).toUpperCase()}
                </span>
                <span className="order-date">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
              </div>
              <span className={`order-status order-status-${order.status}`}>
                {order.status}
              </span>
            </div>

            <div className="order-items">
              {order.items.map((item, i) => (
                <div className="order-item" key={i}>
                  <span className="order-item-name">{item.name}</span>
                  <span className="order-item-qty">× {item.quantity}</span>
                  <span className="order-item-price">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="order-foot">
              {order.shippingAddress && (
                <p className="order-shipto">
                  Ship to: {order.shippingAddress.fullName},{" "}
                  {order.shippingAddress.line1}, {order.shippingAddress.city}
                  {order.payment?.last4
                    ? ` · Paid •••• ${order.payment.last4}`
                    : ""}
                </p>
              )}
              {order.discount > 0 && (
                <p className="order-discount">
                  Discount{order.promoCode ? ` (${order.promoCode})` : ""}: -$
                  {order.discount.toFixed(2)}
                </p>
              )}
              <p className="order-total">Total: ${order.amount.toFixed(2)}</p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
};

export default Orders;
