const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email address",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false, // Exclude password from queries by default
  },
  role: {
    type: String,
    enum: ["admin", "staff", "manager", "customer"],
    default: "staff",
  },
  avatar: {
    public_id: {
      type: String,
      default: null,
    },
    url: {
      type: String,
      default: null,
    },
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "pending",
  },
  dateJoined: {
    type: Date,
    default: Date.now,
  },
  fullname: {
    type: String,
    trim: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
  },
  verificationTokenExpiry: {
    type: Date,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpiry: {
    type: Date,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate verification token
userSchema.methods.generateVerificationToken = function () {
  const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
  this.verificationToken = token;
  this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
  return token;
};

// Generate reset password token
userSchema.methods.generateResetPasswordToken = function () {
  const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
  this.resetPasswordToken = token;
  this.resetPasswordExpiry = Date.now() + 1 * 60 * 60 * 1000; // 1 hour expiry
  return token;
};

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
