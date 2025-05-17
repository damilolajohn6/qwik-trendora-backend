const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, "Invoice number is required"],
    unique: true,
    trim: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: [true, "Customer is required"],
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Product is required"],
      },
      name: { type: String, required: [true, "Product name is required"] },
      price: { type: Number, required: [true, "Price is required"], min: 0 },
      quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: 1,
      },
      variant: { type: String, default: null },
    },
  ],
  totalAmount: {
    type: Number,
    required: [true, "Total amount is required"],
    min: 0,
  },
  shippingAddress: {
    street: { type: String, required: [true, "Street is required"] },
    city: { type: String, required: [true, "City is required"] },
    state: { type: String, required: [true, "State is required"] },
    zipCode: { type: String, required: [true, "Zip code is required"] },
    country: { type: String, required: [true, "Country is required"] },
  },
  trackingNumber: { type: String, default: null },
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["Transfer", "Card"],
    required: [true, "Payment method is required"],
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  refund: {
    amount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "processed", "rejected"],
      default: null,
    },
    reason: {
      type: String,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },
  },
  orderTime: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update stock when order is created or updated
orderSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("items")) {
    for (const item of this.items) {
      const product = await mongoose.model("Product").findById(item.product);
      if (!product) throw new Error(`Product ${item.product} not found`);
      const totalStock = product.stock - item.quantity;
      if (totalStock < 0)
        throw new Error(`Insufficient stock for product ${item.name}`);
      product.stock = totalStock;
      await product.save();
    }
  }
  this.updatedAt = Date.now();
  next();
});

// Cascade delete items and update stock on order removal
orderSchema.pre("remove", async function (next) {
  for (const item of this.items) {
    const product = await mongoose.model("Product").findById(item.product);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
