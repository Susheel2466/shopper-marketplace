import React, { useContext, useState } from "react";
import "./CSS/LoginSignup.css";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import { useToast } from "../Context/ToastContext";
import { login as loginRequest, signup as signupRequest } from "../services/api";

const LoginSignup = () => {
  const [state, setState] = useState("Sign Up");
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Where to send the user after logging in (set by ProtectedRoute), else home.
  const from = location.state?.from?.pathname || "/";

  const changeHandler = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (state === "Sign Up" && !formData.name.trim()) {
      return "Please enter your name.";
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      return "Please enter a valid email address.";
    }
    if (formData.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    return "";
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result =
        state === "Sign Up"
          ? await signupRequest({
              name: formData.name.trim(),
              email: formData.email,
              password: formData.password,
              rememberMe: remember,
            })
          : await loginRequest({
              email: formData.email,
              password: formData.password,
              rememberMe: remember,
            });
      login(result.user, result.token, remember);
      toast.success(`Welcome, ${result.user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>{state}</h1>
        <form className="loginsignup-fields" onSubmit={submitHandler}>
          {state === "Sign Up" && (
            <input
              type="text"
              name="name"
              aria-label="Full name"
              value={formData.name}
              onChange={changeHandler}
              placeholder="Your Name"
            />
          )}
          <input
            type="email"
            name="email"
            aria-label="Email address"
            value={formData.email}
            onChange={changeHandler}
            placeholder="Email Address"
          />
          <input
            type="password"
            name="password"
            aria-label="Password"
            value={formData.password}
            onChange={changeHandler}
            placeholder="Password"
          />
          <label className="loginsignup-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me for 30 days
          </label>
          {error && <p className="loginsignup-error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : "Continue"}
          </button>
        </form>
        {state === "Sign Up" ? (
          <p className="loginsignup-login">
            Already have an account?{" "}
            <span onClick={() => { setState("Login"); setError(""); }}>
              Login here
            </span>
          </p>
        ) : (
          <p className="loginsignup-login">
            Create an account?{" "}
            <span onClick={() => { setState("Sign Up"); setError(""); }}>
              Click here
            </span>
          </p>
        )}
        <div className="loginsignup-agree">
          <input type="checkbox" name="" id="" />
          <p>By continuing, I agree to the terms of use & privacy policy.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
