import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
  getWishlist,
  addToWishlistApi,
  removeFromWishlistApi,
} from "../services/api";

export const WishlistContext = createContext(null);

const WishlistContextProvider = (props) => {
  const { user, token } = useContext(AuthContext);
  const [ids, setIds] = useState([]); // numeric product ids

  // Load the wishlist whenever the logged-in user changes.
  useEffect(() => {
    if (!user || !token) {
      setIds([]);
      return;
    }
    getWishlist(token)
      .then((products) => setIds(products.map((p) => p.id)))
      .catch(() => setIds([]));
  }, [user, token]);

  const isWished = (id) => ids.includes(id);

  // Returns false if the user isn't logged in (caller can redirect to login).
  const toggle = async (id) => {
    if (!user || !token) return false;
    try {
      const res = isWished(id)
        ? await removeFromWishlistApi(id, token)
        : await addToWishlistApi(id, token);
      setIds(res.wishlist);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <WishlistContext.Provider
      value={{ ids, count: ids.length, isWished, toggle }}
    >
      {props.children}
    </WishlistContext.Provider>
  );
};

export default WishlistContextProvider;
