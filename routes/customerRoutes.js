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
} = require("../controllers/customerController");
const { protect, authorize, validateCustomer } = require("../middleware/auth");

// Public routes
router.post("/register", validateCustomer, registerCustomer);
router.post("/login", loginCustomer);

// Protected routes
router
  .route("/")
  .get(protect, authorize("admin", "manager"), getCustomers)
  .post(
    protect,
    authorize("admin", "manager"),
    validateCustomer,
    createCustomer
  );

router
  .route("/:id")
  .get(protect, authorize("admin", "manager", "customer"), getCustomer)
  .put(protect, authorize("admin", "manager", "customer"), updateCustomer)
  .delete(protect, authorize("admin"), deleteCustomer);

module.exports = router;
