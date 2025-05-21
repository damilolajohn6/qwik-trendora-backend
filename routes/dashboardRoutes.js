const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getSalesTrends,
} = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/auth");
const logRequest = require("../middleware/logging");

// Apply logging middleware to all auth routes
router.use(logRequest);

router.get("/stats", protect, authorize("admin", "manager", "staff"), getDashboardStats);
router.get(
  "/sales-trends",
  protect,
  authorize("admin", "manager", "staff"),
  getSalesTrends
);

module.exports = router;
