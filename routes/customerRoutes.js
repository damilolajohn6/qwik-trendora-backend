const express = require("express");
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  registerCustomer,
  loginCustomer,
  verifyEmail,
} = require("../controllers/customerController");
const { protect, authorize, validateCustomer } = require("../middleware/auth");
const logRequest = require("../middleware/logging");

// Apply logging middleware to all auth routes
router.use(logRequest);

// Public routes
router.post("/register", validateCustomer, registerCustomer);
router.post("/login", loginCustomer);
router.get("/verify/:token", verifyEmail); // New route for email verification

// Protected routes
router
  .route("/")
  .get(protect, authorize("admin", "manager", "staff"), getCustomers)
  .post(
    protect,
    authorize("admin", "manager", "staff"),
    validateCustomer,
    createCustomer
  );

router
  .route("/:id")
  .get(protect, authorize("admin", "manager", "customer"), getCustomer)
  .put(protect, authorize("admin", "manager", "customer"), updateCustomer)
  .delete(protect, authorize("admin"), deleteCustomer);

module.exports = router;
