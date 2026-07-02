// Courier integration seam.
//
// Off by default → deterministic, rule-based ETA + a synthetic tracking number
// (what the app used before). Set COURIER_PROVIDER=shiprocket + credentials and
// the same two functions call the real courier instead. Callers
// (shippingRoutes, orderController) don't change.
//
// To go live later:
//   1. Create a Shiprocket account + an API user
//      (Settings → API → Create an API User).
//   2. Add to backend/.env:
//        COURIER_PROVIDER=shiprocket
//        SHIPROCKET_EMAIL=api-user@yourdomain.com
//        SHIPROCKET_PASSWORD=...
//        COURIER_PICKUP_PINCODE=560001   # your dispatch pincode
//   3. Restart the server.
//
// NOTE: the Shiprocket request/response shapes below follow their public v1
// API, but they DO evolve — verify the field names against your account's
// docs the first time you enable it. Every real call is wrapped so any
// failure falls back to the rule-based result instead of breaking checkout.

const PROVIDER = (process.env.COURIER_PROVIDER || "").toLowerCase();
const courierEnabled = () => PROVIDER === "shiprocket";

const SR_BASE = "https://apiv2.shiprocket.in/v1/external";
const PICKUP = process.env.COURIER_PICKUP_PINCODE || "560001";

// ---- Rule-based fallback (also used when the courier call fails) -------
const ruleBasedEstimate = (pincode) => {
  const pin = String(pincode || "").replace(/\D/g, "");
  if (pin.length !== 6) {
    return { serviceable: false, message: "Enter a valid 6-digit pincode" };
  }
  // Metro pincodes (start 11/40/56/60/70) → faster; others → standard.
  const metro = /^(11|40|56|60|70)/.test(pin);
  const days = metro ? 3 : 6;
  return {
    serviceable: true,
    pincode: pin,
    etaDays: days,
    codAvailable: !/^7/.test(pin), // demo rule: 7xxxxx = prepaid only
    zone: metro ? "Metro" : "Standard",
    source: "rule",
  };
};

// ---- Shiprocket auth (token cached ~9 days; Shiprocket tokens last 10) --
let tokenCache = { token: null, expires: 0 };

const srToken = async () => {
  if (tokenCache.token && Date.now() < tokenCache.expires) return tokenCache.token;
  const res = await fetch(`${SR_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Shiprocket auth failed (${res.status})`);
  const data = await res.json();
  tokenCache = { token: data.token, expires: Date.now() + 9 * 24 * 3600 * 1000 };
  return data.token;
};

const srFetch = async (path, options = {}) => {
  const token = await srToken();
  const res = await fetch(`${SR_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Shiprocket ${path} → ${res.status}`);
  return res.json();
};

// Delivery estimate for a destination pincode (checkout "Delivery by ...").
const estimate = async (pincode) => {
  const pin = String(pincode || "").replace(/\D/g, "");
  if (pin.length !== 6) {
    return { serviceable: false, message: "Enter a valid 6-digit pincode" };
  }
  if (!courierEnabled()) return ruleBasedEstimate(pin);

  try {
    const data = await srFetch(
      `/courier/serviceability/?pickup_postcode=${PICKUP}&delivery_postcode=${pin}&weight=0.5&cod=1`
    );
    const options = data?.data?.available_courier_companies || [];
    if (!options.length) return { serviceable: false, pincode: pin, message: "Not serviceable" };
    // Fastest available option.
    const best = options.reduce((a, b) =>
      Number(a.estimated_delivery_days) <= Number(b.estimated_delivery_days) ? a : b
    );
    return {
      serviceable: true,
      pincode: pin,
      etaDays: Number(best.estimated_delivery_days) || 5,
      codAvailable: options.some((c) => c.cod === 1 || c.cod === "1"),
      zone: best.zone || "",
      courierName: best.courier_name,
      source: "shiprocket",
    };
  } catch (err) {
    // Courier down / misconfigured → don't block checkout.
    return ruleBasedEstimate(pin);
  }
};

// Create a shipment when an order ships. Returns { trackingNumber,
// expectedDelivery, courierName } — the caller stores these on the order.
const synthetic = (order) => {
  const est = ruleBasedEstimate(order.shippingAddress?.postalCode);
  const days = est.serviceable ? est.etaDays : 5;
  const eta = new Date();
  eta.setDate(eta.getDate() + days);
  return {
    trackingNumber: "SHPR" + String(order._id).slice(-8).toUpperCase(),
    expectedDelivery: eta,
    courierName: "",
  };
};

const createShipment = async (order) => {
  if (!courierEnabled()) return synthetic(order);

  try {
    const a = order.shippingAddress || {};
    // 1) Create an ad-hoc order in Shiprocket.
    const created = await srFetch(`/orders/create/adhoc`, {
      method: "POST",
      body: JSON.stringify({
        order_id: String(order._id),
        order_date: new Date(order.createdAt).toISOString().slice(0, 10),
        pickup_location: process.env.COURIER_PICKUP_NAME || "Primary",
        billing_customer_name: a.fullName,
        billing_last_name: "",
        billing_address: a.line1,
        billing_address_2: a.line2 || "",
        billing_city: a.city,
        billing_pincode: a.postalCode,
        billing_state: a.state,
        billing_country: a.country,
        billing_phone: a.phone,
        shipping_is_billing: true,
        order_items: order.items.map((i) => ({
          name: i.name,
          sku: `${i.productId}-${i.size || "NA"}-${i.color || "NA"}`,
          units: i.quantity,
          selling_price: i.price,
        })),
        payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
        sub_total: order.subtotalAmount || order.amount,
        length: 15,
        breadth: 15,
        height: 10,
        weight: 0.5,
      }),
    });

    // 2) Request an AWB (tracking number) for the shipment.
    let trackingNumber = "";
    let courierName = "";
    if (created.shipment_id) {
      try {
        const awb = await srFetch(`/courier/assign/awb`, {
          method: "POST",
          body: JSON.stringify({ shipment_id: created.shipment_id }),
        });
        trackingNumber = awb?.response?.data?.awb_code || "";
        courierName = awb?.response?.data?.courier_name || "";
      } catch {
        /* AWB assignment can be retried from the dashboard later */
      }
    }

    const est = await estimate(a.postalCode);
    const eta = new Date();
    eta.setDate(eta.getDate() + (est.serviceable ? est.etaDays : 5));

    return {
      trackingNumber: trackingNumber || "SHPR" + String(order._id).slice(-8).toUpperCase(),
      expectedDelivery: eta,
      courierName,
    };
  } catch (err) {
    // Any failure → synthetic tracking so the order can still ship.
    return synthetic(order);
  }
};

module.exports = {
  courierEnabled,
  ruleBasedEstimate,
  estimate,
  createShipment,
};
