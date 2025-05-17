const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  phoneNumber: {
    type: String,
    trim: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ["customer"],
    default: "customer",
  },
  dateJoined: {
    type: Date,
    default: Date.now,
  },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  shippingAddress: {
    street: { type: String, required: [true, "Street is required"] },
    city: { type: String, required: [true, "City is required"] },
    state: { type: String, required: [true, "State is required"] },
    zipCode: { type: String, required: [true, "Zip code is required"] },
    country: { type: String, required: [true, "Country is required"] },
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "active", // Changed to active so customers can buy immediately
  },
  avatar: {
    public_id: { type: String, default: null },
    url: { type: String, default: null },
  },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpiry: { type: Date },
});

// Hash password before saving
customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate verification token
customerSchema.methods.generateVerificationToken = function () {
  const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
  this.verificationToken = token;
  this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Method to compare passwords
customerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
