import React, { useContext } from "react";
import "./Item.css";
import { Link, useNavigate } from "react-router-dom";
import { WishlistContext } from "../../Context/WishlistContext";
import { AuthContext } from "../../Context/AuthContext";
import { useToast } from "../../Context/ToastContext";

const Item = (props) => {
  const { isWished, toggle } = useContext(WishlistContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  const onHeart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    const wasWished = isWished(props.id);
    toggle(props.id);
    toast.success(wasWished ? "Removed from wishlist" : "Added to wishlist");
  };

  return (
    <div className="item">
      <div className="item-img-wrap">
        {props.inStock === false && (
          <span className="item-oos-badge">Out of stock</span>
        )}
        <Link to={`/product/${props.id}`}>
          <img
            onClick={() => window.scrollTo(0, 0)}
            src={props.image}
            alt={props.name}
          />
        </Link>
        <button
          className={`item-heart ${isWished(props.id) ? "active" : ""}`}
          onClick={onHeart}
          aria-label="Toggle wishlist"
        >
          {isWished(props.id) ? "♥" : "♡"}
        </button>
      </div>
      <p>{props.name}</p>
      <div className="item-prices">
        <div className="item-price-new">${props.new_price}</div>
        <div className="item-price-old">${props.old_price}</div>
      </div>
    </div>
  );
};

export default Item;
