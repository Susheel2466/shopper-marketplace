import React, { useContext, useEffect, useState } from "react";
import "./CSS/Orders.css";
import { AuthContext } from "../Context/AuthContext";
import { getSellerOrders } from "../services/api";
import Loader from "../Components/Loader/Loader";

const SellerOrders = () => {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSellerOrders(token)
      .then(setOrders)
      .catch((err) => setError(err.message || "Could not load orders."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Loader message="Loading your orders..." />;
  if (error) return <div className="orders-error">{error}</div>;

  return (
    <div className="orders">
      <h1>My Orders ({orders.length})</h1>
      {orders.length === 0 ? (
        <p className="orders-empty">No orders for your products yet.</p>
      ) : (
        orders.map((order) => (
          <div className="order-card" key={order._id}>
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
                  <span className="order-item-name">
                    {item.name}
                    {item.size ? ` (${item.size}${item.color ? `/${item.color}` : ""})` : ""}
                  </span>
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
                  Ship to: {order.shippingAddress.fullName}, {order.shippingAddress.city}
                </p>
              )}
              <p className="order-total">
                Your items total: ${order.sellerTotal.toFixed(2)}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default SellerOrders;
