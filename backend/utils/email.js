const nodemailer = require("nodemailer");

// Build a transport from SMTP_* env vars. If they're not set, fall back to a
// console transport that just logs the email — so order flows work in dev and
// are ready for real SMTP later (set SMTP_HOST/PORT/USER/PASS in .env).
let transporter = null;
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const FROM = process.env.EMAIL_FROM || "SHOPPER <no-reply@shopper.test>";

// Fire-and-forget: never let email failures break the request flow.
const sendMail = async ({ to, subject, html }) => {
  try {
    if (!transporter) {
      console.log(`📧 [email:console] To: ${to} | ${subject}`);
      return;
    }
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
};

const orderConfirmationEmail = (order, toEmail) => ({
  to: toEmail,
  subject: `Your SHOPPER order #${String(order._id).slice(-6).toUpperCase()} is confirmed`,
  html: `
    <h2>Thanks for your order!</h2>
    <p>Order <b>#${String(order._id).slice(-6).toUpperCase()}</b> totalling
    <b>$${order.amount.toFixed(2)}</b> has been received.</p>
    <p>We'll email you when it ships.</p>
  `,
});

const orderStatusEmail = (order, toEmail) => ({
  to: toEmail,
  subject: `Order #${String(order._id).slice(-6).toUpperCase()} is now ${order.status}`,
  html: `
    <h2>Order update</h2>
    <p>Your order <b>#${String(order._id).slice(-6).toUpperCase()}</b> status is now
    <b>${order.status}</b>.</p>
  `,
});

const passwordResetEmail = (user, link) => ({
  to: user.email,
  subject: "Reset your SHOPPER password",
  html: `
    <h2>Password reset</h2>
    <p>Hi ${user.name || "there"}, we received a request to reset your password.</p>
    <p>
      <a href="${link}" style="display:inline-block;padding:11px 20px;background:#ff4141;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
        Reset password
      </a>
    </p>
    <p>Or paste this link into your browser:<br>
      <a href="${link}">${link}</a>
    </p>
    <p style="color:#777;font-size:13px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  `,
});

module.exports = {
  sendMail,
  orderConfirmationEmail,
  orderStatusEmail,
  passwordResetEmail,
  smtpConfigured,
};
