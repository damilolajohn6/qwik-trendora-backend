const Product = require("../models/Product");
const cloudinary = require("cloudinary").v2;
const { isValidCloudinaryUrl } = require("../utils/cloudinaryUtils"); // Custom utility (see below)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc    Get all products with pagination, search, and filtering
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const category = req.query.category || "";
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
    const sortBy = req.query.sortBy || "createdAt"; // e.g., "price", "-price", "ratings.average"
    const published = req.query.published === "true" ? true : undefined;

    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ],
      category: category
        ? { $regex: category, $options: "i" }
        : { $exists: true },
      discountedPrice: { $gte: minPrice, $lte: maxPrice },
    };

    if (published !== undefined) {
      query.published = published;
    }

    const products = await Product.find(query)
      .populate("reviews.customer", "fullname")
      .skip(skip)
      .limit(limit)
      .sort(sortBy);

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
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

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "reviews.customer",
      "fullname"
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    discount,
    category,
    stock,
    sku,
    tags,
    variants,
    status,
    published,
    images, // Array of Cloudinary URLs
  } = req.body;

  try {
    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ message: "SKU already exists" });
    }

    // Validate images if provided
    let validatedImages = [];
    if (images && Array.isArray(images)) {
      validatedImages = images.map((url) => {
        if (!isValidCloudinaryUrl(url)) {
          throw new Error(`Invalid Cloudinary URL: ${url}`);
        }
        return { public_id: url.split("/").pop().split(".")[0], url }; // Extract public_id from URL
      });
    }

    // Handle tags (accept array or string)
    let parsedTags = tags || [];
    if (typeof tags === "string") {
      parsedTags = tags.split(",").map((tag) => tag.trim()).filter(tag => tag.length > 0);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map((tag) => tag.trim()).filter(tag => tag.length > 0);
    }

    // Parse variants if provided as a string
    let parsedVariants = variants;
    if (typeof variants === "string") {
      parsedVariants = JSON.parse(variants);
    }

    // Create new product
    const product = new Product({
      name,
      description,
      price,
      discount,
      category,
      stock,
      sku,
      images: validatedImages,
      tags: parsedTags,
      variants: parsedVariants || [],
      status,
      published: published === "true" || published === true,
      publishedDate:
        published === "true" || published === true ? Date.now() : null,
    });

    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    discount,
    category,
    stock,
    sku,
    tags,
    variants,
    status,
    published,
    images, // Array of Cloudinary URLs
  } = req.body;

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check SKU uniqueness if updated
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        return res.status(400).json({ message: "SKU already exists" });
      }
    }

    // Update images if provided
    if (images && Array.isArray(images)) {
      // Delete old images from Cloudinary
      if (product.images.length > 0) {
        await Promise.all(
          product.images.map((image) =>
            cloudinary.uploader.destroy(image.public_id)
          )
        );
      }

      // Validate and set new images
      const validatedImages = images.map((url) => {
        if (!isValidCloudinaryUrl(url)) {
          throw new Error(`Invalid Cloudinary URL: ${url}`);
        }
        return { public_id: url.split("/").pop().split(".")[0], url };
      });
      product.images = validatedImages;
    }

    // Handle tags (accept array or string)
    let parsedTags = tags;
    if (typeof tags === "string") {
      parsedTags = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    } else if (Array.isArray(tags)) {
      parsedTags = tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    } else {
      parsedTags = product.tags; // Fallback to existing tags if invalid
    }

    // Parse variants if provided as a string
    let parsedVariants = variants;
    if (typeof variants === "string") {
      parsedVariants = JSON.parse(variants);
    }

    // Update product fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.discount = discount !== undefined ? discount : product.discount;
    product.category = category || product.category;
    product.stock = stock !== undefined ? stock : product.stock;
    product.sku = sku || product.sku;
    product.tags = parsedTags;
    product.variants = parsedVariants || product.variants;
    product.status = status || product.status;
    product.published =
      published !== undefined
        ? published === "true" || published === true
        : product.published;
    product.publishedDate = product.published
      ? product.publishedDate || Date.now()
      : null;

    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete images from Cloudinary
    if (product.images.length > 0) {
      await Promise.all(
        product.images.map((image) =>
          cloudinary.uploader.destroy(image.public_id)
        )
      );
    }

    await product.remove();
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Add a review to a product
// @route   POST /api/products/:id/reviews
// @access  Private (Customer)
exports.addReview = async (req, res) => {
  const { rating, comment } = req.body;

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user has already reviewed the product
    const existingReview = product.reviews.find(
      (review) => review.customer.toString() === req.user._id.toString()
    );
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    // Add review
    const review = {
      customer: req.user._id,
      rating: parseInt(rating),
      comment,
      createdAt: Date.now(),
    };
    product.reviews.push(review);

    // Update product rating
    await product.updateRating();

    res
      .status(201)
      .json({ success: true, message: "Review added", data: product });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};
