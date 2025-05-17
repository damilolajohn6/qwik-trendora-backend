const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/auth");

// Public routes
router.get("/", getProducts);
router.get("/:id", getProduct);

// Protected routes (Admin/Manager)
router.route("/").post(protect, authorize("admin", "manager"), createProduct);

router
  .route("/:id")
  .put(protect, authorize("admin", "manager"), updateProduct)
  .delete(protect, authorize("admin"), deleteProduct);

// Customer routes
router.post("/:id/reviews", protect, authorize("customer"), addReview);

module.exports = router;
