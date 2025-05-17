const Customer = require("../models/Customer");
const cloudinary = require("cloudinary").v2;
const { sendVerificationEmail } = require("../utils/email");
const jwt = require("jsonwebtoken");
const { isValidCloudinaryUrl } = require("../utils/cloudinaryUtils");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc    Register a new customer (public)
// @route   POST /api/customers/register
// @access  Public
exports.registerCustomer = async (req, res) => {
  const { fullname, email, password, phoneNumber, shippingAddress, avatar } =
    req.body;

  try {
    // Check if customer exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer already exists" });
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

    // Create new customer
    const customer = new Customer({
      fullname,
      email,
      password,
      phoneNumber,
      shippingAddress,
      avatar: avatarData,
      role: "customer",
      status: "active",
    });

    await customer.save();

    // Generate and send verification email (optional)
    const verificationToken = customer.generateVerificationToken();
    await customer.save();
    await sendVerificationEmail(customer, verificationToken);

    // Generate JWT for customer
    const token = jwt.sign(
      { id: customer._id, role: customer.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.status(201).json({
      success: true,
      token,
      data: {
        id: customer._id,
        fullname: customer.fullname,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        avatar: customer.avatar.url,
        role: customer.role,
      },
      message:
        "Registration successful. Please check your email to verify your account (optional).",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Login customer
// @route   POST /api/customers/login
// @access  Public
exports.loginCustomer = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if customer exists
    const customer = await Customer.findOne({ email }).select("+password");
    if (!customer) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if password matches
    const isMatch = await customer.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: customer._id, role: customer.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.json({
      success: true,
      token,
      data: {
        id: customer._id,
        fullname: customer.fullname,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        avatar: customer.avatar.url,
        role: customer.role,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get all customers with pagination and search
// @route   GET /api/customers
// @access  Private (Admin/Manager)
exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const customers = await Customer.find({
      $or: [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ],
    })
      .populate("orders", "invoice status")
      .skip(skip)
      .limit(limit)
      .sort({ dateJoined: -1 });

    const total = await Customer.countDocuments({
      $or: [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ],
    });

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private (Admin/Manager/Customer)
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate(
      "orders",
      "invoice status"
    );
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Create customer (admin/manager only)
// @route   POST /api/customers
// @access  Private (Admin/Manager)
exports.createCustomer = async (req, res) => {
  const { fullname, email, password, phoneNumber, shippingAddress, avatar } =
    req.body;

  try {
    // Check if customer exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer already exists" });
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

    // Create new customer
    const customer = new Customer({
      fullname,
      email,
      password,
      phoneNumber,
      shippingAddress,
      avatar: avatarData,
      role: "customer",
      status: "active",
    });

    await customer.save();

    // Generate and send verification email (optional)
    const verificationToken = customer.generateVerificationToken();
    await customer.save();
    await sendVerificationEmail(customer, verificationToken);

    // Generate JWT for customer
    const token = jwt.sign(
      { id: customer._id, role: customer.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      token,
      data: {
        id: customer._id,
        fullname: customer.fullname,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        avatar: customer.avatar.url,
        role: customer.role,
      },
      message:
        "Customer created. Please check email to verify account (optional).",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private (Admin/Manager or Customer self-update)
exports.updateCustomer = async (req, res) => {
  const { fullname, email, phoneNumber, shippingAddress, avatar } = req.body;

  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check if user has permission (admin, manager, or self-update)
    if (
      req.user.role !== "admin" &&
      req.user.role !== "manager" &&
      req.user.id !== customer._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this customer" });
    }

    // Update avatar if provided
    if (avatar) {
      if (!isValidCloudinaryUrl(avatar)) {
        return res
          .status(400)
          .json({ message: "Invalid Cloudinary URL for avatar" });
      }
      if (customer.avatar.public_id) {
        await cloudinary.uploader.destroy(customer.avatar.public_id);
      }
      customer.avatar = {
        public_id: avatar.split("/").pop().split(".")[0],
        url: avatar,
      };
    }

    customer.fullname = fullname || customer.fullname;
    customer.email = email || customer.email;
    customer.phoneNumber = phoneNumber || customer.phoneNumber;
    customer.shippingAddress = shippingAddress || customer.shippingAddress;

    await customer.save();
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin only)
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check admin role
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can delete customers" });
    }

    // Delete avatar from Cloudinary if exists
    if (customer.avatar.public_id) {
      await cloudinary.uploader.destroy(customer.avatar.public_id);
    }

    await customer.remove();
    res.status(200).json({ success: true, message: "Customer deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

