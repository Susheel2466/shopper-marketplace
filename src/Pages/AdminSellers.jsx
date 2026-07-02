import React, { useContext, useEffect, useState } from "react";
import "./CSS/AdminReturns.css";
import { AuthContext } from "../Context/AuthContext";
import { getSellers, setSellerApproval } from "../services/api";
import { useToast } from "../Context/ToastContext";
import Loader from "../Components/Loader/Loader";

const AdminSellers = () => {
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    getSellers(token)
      .then(setSellers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const toggle = async (s) => {
    setBusyId(s._id);
    try {
      const res = await setSellerApproval(s._id, !s.sellerApproved, token);
      setSellers((prev) =>
        prev.map((x) => (x._id === s._id ? { ...x, sellerApproved: res.sellerApproved } : x))
      );
      toast.success(res.sellerApproved ? "Seller approved" : "Seller suspended");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader message="Loading sellers..." />;
  if (error) return <div className="adminreturns-error">{error}</div>;

  return (
    <div className="adminreturns">
      <h1>Admin — Sellers ({sellers.length})</h1>
      {sellers.length === 0 ? (
        <p className="adminreturns-empty">No seller applications yet.</p>
      ) : (
        <div className="adminreturns-table">
          <div className="adminreturns-row adminreturns-head">
            <span>Shop</span>
            <span>Owner</span>
            <span>Commission</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {sellers.map((s) => (
            <div className="adminreturns-row" key={s._id}>
              <span><strong>{s.shopName}</strong></span>
              <span className="adminreturns-cust">
                {s.name}
                <small>{s.email}</small>
              </span>
              <span>{Math.round((s.commissionRate ?? 0.1) * 100)}%</span>
              <span className={`adminreturns-status ${s.sellerApproved ? "s-refunded" : "s-requested"}`}>
                {s.sellerApproved ? "approved" : "pending"}
              </span>
              <span>
                <button disabled={busyId === s._id} onClick={() => toggle(s)}>
                  {s.sellerApproved ? "Suspend" : "Approve"}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSellers;
