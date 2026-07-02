import all_product from "../Components/Assets/all_product";
import data_product from "../Components/Assets/data";
import new_collections from "../Components/Assets/new_collections";

// Configure this in a .env file (see .env.example) once you have a backend, e.g.
//   VITE_API_URL=http://localhost:4000/api
const API_BASE_URL = import.meta.env.VITE_API_URL;

// How long the mock "network" takes, so you can see the loading state in dev.
const SIMULATED_DELAY_MS = 600;

const mockNetwork = (data) =>
  new Promise((resolve) => setTimeout(() => resolve(data), SIMULATED_DELAY_MS));

// When the server rejects our token (401), tell the app so it can clear the
// stale session. AuthContext listens for this and logs the user out, instead
// of authed calls silently failing.
const notifyIf401 = (status) => {
  if (status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:expired"));
  }
};

/**
 * Fetch the product catalog.
 *
 * - If VITE_API_URL is set, it calls `${API_BASE_URL}/products` for real.
 * - If it's NOT set (current state), it resolves the bundled mock data after a
 *   short delay, so the UI keeps working and the loading state is still exercised.
 *
 * Returns a Promise<Product[]>. Throws on a failed request so callers can show
 * an error state.
 */
export const getProducts = async () => {
  if (!API_BASE_URL) {
    return mockNetwork(all_product);
  }

  const response = await fetch(`${API_BASE_URL}/products`);
  if (!response.ok) {
    throw new Error(`Failed to load products (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Search/filter/sort/paginate products. `params` is an object of query values
 * (search, category, brand, minPrice, maxPrice, sort, page, limit).
 * Returns { items, total, page, pages, brands }.
 */
export const searchProducts = async (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  ).toString();

  if (!API_BASE_URL) {
    // Mock fallback: filter the bundled catalog client-side.
    const s = (params.search || "").toLowerCase();
    let items = all_product.filter(
      (p) =>
        (!params.category || p.category === params.category) &&
        (!s || p.name.toLowerCase().includes(s))
    );
    return mockNetwork({
      items,
      total: items.length,
      page: 1,
      pages: 1,
      brands: [],
    });
  }

  const response = await fetch(`${API_BASE_URL}/products/search?${query}`);
  if (!response.ok) {
    throw new Error(`Search failed (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Fetch a single product by id.
 *
 * Falls back to filtering the mock catalog when no API is configured. Returns
 * Promise<Product | undefined>.
 */
export const getProductById = async (id) => {
  if (!API_BASE_URL) {
    const product = all_product.find((p) => p.id === Number(id));
    return mockNetwork(product);
  }

  const response = await fetch(`${API_BASE_URL}/products/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load product ${id} (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Fetch the curated "Popular in Women" list for the homepage.
 * Falls back to the bundled data. Returns Promise<Product[]>.
 */
export const getRecommended = async (productId) => {
  if (!API_BASE_URL) return mockNetwork([]);
  const response = await fetch(`${API_BASE_URL}/products/${productId}/recommended`);
  if (!response.ok) {
    throw new Error(`Failed to load recommendations (HTTP ${response.status})`);
  }
  return response.json();
};

/** Delivery estimate for a pincode. Returns { serviceable, etaDays, codAvailable, zone }. */
export const getDeliveryEstimate = async (pincode) => {
  if (!API_BASE_URL) return mockNetwork({ serviceable: true, etaDays: 5, codAvailable: true, zone: "Standard" });
  const response = await fetch(`${API_BASE_URL}/shipping/estimate/${encodeURIComponent(pincode)}`);
  if (!response.ok) throw new Error("Could not estimate delivery");
  return response.json();
};

/** Autocomplete suggestions for the search box. Returns [{id,name,image}]. */
export const suggestProducts = async (q) => {
  if (!API_BASE_URL) return mockNetwork([]);
  const response = await fetch(`${API_BASE_URL}/products/suggest?q=${encodeURIComponent(q)}`);
  if (!response.ok) return [];
  return response.json();
};

/** Distinct brands grouped by category (for the nav mega-menu). */
export const getBrands = async () => {
  if (!API_BASE_URL) return mockNetwork({});
  const response = await fetch(`${API_BASE_URL}/products/brands`);
  if (!response.ok) throw new Error("Failed to load brands");
  return response.json();
};

export const getPopularProducts = async () => {
  if (!API_BASE_URL) {
    return mockNetwork(data_product);
  }

  const response = await fetch(`${API_BASE_URL}/products/popular`);
  if (!response.ok) {
    throw new Error(`Failed to load popular products (HTTP ${response.status})`);
  }
  return response.json();
};

/**
 * Fetch the "New Collections" list for the homepage.
 * Falls back to the bundled data. Returns Promise<Product[]>.
 */
export const getNewCollections = async () => {
  if (!API_BASE_URL) {
    return mockNetwork(new_collections);
  }

  const response = await fetch(`${API_BASE_URL}/products/newcollections`);
  if (!response.ok) {
    throw new Error(`Failed to load new collections (HTTP ${response.status})`);
  }
  return response.json();
};

// Shared helper for POST requests that return JSON and throw the server's
// error message on failure.
// Authenticated GET returning JSON (throws server message on failure).
const authGet = async (path, token) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || `Request failed (HTTP ${response.status})`);
  }
  return data;
};

const postJson = async (path, body, token) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error(data.message || `Request failed (HTTP ${response.status})`);
  }
  return data;
};

/**
 * Register a new account. Returns { user, token }.
 * Falls back to a mock session when no API is configured.
 */
export const signup = async ({ name, email, password, rememberMe }) => {
  if (!API_BASE_URL) {
    return mockNetwork({ user: { name, email }, token: "mock-token" });
  }
  return postJson("/auth/signup", { name, email, password, rememberMe });
};

/**
 * Log in. Returns { user, token }.
 * Falls back to a mock session when no API is configured.
 */
export const login = async ({ email, password, rememberMe }) => {
  if (!API_BASE_URL) {
    return mockNetwork({
      user: { name: email.split("@")[0], email },
      token: "mock-token",
    });
  }
  return postJson("/auth/login", { email, password, rememberMe });
};

/**
 * Request a password-reset link. Always resolves (the server never reveals
 * whether the email exists). Returns { message }.
 */
export const forgotPassword = async (email) => {
  if (!API_BASE_URL) {
    return mockNetwork({
      message: "If that email is registered, a password reset link has been sent.",
    });
  }
  return postJson("/auth/forgot-password", { email });
};

/**
 * Set a new password using the token from the reset email. Returns
 * { user, token } and logs the user in on success.
 */
export const resetPassword = async (token, password) => {
  if (!API_BASE_URL) {
    return mockNetwork({ user: { name: "User", email: "" }, token: "mock-token" });
  }
  return postJson(`/auth/reset-password/${token}`, { password });
};

/**
 * Place an order. `items` is [{ productId, quantity }]; also needs a
 * shippingAddress and payment (mock card). Requires a token.
 * Falls back to a mock confirmation when no API is configured.
 */
export const createOrder = async ({
  items,
  promoCode,
  shippingAddress,
  payment,
  paymentIntentId,
  paymentMethod,
  token,
}) => {
  if (!API_BASE_URL) {
    return mockNetwork({ status: "paid", items });
  }
  return postJson(
    "/orders",
    { items, promoCode, shippingAddress, payment, paymentIntentId, paymentMethod },
    token
  );
};

/** Fetch an order's invoice HTML (authed) and open it in a new tab. */
export const openInvoice = async (orderId, token) => {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/invoice`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error("Could not load invoice");
  }
  const html = await response.text();
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

/** Upload a product image (approved seller/admin). Returns { filename, url }. */
export const uploadProductImage = async (file, token) => {
  const form = new FormData();
  form.append("image", file);
  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || "Upload failed");
  }
  return data;
};

/**
 * Subscribe an email to the newsletter. Returns { message }.
 * Falls back to a mock confirmation when no API is configured.
 */
export const subscribeNewsletter = async (email) => {
  if (!API_BASE_URL) {
    return mockNetwork({ message: "Thanks for subscribing!" });
  }
  return postJson("/newsletter", { email });
};

/**
 * Fetch the logged-in user's orders (most recent first). Requires a token.
 * Falls back to an empty list when no API is configured.
 */
export const getOrders = async (token) => {
  if (!API_BASE_URL) {
    return mockNetwork([]);
  }
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error(
      (data && data.message) || `Failed to load orders (HTTP ${response.status})`
    );
  }
  return data;
};

/**
 * Admin: fetch every product (incl. unavailable). Requires an admin token.
 */
export const getAdminProducts = async (token) => {
  const response = await fetch(`${API_BASE_URL}/products/admin`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error(
      (data && data.message) || `Failed to load products (HTTP ${response.status})`
    );
  }
  return data;
};

/** Admin: create a product. */
export const createProduct = async (product, token) =>
  postJson("/products", product, token);

/** Admin: update a product by numeric id. */
export const updateProduct = async (id, updates, token) => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || `Update failed (HTTP ${response.status})`);
  }
  return data;
};

