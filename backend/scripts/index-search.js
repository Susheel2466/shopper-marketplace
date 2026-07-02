// Pushes the product catalog into Meilisearch. Run: npm run index
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");
const { searchEnabled, syncProducts } = require("../utils/searchEngine");

(async () => {
  if (!searchEnabled()) {
    console.log("MEILI_HOST not set — nothing to index (search uses MongoDB).");
    return;
  }
  try {
    await connectDB();
    const products = await Product.find({ available: true });
    const result = await syncProducts(products);
    console.log(`Indexed ${result.synced} products into Meilisearch.`);
  } catch (err) {
    console.error("Indexing failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
