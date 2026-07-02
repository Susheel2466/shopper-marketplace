import React, { useContext, useEffect, useState } from "react";
import "./Reviews.css";
import star_icon from "../Assets/star_icon.png";
import star_dull_icon from "../Assets/star_dull_icon.png";
import { AuthContext } from "../../Context/AuthContext";
import { getReviews, addReview } from "../../services/api";

const Stars = ({ value }) => (
  <span className="reviews-stars">
    {[1, 2, 3, 4, 5].map((n) => (
      <img key={n} src={n <= value ? star_icon : star_dull_icon} alt="" />
    ))}
  </span>
);

const Reviews = ({ productId }) => {
  const { user, token } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    getReviews(productId)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1) {
      setMessage("Please pick a star rating.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      await addReview(productId, { rating, text }, token);
      setRating(0);
      setText("");
      setMessage("Thanks! Your review was saved.");
      load();
    } catch (err) {
      setMessage(err.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reviews">
      {user ? (
        <form className="reviews-form" onSubmit={submit}>
          <h3>Write a review</h3>
          <div className="reviews-rate">
            {[1, 2, 3, 4, 5].map((n) => (
              <img
                key={n}
                src={n <= rating ? star_icon : star_dull_icon}
                alt={`${n} star`}
                onClick={() => setRating(n)}
              />
            ))}
          </div>
          <textarea
            placeholder="Share your thoughts about this product..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
          />
          {message && <p className="reviews-msg">{message}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Submit review"}
          </button>
        </form>
      ) : (
        <p className="reviews-login">Please log in to write a review.</p>
      )}

      <div className="reviews-list">
        {loading ? (
          <p>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="reviews-empty">No reviews yet. Be the first!</p>
        ) : (
          reviews.map((r) => (
            <div className="reviews-item" key={r._id}>
              <div className="reviews-item-head">
                <strong>{r.name}</strong>
                <Stars value={r.rating} />
              </div>
              {r.text && <p className="reviews-item-text">{r.text}</p>}
              <span className="reviews-item-date">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
