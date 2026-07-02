import React from "react";
import { Link } from "react-router-dom";
import "./CSS/NotFound.css";

const NotFound = () => {
  return (
    <div className="notfound">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="notfound-btn">
        Back to Shop
      </Link>
    </div>
  );
};

export default NotFound;