/** Admin: delete a product by numeric id. */
export const deleteProduct = async (id, token) => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || `Delete failed (HTTP ${response.status})`);
  }
  return data;
};

/**
 * Create a Stripe PaymentIntent for the current cart. Returns
 * { clientSecret, amount }. Requires a token. Only used in Stripe mode.
 */
export const createPaymentIntent = async ({ items, promoCode, token }) => {
  return postJson("/payments/create-intent", { items, promoCode }, token);
};

/**
 * Admin: fetch every order (with customer info). Requires an admin token.
 */
export const getAllOrders = async (token) => {
  if (!API_BASE_URL) {
    return mockNetwork([]);
  }
  const response = await fetch(`${API_BASE_URL}/orders/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error(
      (data && data.message) || `Failed to load orders (HTTP ${response.status})`
    );
  }
  return data;
};

/**
 * Admin: update an order's status. Requires an admin token.
 */
export const updateOrderStatus = async (orderId, status, token) => {
  if (!API_BASE_URL) {
    return mockNetwork({ _id: orderId, status });
  }
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error(
      (data && data.message) || `Failed to update status (HTTP ${response.status})`
    );
  }
  return data;
};

// ---- Seller / marketplace ----
export const applyToSell = (shopName, token) =>
  postJson("/seller/apply", { shopName }, token);

export const getSellerStats = (token) => authGet("/seller/stats", token);
export const getSellerProducts = (token) => authGet("/seller/products", token);
export const getSellerOrders = (token) => authGet("/seller/orders", token);

/** Admin: list sellers. */
export const getSellers = (token) => authGet("/admin/sellers", token);
/** Admin: approve/suspend a seller. */
export const setSellerApproval = async (id, approved, token) => {
  const response = await fetch(`${API_BASE_URL}/admin/sellers/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sellerApproved: approved }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || "Failed to update seller");
  }
  return data;
};

