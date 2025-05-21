const mongoose = require("mongoose");
const Settings = require("../models/Settings");

exports.getSettings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can access settings" });
    }

    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    // Disable caching for testing
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createSettings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can create settings" });
    }

    const existingSettings = await Settings.findOne();
    if (existingSettings) {
      return res.status(400).json({
        message: "Settings already exist. Use the update endpoint to modify.",
      });
    }

    const settings = new Settings(req.body);
    await settings.save();

    res.status(201).json({ success: true, data: settings });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can update settings" });
    }

    const settings = await Settings.findOne();
    if (!settings) {
      return res
        .status(404)
        .json({ message: "Settings not found. Create settings first." });
    }

    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    });

    await settings.save();

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteSettings = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can delete settings" });
    }

    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    await settings.remove();

    res.status(200).json({ success: true, message: "Settings deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};
