const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the "Authorization: Bearer <token>" header and attaches req.user.
const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Must run after `protect`. Allows only admin users through.
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Admin access required" });
};

// Must run after `protect`. Allows approved sellers (and admins) through.
const seller = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  if (req.user && req.user.role === "seller" && req.user.sellerApproved) {
    return next();
  }
  return res
    .status(403)
    .json({ message: "Approved seller access required" });
};

module.exports = { protect, admin, seller };
