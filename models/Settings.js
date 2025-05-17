const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  numberOfImagesPerProduct: {
    type: Number,
    default: 8,
  },
  allowAutoTranslation: {
    type: Boolean,
    default: false,
  },
  defaultLanguage: {
    type: String,
    default: "en",
    trim: true,
  },
  defaultDateFormat: {
    type: String,
    default: "dd/mm/yyyy",
    trim: true,
  },
  enableNewsletter: {
    type: Boolean,
    default: true,
  },
  storeName: {
    type: String,
    required: true,
    trim: true,
  },
  storeEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
  },
  storeContact: {
    type: String,
    required: true,
    trim: true,
  },
  storeAddress: {
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
  },
});

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
