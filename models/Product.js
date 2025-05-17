const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
    maxlength: [100, "Product name cannot exceed 100 characters"],
  },
  description: {
    type: String,
    required: [true, "Product description is required"],
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
  },
  price: {
    type: Number,
    required: [true, "Product price is required"],
    min: [0, "Price cannot be negative"],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, "Discount cannot be negative"],
    max: [100, "Discount cannot exceed 100%"],
  },
  discountedPrice: {
    type: Number,
    default: function () {
      return this.price - (this.price * this.discount) / 100;
    },
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    trim: true,
    enum: {
      values: ["electronics", "clothing", "home", "beauty", "sports", "other"],
      message: "Invalid category",
    },
  },
  stock: {
    type: Number,
    required: [true, "Stock quantity is required"],
    min: [0, "Stock cannot be negative"],
    default: 0,
  },
  sku: {
    type: String,
    required: [true, "SKU is required"],
    unique: true,
    trim: true,
  },
  images: [
    {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
  ],
  tags: [
    {
      type: String,
      trim: true,
      maxlength: [50, "Tag cannot exceed 50 characters"],
    },
  ],
  variants: [
    {
      type: { type: String, required: true }, // e.g., "color", "size"
      value: { type: String, required: true }, // e.g., "red", "medium"
      additionalPrice: { type: Number, default: 0, min: 0 },
    },
  ],
  status: {
    type: String,
    enum: ["pending", "delivered"],
    default: "pending",
  },
  published: {
    type: Boolean,
    default: false,
  },
  publishedDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  reviews: [
    {
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true,
      },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: {
        type: String,
        trim: true,
        maxlength: [500, "Review comment cannot exceed 500 characters"],
      },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

// Update discountedPrice and updatedAt before saving
productSchema.pre("save", function (next) {
  this.discountedPrice = this.price - (this.price * this.discount) / 100;
  this.updatedAt = Date.now();
  next();
});

// Update average rating when reviews are added/updated
productSchema.methods.updateRating = async function () {
  const reviews = this.reviews;
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = totalRating / reviews.length;
    this.ratings.count = reviews.length;
  } else {
    this.ratings.average = 0;
    this.ratings.count = 0;
  }
  await this.save();
};

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
