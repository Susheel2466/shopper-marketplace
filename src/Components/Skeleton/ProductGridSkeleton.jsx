import React from "react";
import "./ProductGridSkeleton.css";

// Placeholder cards shown while a product grid is loading (better perceived
// performance than a single spinner). `count` = number of shimmer cards.
const ProductGridSkeleton = ({ count = 8 }) => {
  return (
    <div className="skel-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-card" key={i}>
          <div className="skel-img skel-shimmer" />
          <div className="skel-line skel-shimmer" />
          <div className="skel-line short skel-shimmer" />
        </div>
      ))}
    </div>
  );
};

export default ProductGridSkeleton;
