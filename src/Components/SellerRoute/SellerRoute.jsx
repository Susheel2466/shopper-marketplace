import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";

// Requires an approved seller (admins also allowed).
const SellerRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const isApprovedSeller = user.role === "seller" && user.sellerApproved;
  if (!isApprovedSeller && user.role !== "admin") {
    return <Navigate to="/sell" replace />;
  }
  return children;
};

export default SellerRoute;
