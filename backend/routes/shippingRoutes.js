const express = require("express");
const { estimate, ruleBasedEstimate } = require("../utils/courier");

const router = express.Router();

// GET /api/shipping/estimate/:pincode  (public)
// Uses the real courier when COURIER_PROVIDER is set, else a rule-based ETA.
router.get("/estimate/:pincode", async (req, res) => {
  res.json(await estimate(req.params.pincode));
});

module.exports = router;
// Back-compat: some callers imported the synchronous rule-based helper.
module.exports.estimateForPincode = ruleBasedEstimate;
