const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { subscribe } = require("../controllers/newsletterController");
const { validate, newsletterRules } = require("../middleware/validators");

const router = express.Router();

router.post("/", newsletterRules, validate, asyncHandler(subscribe));

module.exports = router;
