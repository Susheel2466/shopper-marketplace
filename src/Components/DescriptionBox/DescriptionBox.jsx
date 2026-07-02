import React, { useState } from "react";
import "./DescriptionBox.css";
import Reviews from "../Reviews/Reviews";

const DescriptionBox = ({ product }) => {
  const [tab, setTab] = useState("description");

  return (
    <div className="descriptionbox">
      <div className="descriptionbox-navigator" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "description"}
          className={`descriptionbox-nav-box ${tab === "description" ? "" : "fade"}`}
          onClick={() => setTab("description")}
        >
          Description
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reviews"}
          className={`descriptionbox-nav-box ${tab === "reviews" ? "" : "fade"}`}
          onClick={() => setTab("reviews")}
        >
          Reviews ({product?.numReviews || 0})
        </button>
      </div>
      {tab === "description" ? (
        <div className="descriptionbox-description">
          <p>
            An e-commerce website is an online platform that facilitates the
            buying and selling of products or services over the internet. It
            serves as a virtual marketplace where businesses and individuals can
            showcase their products, interact with customers, and conduct
            transactions without the need for a physical presence.
          </p>
          <p>
            E-commerce websites typically display products or services along
            with detailed descriptions, images, prices, and any available
            variations (e.g., sizes, colors). Each product usually has its own
            dedicated page with relevant information.
          </p>
        </div>
      ) : (
        <div className="descriptionbox-description">
          {product && <Reviews productId={product.id} />}
        </div>
      )}
    </div>
  );
};

export default DescriptionBox;
