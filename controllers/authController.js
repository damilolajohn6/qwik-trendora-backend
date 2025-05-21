const User = require("../models/User");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utils/email");
const { isValidCloudinaryUrl } = require("../utils/cloudinaryUtils");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to extract public_id from Cloudinary URL
function extractPublicIdFromUrl(url) {
  if (!url || !url.includes("/upload/")) {
    return null;
  }
  try {
    const urlParts = url.split("/upload/");
    if (urlParts.length < 2) return null;

    let pathAndFile = urlParts[1];

    const versionMatch = pathAndFile.match(/^v\d+\//);
    if (versionMatch) {
      pathAndFile = pathAndFile.substring(versionMatch[0].length);
    }

    // Remove file extension
    const lastDotIndex = pathAndFile.lastIndexOf(".");
    if (lastDotIndex > 0) {
      return pathAndFile.substring(0, lastDotIndex);
    }
    return pathAndFile; // No extension or malformed
  } catch (e) {
    console.error("Error extracting public_id from URL:", url, e);
    return null;
  }
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  const { username, email, password, role, fullname, phoneNumber, avatar } =
    req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }
    let userNameExists = await User.findOne({ username });
    if (userNameExists) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    let avatarData = { public_id: null, url: null };
    if (avatar && typeof avatar === "string") {
      if (
        process.env.CLOUDINARY_CLOUD_NAME &&
        !avatar.includes(process.env.CLOUDINARY_CLOUD_NAME)
      ) {
        console.warn(
          `Warning: Avatar URL (${avatar}) being registered does not appear to use the configured cloud name (${process.env.CLOUDINARY_CLOUD_NAME}). Please check frontend Cloudinary configuration.`
        );
      }

      if (isValidCloudinaryUrl(avatar)) {
        const public_id = extractPublicIdFromUrl(avatar);
        avatarData = { public_id: public_id, url: avatar };
      } else {
        console.warn(
          `Avatar URL (${avatar}) provided is not considered a valid Cloudinary URL by isValidCloudinaryUrl. Storing URL only.`
        );
        avatarData = { public_id: null, url: avatar };
      }
    }

    user = new User({
      username,
      email,
      password,
      role: role || "staff",
      fullname,
      phoneNumber,
      avatar: avatarData.url ? avatarData : { public_id: null, url: null },
    });

    await user.save();

    const verificationToken = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });
    await sendVerificationEmail(user, verificationToken);

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar ? user.avatar.url : null,
      },
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration Error:", error.message, error.stack);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation Error", errors: error.errors });
    }
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid credentials (email not found)" });
    }

    if (!["admin", "staff", "manager"].includes(user.role)) {
      return res.status(403).json({
        message: `Access denied. Role '${user.role}' is not permitted to login here.`,
      });
    }

    if (!user.emailVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email before logging in." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid credentials (password mismatch)" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar ? user.avatar.url : null,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message, error.stack);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  const { fullname, phoneNumber, avatar } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.fullname = fullname || user.fullname;
    user.phoneNumber = phoneNumber || user.phoneNumber;

    if (typeof avatar === "string") {
      if (avatar === "") {
        if (user.avatar && user.avatar.public_id) {
          try {
            console.log(
              `Attempting to delete old avatar: ${user.avatar.public_id}`
            );
            await cloudinary.uploader.destroy(user.avatar.public_id);
          } catch (cloudinaryError) {
            console.error(
              "Failed to delete old avatar from Cloudinary:",
              cloudinaryError
            );
          }
        }
        user.avatar = { public_id: null, url: null };
      } else {
        if (
          process.env.CLOUDINARY_CLOUD_NAME &&
          !avatar.includes(process.env.CLOUDINARY_CLOUD_NAME)
        ) {
          console.warn(
            `Warning: New avatar URL (${avatar}) for update does not appear to use the configured cloud name (${process.env.CLOUDINARY_CLOUD_NAME}). Check frontend Cloudinary configuration.`
          );
        }
        if (
          user.avatar &&
          user.avatar.public_id &&
          (!user.avatar.url || user.avatar.url !== avatar)
        ) {
          try {
            console.log(
              `Attempting to delete old avatar before update: ${user.avatar.public_id}`
            );
            await cloudinary.uploader.destroy(user.avatar.public_id);
          } catch (cloudinaryError) {
            console.error(
              "Failed to delete old avatar from Cloudinary during update:",
              cloudinaryError
            );
          }
        }

        if (isValidCloudinaryUrl(avatar)) {
          const public_id = extractPublicIdFromUrl(avatar);
          user.avatar = { public_id: public_id, url: avatar };
        } else {
          console.warn(
            `New avatar URL (${avatar}) for update is not a valid Cloudinary URL. Storing URL only.`
          );
          user.avatar = { public_id: null, url: avatar };
        }
      }
    }

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        fullname: updatedUser.fullname,
        phoneNumber: updatedUser.phoneNumber,
        avatar: updatedUser.avatar ? updatedUser.avatar.url : null,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message, error.stack);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation Error", errors: error.errors });
    }
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    user.status = "active";
    await user.save({ validateBeforeSave: false });
    res
      .status(200)
      .json({ message: "Email verified successfully. You can now login." });
  } catch (error) {
    console.error("Verify Email Error:", error.message, error.stack);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        message:
          "If a user with this email exists, a password reset link has been sent.",
      });
    }
    if (!["admin", "staff", "manager"].includes(user.role)) {
      return res.status(403).json({
        message:
          "Password reset is not available for this user type through this portal.",
      });
    }
    const resetToken = user.generateResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    await sendPasswordResetEmail(user, resetToken);
    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("Forgot Password Error:", error.message, error.stack);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset token." });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.emailVerified = true;
    user.status = "active";
    await user.save();
    res.status(200).json({
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error.message, error.stack);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar ? user.avatar.url : null,
      },
    });
  } catch (error) {
    console.error("Get User Profile Error:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get all users with pagination, search, sorting, and filtering
// @route   GET /api/auth/users
// @access  Private (Admin/Manager/Staff)
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const role = req.query.role || "";
    const status = req.query.status || "";
    const sortBy = req.query.sortBy || "dateJoined";
    const sortOrder = req.query.sortOrder || "desc";
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      role: { $in: ["admin", "manager", "staff"] }, // Only fetch admin, manager, staff
      $or: [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { fullname: { $regex: search, $options: "i" } },
      ],
    };

    // Apply role filter
    if (role) {
      query.role = role;
    }

    // Apply status filter
    if (status) {
      query.status = status;
    }

    // Apply sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const users = await User.find(query)
      .skip(skip)
      .limit(limit)
      .sort(sortOptions);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users.map((u) => ({
        _id: u._id,
        username: u.username,
        fullname: u.fullname,
        email: u.email,
        phoneNumber: u.phoneNumber,
        role: u.role,
        status: u.status,
        dateJoined: u.dateJoined,
        avatar: u.avatar ? u.avatar.url : null,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Get users error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete users" });
    }

    if (user.avatar && user.avatar.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (cloudError) {
        console.error("Failed to delete avatar:", cloudError);
      }
    }

    await user.remove();
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error.message);
    if (error.name === "CastError" && error.path === "_id") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/auth/users/:id
// @access  Private (Admin/Manager/Staff)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        dateJoined: user.dateJoined,
        avatar: user.avatar ? user.avatar.url : null,
      },
    });
  } catch (error) {
    console.error("Get user by ID error:", error.message);
    if (error.name === "CastError" && error.path === "_id") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user by ID
// @route   PUT /api/auth/users/:id
// @access  Private (Admin only)
exports.updateUserById = async (req, res) => {
  const { id } = req.params;
  const { fullname, email, phoneNumber, role, avatar } = req.body;

  try {
    if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update users" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for email uniqueness if email is being updated
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Email already in use by another user" });
      }
    }

    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.role = role || user.role;

    if (typeof avatar === "string") {
      if (avatar === "") {
        if (user.avatar && user.avatar.public_id) {
          try {
            console.log(
              `Attempting to delete old avatar: ${user.avatar.public_id}`
            );
            await cloudinary.uploader.destroy(user.avatar.public_id);
          } catch (cloudinaryError) {
            console.error(
              "Failed to delete old avatar from Cloudinary:",
              cloudinaryError
            );
          }
        }
        user.avatar = { public_id: null, url: null };
      } else {
        if (
          process.env.CLOUDINARY_CLOUD_NAME &&
          !avatar.includes(process.env.CLOUDINARY_CLOUD_NAME)
        ) {
          console.warn(
            `Warning: New avatar URL (${avatar}) for update does not appear to use the configured cloud name (${process.env.CLOUDINARY_CLOUD_NAME}). Check frontend Cloudinary configuration.`
          );
        }
        if (
          user.avatar &&
          user.avatar.public_id &&
          (!user.avatar.url || user.avatar.url !== avatar)
        ) {
          try {
            console.log(
              `Attempting to delete old avatar before update: ${user.avatar.public_id}`
            );
            await cloudinary.uploader.destroy(user.avatar.public_id);
          } catch (cloudinaryError) {
            console.error(
              "Failed to delete old avatar from Cloudinary during update:",
              cloudinaryError
            );
          }
        }

        if (isValidCloudinaryUrl(avatar)) {
          const public_id = extractPublicIdFromUrl(avatar);
          user.avatar = { public_id: public_id, url: avatar };
        } else {
          console.warn(
            `New avatar URL (${avatar}) for update is not a valid Cloudinary URL. Storing URL only.`
          );
          user.avatar = { public_id: null, url: avatar };
        }
      }
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        fullname: updatedUser.fullname,
        phoneNumber: updatedUser.phoneNumber,
        avatar: updatedUser.avatar ? updatedUser.avatar.url : null,
      },
    });
  } catch (error) {
    console.error("Update user by ID error:", error.message);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation Error", errors: error.errors });
    }
    if (error.name === "CastError" && error.path === "_id") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logoutUser = async (req, res) => {
  try {
    // Invalidate the token by removing it from the client-side
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error.message, error.stack);
    res.status(500).json({ message: "Server Error" });
  }
};
