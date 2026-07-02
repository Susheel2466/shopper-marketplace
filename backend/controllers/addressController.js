const User = require("../models/User");

const REQUIRED = [
  "fullName",
  "phone",
  "line1",
  "city",
  "state",
  "postalCode",
  "country",
];

const validateAddress = (body) =>
  REQUIRED.every((f) => body[f] && String(body[f]).trim());

// If the given address is default, clear isDefault on all others.
const applyDefault = (user, keepId) => {
  if (keepId) {
    user.addresses.forEach((a) => {
      a.isDefault = String(a._id) === String(keepId);
    });
  }
};

// GET /api/addresses
const getAddresses = async (req, res) => {
  const user = await User.findById(req.user._id).select("addresses");
  res.json(user.addresses);
};

// POST /api/addresses
const addAddress = async (req, res) => {
  if (!validateAddress(req.body)) {
    return res.status(400).json({ message: "Incomplete address" });
  }
  const user = await User.findById(req.user._id);
  // First address is default automatically.
  const makeDefault = req.body.isDefault || user.addresses.length === 0;
  user.addresses.push({ ...req.body, isDefault: makeDefault });
  if (makeDefault) {
    const newId = user.addresses[user.addresses.length - 1]._id;
    applyDefault(user, newId);
  }
  await user.save();
  res.status(201).json(user.addresses);
};

// PUT /api/addresses/:addrId
const updateAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addrId);
  if (!addr) return res.status(404).json({ message: "Address not found" });

  Object.assign(addr, req.body);
  if (req.body.isDefault) applyDefault(user, addr._id);
  await user.save();
  res.json(user.addresses);
};

// DELETE /api/addresses/:addrId
const deleteAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addrId);
  if (!addr) return res.status(404).json({ message: "Address not found" });
  const wasDefault = addr.isDefault;
  addr.deleteOne();
  // Promote another address to default if we removed the default one.
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }
  await user.save();
  res.json(user.addresses);
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress };
