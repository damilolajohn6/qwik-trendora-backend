const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  manageStock,
  processPayment,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");

// Customer routes
router.post("/", protect, authorize("customer"), createOrder);
router.get("/", protect, getOrders);
router.get("/:id", protect, getOrder);
router.put("/:id", protect, updateOrder);
router.delete("/:id", protect, authorize("customer", "admin"), deleteOrder);
router.post(
  "/:id/process-payment",
  protect,
  authorize("customer", "admin"),
  processPayment
);

// Admin routes
router.put("/stock/:productId", protect, authorize("admin"), manageStock);

module.exports = router;
