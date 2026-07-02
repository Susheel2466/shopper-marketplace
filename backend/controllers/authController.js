const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Long-lived token when "remember me" is on, short-lived otherwise.
const signToken = (user, rememberMe) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: rememberMe
      ? process.env.JWT_REMEMBER_EXPIRES_IN || "30d"
      : process.env.JWT_EXPIRES_IN || "1d",
  });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  shopName: user.shopName,
  sellerApproved: user.sellerApproved,
});

// POST /api/auth/signup   body: { name, email, password }
const signup = async (req, res) => {
  const { name, email, password, rememberMe } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email and password are required" });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ message: "That email is already in use" });
  }

  const user = await User.create({ name, email, password });
  res
    .status(201)
    .json({ user: publicUser(user), token: signToken(user, rememberMe) });
};

// POST /api/auth/login   body: { email, password, rememberMe }
const login = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({ user: publicUser(user), token: signToken(user, rememberMe) });
};

// GET /api/auth/me   (protected)
const getMe = async (req, res) => {
  res.json({ user: publicUser(req.user) });
};

module.exports = { signup, login, getMe };
