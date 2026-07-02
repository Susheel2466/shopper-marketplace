import React, { useContext, useState } from "react";
import "./CSS/LoginSignup.css";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import { useToast } from "../Context/ToastContext";
import { resetPassword } from "../services/api";

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await resetPassword(token, password);
      // Server logs the user in on success.
      login(result.user, result.token, false);
      toast.success("Password updated. You're now logged in.");
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.message || "This reset link is invalid or has expired."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>Reset Password</h1>
        <p style={{ color: "#515151", marginBottom: 20 }}>
          Choose a new password for your account.
        </p>
        <form className="loginsignup-fields" onSubmit={submitHandler}>
          <input
            type="password"
            aria-label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
          />
          <input
            type="password"
            aria-label="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
          />
          {error && <p className="loginsignup-error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Reset password"}
          </button>
        </form>
        <p className="loginsignup-login">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
