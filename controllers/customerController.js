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
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer already exists" });
    }

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

    const customer = new Customer({
      fullname,
      email,
      password,
      phoneNumber,
      shippingAddress,
      avatar: avatarData,
      role: "customer",
      status: "pending",
    });

    await customer.save();

    const verificationToken = customer.generateVerificationToken();
    await customer.save();
    await sendVerificationEmail(customer, verificationToken);

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
      message: "Registration successful. Please verify your email.",
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Login customer
// @route   POST /api/customers/login
// @access  Public
exports.loginCustomer = async (req, res) => {
  const { email, password } = req.body;

  try {
    const customer = await Customer.findOne({ email }).select("+password");
    if (!customer) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await customer.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (customer.status !== "active") {
      return res
        .status(403)
        .json({ message: "Please verify your email first" });
    }

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
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Verify email
// @route   GET /api/customers/verify/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      verificationToken: req.params.token,
    });
    if (!customer || customer.verificationTokenExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const isVerified = await customer.verifyEmail(req.params.token);
    if (isVerified) {
      res
        .status(200)
        .json({ success: true, message: "Email verified successfully" });
    } else {
      res.status(400).json({ message: "Verification failed" });
    }
  } catch (error) {
    console.error("Verification error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all customers with pagination, search, filtering, and sorting
// @route   GET /api/customers
// @access  Private (Admin/Manager)
exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = req.query.sortBy || "dateJoined";
    const sortOrder = req.query.sortOrder || "desc";
    const skip = (page - 1) * limit;

    // Build query
    const query = {
      $or: [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ],
    };

    // Apply status filter
    if (status) {
      query.status = status;
    }

    // Apply date range filter
    if (startDate && endDate) {
      query.dateJoined = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.dateJoined = { $gte: startDate };
    } else if (endDate) {
      query.dateJoined = { $lte: endDate };
    }

    // Apply sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const customers = await Customer.find(query)
      .populate("orders", "invoiceNumber status")
      .skip(skip)
      .limit(limit)
      .sort(sortOptions);

    const total = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: customers.map((c) => ({
        _id: c._id,
        dateJoined: c.dateJoined,
        fullname: c.fullname,
        email: c.email,
        phoneNumber: c.phoneNumber,
        action: null, // Frontend handles actions
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Get customers error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private (Admin/Manager/Customer)
exports.getCustomer = async (req, res) => {
  try {
    // Validate id parameter
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customer = await Customer.findById(id).populate(
      "orders",
      "invoiceNumber status"
    );
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error("Get customer error:", error.message);
    if (error.name === "CastError" && error.path === "_id") {
      return res.status(400).json({ message: "Invalid customer ID" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create customer (admin/manager only)
// @route   POST /api/customers
// @access  Private (Admin/Manager)
exports.createCustomer = async (req, res) => {
  const { fullname, email, password, phoneNumber, shippingAddress, avatar } =
    req.body;

  try {
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer already exists" });
    }

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

    const customer = new Customer({
      fullname,
      email,
      password,
      phoneNumber,
      shippingAddress,
      avatar: avatarData,
      role: "customer",
      status: "pending",
    });

    await customer.save();

    const verificationToken = customer.generateVerificationToken();
    await customer.save();
    await sendVerificationEmail(customer, verificationToken);

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
      message: "Customer created. Please verify email.",
    });
  } catch (error) {
    console.error("Create customer error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private (Admin/Manager or Customer self-update)
exports.updateCustomer = async (req, res) => {
  const { fullname, email, phoneNumber, shippingAddress, avatar } = req.body;

  try {
    // Validate id parameter
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (
      req.user.role !== "admin" &&
      req.user.role !== "manager" &&
      req.user.id !== customer._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this customer" });
    }

    if (avatar) {
      if (!isValidCloudinaryUrl(avatar)) {
        return res
          .status(400)
          .json({ message: "Invalid Cloudinary URL for avatar" });
      }
      if (customer.avatar.public_id) {
        try {
          await cloudinary.uploader.destroy(customer.avatar.public_id);
        } catch (cloudError) {
          console.error("Failed to delete old avatar:", cloudError);
        }
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
    console.error("Update customer error:", error.message);
    if (error.name === "CastError" && error.path === "_id") {
      return res.status(400).json({ message: "Invalid customer ID" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin only)
exports.deleteCustomer = async (req, res) => {
  try {
    // Validate id parameter
    const { id } = req.params;
    if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can delete customers" });
    }

    if (customer.avatar.public_id) {
      try {
        await cloudinary.uploader.destroy(customer.avatar.public_id);
      } catch (cloudError) {
        console.error("Failed to delete avatar:", cloudError);
      }
    }

    await customer.remove();
    res.status(200).json({ success: true, message: "Customer deleted" });
  } catch (error) {
    console.error("Delete customer error:", error.message);
    if (error.name === "CastError" && error.path === "_id") {
      return res.status(400).json({ message: "Invalid customer ID" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