/** Admin: dashboard stats. Requires an admin token. */
export const getAdminStats = async (token) => {
  const response = await fetch(`${API_BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || `Failed to load stats`);
  }
  return data;
};

/** Fetch one order by id (owner or admin). Requires a token. */
export const getOrderById = async (orderId, token) => {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || `Failed to load order`);
  }
  return data;
};

/** Cancel an order (owner). Requires a token. */
export const cancelOrder = async (orderId, token) => {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || `Failed to cancel order`);
  }
  return data;
};

// ---- Returns (all require a token) ----
export const requestReturn = (orderId, reason, token) =>
  postJson("/returns", { orderId, reason }, token);

export const getMyReturns = async (token) => {
  const response = await fetch(`${API_BASE_URL}/returns`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || "Failed to load returns");
  }
  return data;
};

export const getAllReturns = async (token) => {
  const response = await fetch(`${API_BASE_URL}/returns/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || "Failed to load returns");
  }
  return data;
};

export const updateReturnStatus = async (id, status, token) => {
  const response = await fetch(`${API_BASE_URL}/returns/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || "Failed to update return");
  }
  return data;
};

// ---- Saved addresses (all require a token) ----
const authJson = async (path, method, body, token) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || `Request failed (HTTP ${response.status})`);
  }
  return data;
};

export const getAddresses = (token) => authJson("/addresses", "GET", null, token);
export const addAddress = (addr, token) => authJson("/addresses", "POST", addr, token);
export const updateAddress = (id, addr, token) =>
  authJson(`/addresses/${id}`, "PUT", addr, token);
export const deleteAddress = (id, token) =>
  authJson(`/addresses/${id}`, "DELETE", null, token);

/** Fetch the user's wishlist (full product objects). Requires a token. */
export const getWishlist = async (token) => {
  const response = await fetch(`${API_BASE_URL}/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || `Failed to load wishlist`);
  }
  return data;
};

/** Add a product to the wishlist. Returns { wishlist: [ids] }. */
export const addToWishlistApi = async (productId, token) => {
  const response = await fetch(`${API_BASE_URL}/wishlist/${productId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || "Failed");
  }
  return data;
};

/** Remove a product from the wishlist. Returns { wishlist: [ids] }. */
export const removeFromWishlistApi = async (productId, token) => {
  const response = await fetch(`${API_BASE_URL}/wishlist/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    notifyIf401(response.status);
    throw new Error((data && data.message) || "Failed");
  }
  return data;
};

/** Fetch reviews for a product. Returns Review[]. */
export const getReviews = async (productId) => {
  if (!API_BASE_URL) return mockNetwork([]);
  const response = await fetch(`${API_BASE_URL}/products/${productId}/reviews`);
  if (!response.ok) {
    throw new Error(`Failed to load reviews (HTTP ${response.status})`);
  }
  return response.json();
};

/** Submit (or update) a review for a product. Requires a token. */
export const addReview = async (productId, { rating, text }, token) =>
  postJson(`/products/${productId}/reviews`, { rating, text }, token);

/**
 * Validate a coupon for a given subtotal. Returns
 * { valid, code?, discountType?, discountValue?, minOrder?, discountAmount?, message }.
 * Falls back to a mock SHOPPER10 check when no API is configured.
 */
export const validateCoupon = async (code, subtotal) => {
  const normalized = (code || "").trim().toUpperCase();

  if (!API_BASE_URL) {
    if (normalized === "SHOPPER10") {
      return mockNetwork({
        valid: true,
        code: "SHOPPER10",
        discountType: "percent",
        discountValue: 10,
        minOrder: 0,
        message: "Coupon applied — 10% off!",
      });
    }
    return mockNetwork({ valid: false, message: "Invalid coupon code." });
  }

  const response = await fetch(
    `${API_BASE_URL}/coupons/${encodeURIComponent(normalized)}?subtotal=${subtotal}`
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Coupon check failed (HTTP ${response.status})`);
  }
  return data;
};
