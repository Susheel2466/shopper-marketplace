import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CSS/AdminDashboard.css";
import { AuthContext } from "../Context/AuthContext";
import { getSellerStats } from "../services/api";
import Loader from "../Components/Loader/Loader";

const SellerDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSellerStats(token)
      .then(setStats)
      .catch((err) => setError(err.message || "Could not load stats."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Loader message="Loading your shop..." />;
  if (error) return <div className="dash-error">{error}</div>;

  return (
    <div className="dash">
      <h1>{user?.shopName || "My Shop"} — Seller Dashboard</h1>

      <div className="dash-cards">
        <div className="dash-card">
          <span className="dash-card-label">Gross revenue</span>
          <span className="dash-card-value">${stats.grossRevenue.toFixed(2)}</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">Net earnings</span>
          <span className="dash-card-value">${stats.netEarnings.toFixed(2)}</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">Units sold</span>
          <span className="dash-card-value">{stats.unitsSold}</span>
        </div>
        <div className="dash-card">
          <span className="dash-card-label">Products</span>
          <span className="dash-card-value">{stats.productCount}</span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-panel">
          <h3>Payouts</h3>
          <ul className="dash-list">
            <li><span>Gross sales</span><span>${stats.grossRevenue.toFixed(2)}</span></li>
            <li><span>Platform commission ({Math.round(stats.commissionRate * 100)}%)</span>
              <span>-${(stats.grossRevenue - stats.netEarnings).toFixed(2)}</span></li>
            <li><span><strong>Your earnings</strong></span><span><strong>${stats.netEarnings.toFixed(2)}</strong></span></li>
          </ul>
        </div>
        <div className="dash-panel">
          <h3>Manage</h3>
          <ul className="dash-list">
            <li><Link to="/seller/products" className="dash-tag">My Products →</Link></li>
            <li><Link to="/seller/orders" className="dash-tag">My Orders →</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
