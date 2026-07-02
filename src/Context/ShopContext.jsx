import React, { createContext, useEffect, useState } from "react";
import { getProducts } from "../services/api";

export const ShopContext = createContext(null);

// Cart is keyed by product + variant so the same product in different
// sizes/colors are separate lines. Value: { productId, size, color, quantity }.
export const cartKey = (productId, size = "", color = "") =>
  `${productId}::${size}::${color}`;

const STORAGE_KEY = "shopper-cart-v2"; // v2: new variant-aware shape

const ShopContextProvider = (props) => {
  const [allProduct, setAllProduct] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      // Guard against an old/incompatible shape.
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      setLoading(true);
      try {
        const data = await getProducts();
        if (!isMounted) return;
        setAllProduct(data);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Unable to load products. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const addToCart = (productId, size = "", color = "") => {
    const key = cartKey(productId, size, color);
    setCartItems((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : { productId, size, color, quantity: 1 },
      };
    });
  };

  // Decrease quantity by one for a specific cart line (by key); removes at 0.
  const removeOne = (key) => {
    setCartItems((prev) => {
      const entry = prev[key];
      if (!entry) return prev;
      if (entry.quantity <= 1) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...entry, quantity: entry.quantity - 1 } };
    });
  };

  // Remove an entire cart line regardless of quantity.
  const removeLine = (key) => {
    setCartItems((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getTotalCartAmount = () => {
    let total = 0;
    for (const key in cartItems) {
      const entry = cartItems[key];
      const product = allProduct.find((p) => p.id === Number(entry.productId));
      if (product) total += product.new_price * entry.quantity;
    }
    return total;
  };

  const getTotalCartItems = () => {
    let count = 0;
    for (const key in cartItems) count += cartItems[key].quantity;
    return count;
  };

  const clearCart = () => setCartItems({});

  const contextValue = {
    all_product: allProduct,
    loading,
    error,
    cartItems,
    addToCart,
    removeOne,
    removeLine,
    getTotalCartAmount,
    getTotalCartItems,
    clearCart,
  };

  return (
    <ShopContext.Provider value={contextValue}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;
