const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  getUsers,
  deleteUser,
  getUserById,
  updateUserById,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");
const logRequest = require("../middleware/logging");

// Apply logging middleware to all auth routes
router.use(logRequest);

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Protected routes
router.get(
  "/profile",
  protect,
  authorize("customer", "admin", "manager", "staff"),
  getUserProfile
);
router.put(
  "/profile",
  protect,
  authorize("customer", "admin", "manager", "staff"),
  updateUserProfile
);

// Fetch all users (admin, manager, staff only)
router.get("/users", protect, authorize("admin", "manager", "staff"), getUsers);

// Fetch a single user by ID (admin, manager, staff only)
router.get(
  "/users/:id",
  protect,
  authorize("admin", "manager", "staff"),
  getUserById
);

// Update a user by ID (admin only)
router.put("/users/:id", protect, authorize("admin"), updateUserById);

// Delete a user (admin only)
router.delete("/users/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
