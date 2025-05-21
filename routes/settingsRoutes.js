const express = require("express");
const router = express.Router();
const {
  getSettings,
  createSettings,
  updateSettings,
  deleteSettings,
} = require("../controllers/settingsController");
const { protect } = require("../middleware/auth");
const logRequest = require("../middleware/logging");

// Apply logging middleware to all auth routes
router.use(logRequest);

router.get("/", protect, getSettings);

router.post("/", protect, createSettings);

router.put("/", protect, updateSettings);

router.delete("/", protect, deleteSettings);

module.exports = router;
