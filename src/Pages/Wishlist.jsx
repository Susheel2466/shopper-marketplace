import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./CSS/Wishlist.css";
import { AuthContext } from "../Context/AuthContext";
import { WishlistContext } from "../Context/WishlistContext";
import { getWishlist } from "../services/api";
import Item from "../Components/Item/Item";
import Loader from "../Components/Loader/Loader";

const Wishlist = () => {
  const { token } = useContext(AuthContext);
  const { ids } = useContext(WishlistContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Re-fetch full product objects whenever the set of wishlisted ids changes.
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getWishlist(token)
      .then((data) => mounted && setProducts(data))
      .catch(() => mounted && setProducts([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [token, ids]);

  if (loading) return <Loader message="Loading your wishlist..." />;

  return (
    <div className="wishlist">
      <h1>My Wishlist ({products.length})</h1>
      {products.length === 0 ? (
        <div className="wishlist-empty">
          <p>Your wishlist is empty.</p>
          <Link to="/" className="wishlist-shop-link">
            Discover products
          </Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {products.map((p) => (
            <Item
              key={p.id}
              id={p.id}
              name={p.name}
              image={p.image}
              new_price={p.new_price}
              old_price={p.old_price}
              inStock={p.inStock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
