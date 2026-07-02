import React, { useState } from "react";
import "./NewsLetter.css";
import { subscribeNewsletter } from "../../services/api";
import { useToast } from "../../Context/ToastContext";

const NewsLetter = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const subscribe = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const result = await subscribeNewsletter(email);
      toast.success(result.message || "Thanks for subscribing!");
      setEmail("");
    } catch (err) {
      toast.error(err.message || "Subscription failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="newsletter">
      <h1>Get Exclusive Offers On Your Email</h1>
      <p>Subscribe to our newsletter and stay updated</p>
      <div>
        <input
          type="email"
          placeholder="Your Email id"
          aria-label="Email address for newsletter"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button onClick={subscribe} disabled={submitting}>
          {submitting ? "..." : "Subscribe"}
        </button>
      </div>
      {message && <p className="newsletter-message">{message}</p>}
    </div>
  );
};

export default NewsLetter;
