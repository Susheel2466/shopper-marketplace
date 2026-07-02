import React, { useContext, useEffect, useState } from "react";
import "./CSS/AdminDashboard.css";
import { AuthContext } from "../Context/AuthContext";
import { getAdminStats } from "../services/api";
import Loader from "../Components/Loader/Loader";

const AdminDashboard = () => {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminStats(token)
      .then(setStats)
      .catch((err) => setError(err.message || "Could not load stats."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Loader message="Loading dashboard..." />;
  if (error) return <div className="dash-error">{error}</div>;

  const maxRevenue = Math.max(1, ...stats.revenueByDay.map((d) => d.revenue));

  return (
    <div className="dash">
      <h1>Admin Dashboard</h1>

      <div className="dash-cards">
        <div className="dash-card">
          <span className="dash-card-label">Revenue</span>
          <span className="dash-card-value">${stats.revenue.toFixed(2)}</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">Orders</span>
          <span className="dash-card-value">{stats.totalOrders}</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">Customers</span>
          <span className="dash-card-value">{stats.totalCustomers}</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">Pending</span>
          <span className="dash-card-value">
            {stats.ordersByStatus.pending || 0}
          </span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-panel">
          <h3>Revenue — last 7 days</h3>
          {stats.revenueByDay.length === 0 ? (
            <p className="dash-empty">No orders yet.</p>
          ) : (
            <div className="dash-chart">
              {stats.revenueByDay.map((d) => (
                <div className="dash-bar-col" key={d._id}>
                  <div
                    className="dash-bar"
                    style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                    title={`$${d.revenue.toFixed(2)}`}
                  />
                  <span className="dash-bar-label">{d._id.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dash-panel">
          <h3>Orders by status</h3>
          <ul className="dash-list">
            {Object.entries(stats.ordersByStatus).map(([status, count]) => (
              <li key={status}>
                <span className="dash-tag">{status}</span>
                <span>{count}</span>
              </li>
            ))}
            {Object.keys(stats.ordersByStatus).length === 0 && (
              <p className="dash-empty">No orders yet.</p>
            )}
          </ul>
        </div>

        <div className="dash-panel">
          <h3>Top products</h3>
          <ul className="dash-list">
            {stats.topProducts.map((p) => (
              <li key={p._id}>
                <span className="dash-truncate">{p.name}</span>
                <span>{p.unitsSold} sold</span>
              </li>
            ))}
            {stats.topProducts.length === 0 && (
              <p className="dash-empty">No sales yet.</p>
            )}
          </ul>
        </div>

        <div className="dash-panel">
          <h3>Low stock (≤ 10)</h3>
          <ul className="dash-list">
            {stats.lowStock.map((p) => (
              <li key={p.id}>
                <span className="dash-truncate">#{p.id} {p.name}</span>
                <span className={p.totalStock === 0 ? "dash-out" : "dash-low"}>
                  {p.totalStock}
                </span>
              </li>
            ))}
            {stats.lowStock.length === 0 && (
              <p className="dash-empty">All well stocked.</p>
            )}
          </ul>
        </div>

        <div className="dash-panel">
          <h3>Top coupons</h3>
          <ul className="dash-list">
            {stats.couponUsage.map((c) => (
              <li key={c.code}>
                <span className="dash-tag">{c.code}</span>
                <span>{c.usedCount} uses</span>
              </li>
            ))}
            {stats.couponUsage.length === 0 && (
              <p className="dash-empty">No coupons redeemed yet.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
