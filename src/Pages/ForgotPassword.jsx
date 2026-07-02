import React, { useState } from "react";
import "./CSS/LoginSignup.css";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setSent(true);
      setError("");
      // Keep the generic message the server returns.
      if (res && res.message) setError("");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>Forgot Password</h1>
        {sent ? (
          <>
            <p style={{ color: "#515151", lineHeight: 1.5 }}>
              If <b>{email}</b> is registered, we've sent a password reset link
              to it. The link expires in 1 hour — check your inbox (and spam).
            </p>
            <p className="loginsignup-login">
              <Link to="/login">Back to login</Link>
            </p>
          </>
        ) : (
          <>
            <p style={{ color: "#515151", marginBottom: 20 }}>
              Enter your account email and we'll send you a link to reset your
              password.
            </p>
            <form className="loginsignup-fields" onSubmit={submitHandler}>
              <input
                type="email"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
              />
              {error && <p className="loginsignup-error">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <p className="loginsignup-login">
              Remembered it? <Link to="/login">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
