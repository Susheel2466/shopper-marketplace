import React from "react";
import AdminProducts from "./AdminProducts";
import { getSellerProducts } from "../services/api";

// Reuses the product manager, scoped to the seller's own products.
const SellerProducts = () => (
  <AdminProducts listApi={getSellerProducts} title="My Products" />
);

export default SellerProducts;
