import React, { useContext, useEffect, useState } from "react";
import "./CSS/AdminOrders.css";
import { AuthContext } from "../Context/AuthContext";
import { getAllOrders, updateOrderStatus } from "../services/api";
import { useToast } from "../Context/ToastContext";
import Loader from "../Components/Loader/Loader";

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

const AdminOrders = () => {
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getAllOrders(token)
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

  const changeStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    setRowError("");
    const previous = orders;
    // Optimistic update
    setOrders((curr) =>
      curr.map((o) => (o._id === orderId ? { ...o, status } : o))
    );
    try {
      await updateOrderStatus(orderId, status, token);
      toast.success(`Order marked ${status}`);
    } catch (err) {
      setOrders(previous); // roll back
      setRowError(err.message || "Failed to update status.");
      toast.error(err.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <Loader message="Loading orders..." />;
  if (error) return <div className="adminorders-error">{error}</div>;

  return (
    <div className="adminorders">
      <h1>Admin — All Orders ({orders.length})</h1>
      {rowError && <p className="adminorders-error-inline">{rowError}</p>}

      {orders.length === 0 ? (
        <p className="adminorders-empty">No orders yet.</p>
      ) : (
        <div className="adminorders-table">
          <div className="adminorders-row adminorders-head">
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Total</span>
            <span>Date</span>
            <span>Status</span>
          </div>
          {orders.map((order) => (
            <div className="adminorders-row" key={order._id}>
              <span className="adminorders-id">
                #{order._id.slice(-6).toUpperCase()}
              </span>
              <span className="adminorders-customer">
                {order.user ? (
                  <>
                    <strong>{order.user.name}</strong>
                    <small>{order.user.email}</small>
                  </>
                ) : (
                  "—"
                )}
              </span>
              <span>{order.items.reduce((n, i) => n + i.quantity, 0)}</span>
              <span>${order.amount.toFixed(2)}</span>
              <span className="adminorders-date">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
              <span>
                <select
                  className={`adminorders-status status-${order.status}`}
                  value={order.status}
                  disabled={updatingId === order._id}
                  onChange={(e) => changeStatus(order._id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
