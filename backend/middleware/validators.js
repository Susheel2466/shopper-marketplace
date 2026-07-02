const { body, validationResult } = require("express-validator");

// Runs after a set of validation rules; returns the first error as a 400.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

const signupRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 60 }),
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

const loginRules = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const newsletterRules = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
];

const productCreateRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("category").isIn(["women", "men", "kid"]).withMessage("Invalid category"),
  body("new_price").isFloat({ min: 0 }).withMessage("new_price must be >= 0"),
  body("old_price").isFloat({ min: 0 }).withMessage("old_price must be >= 0"),
  body("stock").optional().isInt({ min: 0 }).withMessage("stock must be >= 0"),
];

const productUpdateRules = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("category").optional().isIn(["women", "men", "kid"]).withMessage("Invalid category"),
  body("new_price").optional().isFloat({ min: 0 }).withMessage("new_price must be >= 0"),
  body("old_price").optional().isFloat({ min: 0 }).withMessage("old_price must be >= 0"),
  body("stock").optional().isInt({ min: 0 }).withMessage("stock must be >= 0"),
];

module.exports = {
  validate,
  signupRules,
  loginRules,
  newsletterRules,
  productCreateRules,
  productUpdateRules,
};
