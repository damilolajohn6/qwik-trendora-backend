const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Product = require("../models/Product");

// @desc    Get dashboard overview stats
// @route   GET /api/dashboard/stats
// @access  Private (Admin/Manager)
exports.getDashboardStats = async (req, res) => {
  try {
    if (!["admin", "manager", "staff"].includes(req.user.role)) {
      return res
        .status(403)
        .json({
          message: "Only admins and managers can access dashboard stats",
        });
    }

    const [totalCustomers, totalOrders, totalProducts, orders] =
      await Promise.all([
        Customer.countDocuments(),
        Order.countDocuments(),
        Product.countDocuments(),
        Order.find().select("totalAmount"),
      ]);

    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        totalOrders,
        totalProducts,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get sales trends (e.g., monthly sales)
// @route   GET /api/dashboard/sales-trends
// @access  Private (Admin/Manager)
exports.getSalesTrends = async (req, res) => {
  try {
    if (!["admin", "manager",  "staff"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only admins and managers can access sales trends" });
    }

    const salesTrends = await Order.aggregate([
      {
        $match: {
          paymentStatus: "completed",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$orderTime" },
            month: { $month: "$orderTime" },
          },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
      {
        $limit: 12, // Last 12 months
      },
    ]);

    res.status(200).json({
      success: true,
      data: salesTrends.map((trend) => ({
        year: trend._id.year,
        month: trend._id.month,
        totalSales: trend.totalSales,
        orderCount: trend.orderCount,
      })),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};
