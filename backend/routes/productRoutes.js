const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { protect, admin, seller } = require("../middleware/auth");
const {
  getProducts,
  getPopularProducts,
  getNewCollections,
  searchProducts,
  suggest,
  getAllProductsAdmin,
  getProductById,
  getRecommended,
  getBrands,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const {
  validate,
  productCreateRules,
  productUpdateRules,
} = require("../middleware/validators");
const { getReviews, addReview } = require("../controllers/reviewController");

const router = express.Router();

// Specific routes must come before the "/:id" param route.
router.get("/", asyncHandler(getProducts));
router.get("/search", asyncHandler(searchProducts));
router.get("/suggest", asyncHandler(suggest));
router.get("/brands", asyncHandler(getBrands));
router.get("/popular", asyncHandler(getPopularProducts));
router.get("/newcollections", asyncHandler(getNewCollections));
router.get("/admin", protect, admin, asyncHandler(getAllProductsAdmin));
router.get("/:id", asyncHandler(getProductById));

router.get("/:id/recommended", asyncHandler(getRecommended));

// Reviews
router.get("/:id/reviews", asyncHandler(getReviews));
router.post("/:id/reviews", protect, asyncHandler(addReview));

// Seller/Admin CRUD (approved sellers manage their own; admins manage all)
router.post("/", protect, seller, productCreateRules, validate, asyncHandler(createProduct));
router.put("/:id", protect, seller, productUpdateRules, validate, asyncHandler(updateProduct));
router.delete("/:id", protect, seller, asyncHandler(deleteProduct));

module.exports = router;
