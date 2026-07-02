const Newsletter = require("../models/Newsletter");

// POST /api/newsletter   body: { email }
const subscribe = async (req, res) => {
  const { email } = req.body;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  // Idempotent: subscribing twice is fine.
  const existing = await Newsletter.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.json({ message: "You're already subscribed!" });
  }

  await Newsletter.create({ email });
  res.status(201).json({ message: "Thanks for subscribing!" });
};

module.exports = { subscribe };
