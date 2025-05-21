const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Customer = require("../models/Customer");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if the token belongs to a User (admin/manager/staff)
      let user = await User.findById(decoded.id).select("-password");
      if (user) {
        req.user = user;
        req.userType = "User";
        return next();
      }

      // Check if the token belongs to a Customer
      let customer = await Customer.findById(decoded.id).select("-password");
      if (customer) {
        req.user = customer;
        req.userType = "Customer";
        return next();
      }

      return res.status(401).json({ message: "User or Customer not found" });
    } catch (error) {
      console.error("Token verification error:", error.message);
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Token expired, please log in again" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
      }
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token provided" });
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Middleware for customer input validation
exports.validateCustomer = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({ message: "Request body is empty" });
  }

  const { fullname, email, password, phoneNumber } = req.body;
  let shippingAddress = req.body.shippingAddress;

  if (!fullname || !email || !password || !phoneNumber) {
    return res.status(400).json({
      message:
        "Missing required fields: fullname, email, password, or phoneNumber",
    });
  }

  if (typeof shippingAddress === "string") {
    try {
      shippingAddress = JSON.parse(shippingAddress);
    } catch (error) {
      return res.status(400).json({
        message: "Invalid shippingAddress format: must be a valid JSON object",
      });
    }
  } else if (!shippingAddress) {
    shippingAddress = {
      street: req.body["shippingAddress[street]"],
      city: req.body["shippingAddress[city]"],
      state: req.body["shippingAddress[state]"],
      zipCode: req.body["shippingAddress[zipCode]"],
      country: req.body["shippingAddress[country]"],
    };
  }

  if (
    !shippingAddress ||
    !shippingAddress.street ||
    !shippingAddress.city ||
    !shippingAddress.state ||
    !shippingAddress.zipCode ||
    !shippingAddress.country
  ) {
    return res.status(400).json({
      message:
        "All shipping address fields are required: street, city, state, zipCode, country",
      provided: shippingAddress,
    });
  }

  req.body.shippingAddress = shippingAddress;
  next();
};
