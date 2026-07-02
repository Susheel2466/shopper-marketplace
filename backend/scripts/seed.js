require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const products = require("../data/products");
const coupons = require("../data/coupons");

const seed = async () => {
  try {
    await connectDB();

    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products.`);

    await Coupon.deleteMany({});
    await Coupon.insertMany(coupons);
    console.log(`Seeded ${coupons.length} coupons.`);

    // Ensure an admin account exists (without wiping real user signups).
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@shopper.com").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      // Use create() so the password is hashed by the pre-save hook.
      await User.create({
        name: "Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      console.log(`Created admin user: ${adminEmail} / ${adminPassword}`);
    } else {
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        await existingAdmin.save();
      }
      console.log(`Admin user already exists: ${adminEmail}`);
    }

    // Ensure two demo sellers exist and own the catalog (for the marketplace).
    const ensureSeller = async (email, shopName) => {
      let s = await User.findOne({ email });
      if (!s) {
        s = await User.create({
          name: shopName,
          email,
          password: "seller123",
          role: "seller",
          shopName,
          sellerApproved: true,
        });
        console.log(`Created seller: ${email} / seller123 (${shopName})`);
      }
      return s;
    };
    const seller1 = await ensureSeller("seller1@shopper.com", "Trendy Threads");
    const seller2 = await ensureSeller("seller2@shopper.com", "Urban Kicks");

    // Assign seeded products to sellers by category.
    await Product.updateMany(
      { category: { $in: ["women", "kid"] } },
      { seller: seller1._id, sellerName: seller1.shopName }
    );
    await Product.updateMany(
      { category: "men" },
      { seller: seller2._id, sellerName: seller2.shopName }
    );
    console.log("Assigned products: women+kid -> Trendy Threads, men -> Urban Kicks");
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seed();
