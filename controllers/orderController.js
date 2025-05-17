const Order = require("../models/Order");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const {
  sendOrderConfirmationEmail,
  sendOrderUpdateEmail,
} = require("../utils/email");

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private (Customer)
exports.createOrder = async (req, res) => {
  const { items, paymentMethod, shippingAddress } = req.body;

  try {
    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // Calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.price * item.quantity;
    }

    const order = new Order({
      invoiceNumber,
      customer: req.user._id,
      items,
      totalAmount,
      paymentMethod,
      shippingAddress,
    });

    await order.save();

    // Send order confirmation email
    const customer = await Customer.findById(req.user._id);
    try {
      await sendOrderConfirmationEmail(order, customer);
    } catch (emailError) {
      console.error(
        "Failed to send order confirmation email:",
        emailError.message
      );
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get all orders with pagination and filters
// @route   GET /api/orders
// @access  Private (Admin) or (Customer for self-orders)
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || "";
    const search = req.query.search || "";

    const query = {
      $or: [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { "items.name": { $regex: search, $options: "i" } },
      ],
    };

    if (req.user.role === "customer") {
      query.customer = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate("customer", "fullname email")
      .populate("items.product", "name price")
      .skip(skip)
      .limit(limit)
      .sort({ orderTime: -1 });

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: orders,
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

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private (Admin or Customer)
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "fullname email")
      .populate("items.product", "name price");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (
      req.user.role === "customer" &&
      order.customer.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update order status or payment
// @route   PUT /api/orders/:id
// @access  Private (Admin or Customer for payment)
exports.updateOrder = async (req, res) => {
  const { status, paymentStatus, trackingNumber, refund } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    if (
      req.user.role === "customer" &&
      order.customer.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }
    if (req.user.role !== "admin" && status && status !== "cancelled") {
      return res
        .status(403)
        .json({ message: "Only admins can update order status" });
    }

    // Update fields
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (refund) {
      order.refund.amount = refund.amount || order.refund.amount;
      order.refund.status = refund.status || order.refund.status;
      order.refund.reason = refund.reason || order.refund.reason;
    }

    await order.save();

    // Send order update email
    const customer = await Customer.findById(order.customer);
    try {
      await sendOrderUpdateEmail(order, customer);
    } catch (emailError) {
      console.error("Failed to send order update email:", emailError.message);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Delete an order (cancel and refund)
// @route   DELETE /api/orders/:id
// @access  Private (Customer or Admin)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (
      req.user.role === "customer" &&
      order.customer.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this order" });
    }

    order.status = "cancelled";
    order.paymentStatus = "failed";
    order.refund = {
      amount: order.totalAmount,
      status: "pending",
      reason: "Order cancelled by customer",
    };
    await order.save();

    // Send order update email
    const customer = await Customer.findById(order.customer);
    try {
      await sendOrderUpdateEmail(order, customer);
    } catch (emailError) {
      console.error("Failed to send order update email:", emailError.message);
    }

    res
      .status(200)
      .json({ success: true, message: "Order cancelled and refund initiated" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Manage stock for a product
// @route   PUT /api/orders/stock/:productId
// @access  Private (Admin)
exports.manageStock = async (req, res) => {
  const { quantity } = req.body;

  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can manage stock" });
    }

    product.stock += parseInt(quantity);
    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Process payment for an order
// @route   POST /api/orders/:id/process-payment
// @access  Private (Customer or Admin)
exports.processPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (
      req.user.role === "customer" &&
      order.customer.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to process this payment" });
    }

    order.paymentStatus = "completed";
    order.status = order.status === "pending" ? "processing" : order.status;
    await order.save();

    // Send order update email
    const customer = await Customer.findById(order.customer);
    try {
      await sendOrderUpdateEmail(order, customer);
    } catch (emailError) {
      console.error("Failed to send order update email:", emailError.message);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};
