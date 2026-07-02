const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth");
const {
  signup,
  login,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const {
  validate,
  signupRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require("../middleware/validators");

const router = express.Router();

router.post("/signup", signupRules, validate, asyncHandler(signup));
router.post("/login", loginRules, validate, asyncHandler(login));
router.get("/me", protect, asyncHandler(getMe));
router.post("/forgot-password", forgotPasswordRules, validate, asyncHandler(forgotPassword));
router.post("/reset-password/:token", resetPasswordRules, validate, asyncHandler(resetPassword));

module.exports = router;
