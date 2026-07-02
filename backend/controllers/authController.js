const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendMail, passwordResetEmail } = require("../utils/email");

// First allowed origin — where password-reset links should point.
const clientUrl = () =>
  (process.env.CLIENT_URL || "http://localhost:3000").split(",")[0].trim();

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

// POST /api/auth/forgot-password   body: { email }
// Always responds success so we never reveal which emails are registered.
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const genericMsg =
    "If that email is registered, a password reset link has been sent.";

  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (user) {
    // Store only the hash; the raw token goes in the email link.
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const link = `${clientUrl()}/reset-password/${rawToken}`;
    sendMail(passwordResetEmail(user, link)); // fire-and-forget
  }

  res.json({ message: genericMsg });
};

// POST /api/auth/reset-password/:token   body: { password }
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashed = crypto
    .createHash("sha256")
    .update(token || "")
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) {
    return res
      .status(400)
      .json({ message: "This reset link is invalid or has expired." });
  }

  user.password = password; // pre-save hook re-hashes
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  // Log them straight in after a successful reset.
  res.json({ user: publicUser(user), token: signToken(user, false) });
};

module.exports = { signup, login, getMe, forgotPassword, resetPassword };
