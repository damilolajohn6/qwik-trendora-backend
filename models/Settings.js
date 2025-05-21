const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  // Store Information
  storeName: {
    type: String,
    required: [true, "Store name is required"],
    trim: true,
    minlength: [3, "Store name must be at least 3 characters"],
    maxlength: [50, "Store name cannot exceed 50 characters"],
  },
  storeEmail: {
    type: String,
    required: [true, "Store email is required"],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email address",
    ],
  },
  storeContact: {
    type: String,
    required: [true, "Store contact number is required"],
    trim: true,
    match: [/^\+?\d{10,15}$/, "Please provide a valid phone number"],
  },
  storeAddress: {
    street: {
      type: String,
      required: [true, "Street is required"],
      trim: true,
    },
    city: { type: String, required: [true, "City is required"], trim: true },
    state: { type: String, required: [true, "State is required"], trim: true },
    zipCode: {
      type: String,
      required: [true, "Zip code is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
  },

  // Display Settings
  numberOfImagesPerProduct: {
    type: Number,
    default: 8,
    min: [1, "At least 1 image per product is required"],
    max: [20, "Cannot exceed 20 images per product"],
  },
  defaultLanguage: {
    type: String,
    default: "en",
    trim: true,
    enum: ["en", "fr", "es", "de", "zh"], // Supported languages
  },
  defaultDateFormat: {
    type: String,
    default: "dd/mm/yyyy",
    trim: true,
    enum: ["dd/mm/yyyy", "mm/dd/yyyy", "yyyy-mm-dd"],
  },
  defaultTimezone: {
    type: String,
    default: "UTC",
    trim: true,
  },

  // Currency and Pricing
  defaultCurrency: {
    type: String,
    default: "NGN",
    trim: true,
    enum: ["NGN", "USD", "EUR", "GBP", "JPY"], // Supported currencies
  },
  taxSettings: {
    enabled: { type: Boolean, default: false },
    rate: { type: Number, default: 0, min: 0, max: 100 }, // Tax rate in percentage
  },

  // Payment Gateway Settings
  paymentGateway: {
    stripe: {
      enabled: { type: Boolean, default: false },
      publishableKey: { type: String, trim: true, default: "" },
      secretKey: { type: String, trim: true, default: "" },
    },
  },

  // Shipping Settings
  shippingSettings: {
    flatRate: { type: Number, default: 0, min: 0 }, // Flat shipping rate
    freeShippingThreshold: { type: Number, default: 0, min: 0 }, // Free shipping above this amount
    enabledRegions: [{ type: String, trim: true }], // e.g., ["NG", "US", "UK"]
  },

  // Email and Newsletter
  enableNewsletter: {
    type: Boolean,
    default: true,
  },
  allowAutoTranslation: {
    type: Boolean,
    default: false,
  },

  // Social Media Links
  socialMediaLinks: {
    facebook: { type: String, trim: true, default: "" },
    twitter: { type: String, trim: true, default: "" },
    instagram: { type: String, trim: true, default: "" },
    linkedin: { type: String, trim: true, default: "" },
  },

  // Security Settings
  securitySettings: {
    enableTwoFactorAuth: { type: Boolean, default: false }, // For admins
    sessionTimeout: { type: Number, default: 30, min: 1 }, // Session timeout in minutes
  },

  // Maintenance Mode
  maintenanceMode: {
    enabled: { type: Boolean, default: false },
    message: {
      type: String,
      trim: true,
      default: "We are currently under maintenance. Please check back later.",
    },
  },

  // SEO Settings
  seoSettings: {
    metaTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: [60, "Meta title cannot exceed 60 characters"],
    },
    metaDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` timestamp on save
settingsSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
