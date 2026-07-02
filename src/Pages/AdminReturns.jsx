import React, { useContext, useEffect, useState } from "react";
import "./CSS/AdminReturns.css";
import { AuthContext } from "../Context/AuthContext";
import { getAllReturns, updateReturnStatus } from "../services/api";
import { useToast } from "../Context/ToastContext";
import Loader from "../Components/Loader/Loader";

const ACTIONS = {
  requested: ["approved", "rejected"],
  approved: ["refunded"],
  rejected: [],
  refunded: [],
};

const AdminReturns = () => {
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    getAllReturns(token)
      .then(setReturns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const act = async (id, status) => {
    setBusyId(id);
    try {
      const updated = await updateReturnStatus(id, status, token);
      setReturns((prev) => prev.map((r) => (r._id === id ? { ...r, status: updated.status } : r)));
      toast.success(`Return ${status}`);
    } catch (err) {
      toast.error(err.message || "Could not update return.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader message="Loading returns..." />;
  if (error) return <div className="adminreturns-error">{error}</div>;

  return (
    <div className="adminreturns">
      <h1>Admin — Returns ({returns.length})</h1>
      {returns.length === 0 ? (
        <p className="adminreturns-empty">No return requests yet.</p>
      ) : (
        <div className="adminreturns-table">
          <div className="adminreturns-row adminreturns-head">
            <span>Order</span>
            <span>Customer</span>
            <span>Reason</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {returns.map((r) => (
            <div className="adminreturns-row" key={r._id}>
              <span>#{String(r.order).slice(-6).toUpperCase()}</span>
              <span className="adminreturns-cust">
                {r.user ? (
                  <>
                    <strong>{r.user.name}</strong>
                    <small>{r.user.email}</small>
                  </>
                ) : "—"}
              </span>
              <span className="adminreturns-reason">{r.reason}</span>
              <span>${r.amount.toFixed(2)}</span>
              <span className={`adminreturns-status s-${r.status}`}>{r.status}</span>
              <span className="adminreturns-actions">
                {ACTIONS[r.status].length === 0 ? (
                  <span className="adminreturns-done">—</span>
                ) : (
                  ACTIONS[r.status].map((s) => (
                    <button key={s} disabled={busyId === r._id} onClick={() => act(r._id, s)}>
                      {s}
                    </button>
                  ))
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReturns;
