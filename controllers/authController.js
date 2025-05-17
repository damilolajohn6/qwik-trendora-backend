const User = require("../models/User");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utils/email");
const { isValidCloudinaryUrl } = require("../utils/cloudinaryUtils");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.registerUser = async (req, res) => {
  const { username, email, password, role, fullname, phoneNumber, avatar } =
    req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Validate avatar URL if provided
    let avatarData = {};
    if (avatar) {
      if (!isValidCloudinaryUrl(avatar)) {
        return res
          .status(400)
          .json({ message: "Invalid Cloudinary URL for avatar" });
      }
      avatarData = {
        public_id: avatar.split("/").pop().split(".")[0],
        url: avatar,
      };
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
      role: role || "staff",
      fullname,
      phoneNumber,
      avatar: avatarData,
    });

    await user.save();

    // Generate verification token and send email
    const verificationToken = user.generateVerificationToken();
    await user.save();
    await sendVerificationEmail(user, verificationToken);

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "30d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar.url,
      },
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your email first" });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
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
        avatar: user.avatar.url,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

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
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = user.generateResetPasswordToken();
    await user.save();

    await sendPasswordResetEmail(user, resetToken);

    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateUserProfile = async (req, res) => {
  const { fullname, phoneNumber, avatar } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate avatar URL if provided
    let avatarData = {};
    if (avatar) {
      if (!isValidCloudinaryUrl(avatar)) {
        return res
          .status(400)
          .json({ message: "Invalid Cloudinary URL for avatar" });
      }
      avatarData = {
        public_id: avatar.split("/").pop().split(".")[0],
        url: avatar,
      };
    }

    user.fullname = fullname || user.fullname;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.avatar = avatarData || user.avatar;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar.url,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar.url,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};
