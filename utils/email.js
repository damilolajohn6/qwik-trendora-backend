const nodemailer = require("nodemailer");

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // Use SSL/TLS for port 465
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Function to send verification email
const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

  const mailOptions = {
    from: `"Trendora Support" <${process.env.SMTP_MAIL}>`,
    to: user.email,
    subject: "Verify Your Email Address - Trendora",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to Trendora, ${
          user.fullname || user.username
        }!</h2>
        <p>Please verify your email address to activate your account.</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p style="margin-top: 20px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}" style="color: #007bff;">${verificationUrl}</a></p>
        <p style="color: #666;">This link will expire in 24 hours.</p>
        <p style="color: #666;">If you did not sign up for a Trendora account, please ignore this email.</p>
        <hr style="border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} Trendora. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Function to send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"Trendora Support" <${process.env.SMTP_MAIL}>`,
    to: user.email,
    subject: "Password Reset Request - Trendora",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>We received a request to reset the password for your Trendora account (${
          user.email
        }).</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p style="margin-top: 20px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}" style="color: #007bff;">${resetUrl}</a></p>
        <p style="color: #666;">This link will expire in 1 hour.</p>
        <p style="color: #666;">If you did not request a password reset, please ignore this email.</p>
        <hr style="border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} Trendora. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Function to send order confirmation email
const sendOrderConfirmationEmail = async (order, customer) => {
  const orderUrl = `${process.env.FRONTEND_URL}/orders/${order._id}`;

  const itemsList = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${
            item.name
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${
            item.quantity
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">₦${item.price.toFixed(
            2
          )}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">₦${(
            item.price * item.quantity
          ).toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: `"Trendora Support" <${process.env.SMTP_MAIL}>`,
    to: customer.email,
    subject: `Order Confirmation - ${order.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Thank You for Your Order, ${
          customer.fullname
        }!</h2>
        <p>We have received your order (Invoice: ${
          order.invoiceNumber
        }). Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: left;">Quantity</th>
              <th style="padding: 8px; text-align: left;">Price</th>
              <th style="padding: 8px; text-align: left;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>
        <p><strong>Total Amount:</strong> ₦${order.totalAmount.toFixed(2)}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Shipping Address:</strong> ${
          order.shippingAddress.street
        }, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${
      order.shippingAddress.zipCode
    }, ${order.shippingAddress.country}</p>
        <p><strong>Status:</strong> ${
          order.status.charAt(0).toUpperCase() + order.status.slice(1)
        }</p>
        <a href="${orderUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Order</a>
        <p style="margin-top: 20px;">We will notify you once your order status updates.</p>
        <hr style="border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} Trendora. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Function to send order update email
const sendOrderUpdateEmail = async (order, customer) => {
  const orderUrl = `${process.env.FRONTEND_URL}/orders/${order._id}`;

  const mailOptions = {
    from: `"Trendora Support" <${process.env.SMTP_MAIL}>`,
    to: customer.email,
    subject: `Order Update - ${order.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Order Update, ${customer.fullname}!</h2>
        <p>Your order (Invoice: ${order.invoiceNumber}) has been updated:</p>
        <p><strong>Status:</strong> ${
          order.status.charAt(0).toUpperCase() + order.status.slice(1)
        }</p>
        <p><strong>Payment Status:</strong> ${
          order.paymentStatus.charAt(0).toUpperCase() +
          order.paymentStatus.slice(1)
        }</p>
        ${
          order.trackingNumber
            ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>`
            : ""
        }
        ${
          order.refund.status
            ? `<p><strong>Refund Status:</strong> ${
                order.refund.status.charAt(0).toUpperCase() +
                order.refund.status.slice(1)
              } (Amount: ₦${order.refund.amount.toFixed(2)})</p>`
            : ""
        }
        <a href="${orderUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Order</a>
        <p style="margin-top: 20px;">If you have any questions, feel free to contact our support team.</p>
        <hr style="border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} Trendora. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderUpdateEmail,
};
