const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth");
const { signup, login, getMe } = require("../controllers/authController");
const { validate, signupRules, loginRules } = require("../middleware/validators");

const router = express.Router();

router.post("/signup", signupRules, validate, asyncHandler(signup));
router.post("/login", loginRules, validate, asyncHandler(login));
router.get("/me", protect, asyncHandler(getMe));

module.exports = router;
