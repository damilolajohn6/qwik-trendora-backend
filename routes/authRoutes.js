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
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get(
  "/profile",
  protect,
  authorize("customer", "admin", "manager"),
  getUserProfile
);
router.put(
  "/profile",
  protect,
  authorize("customer", "admin", "manager"),
  updateUserProfile
);

// Protected routes (example - restrict to admin)
router.get("/protected", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Protected route accessed", user: req.user });
});

module.exports = router;
