import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProductDisplay.css";
import star_icon from "../Assets/star_icon.png";
import star_dull_icon from "../Assets/star_dull_icon.png";
import { ShopContext } from "../../Context/ShopContext";
import { WishlistContext } from "../../Context/WishlistContext";
import { AuthContext } from "../../Context/AuthContext";
import { useToast } from "../../Context/ToastContext";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];

const ProductDisplay = (props) => {
  const { product } = props;
  const { addToCart } = useContext(ShopContext);
  const { isWished, toggle } = useContext(WishlistContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  const onWishlist = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    const wasWished = isWished(product.id);
    toggle(product.id);
    toast.success(wasWished ? "Removed from wishlist" : "Added to wishlist");
  };

  const gallery =
    product.images && product.images.length ? product.images : [product.image];
  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  // Selectable options: prefer explicit sizes/colors, else derive from variants.
  const sizes =
    product.sizes && product.sizes.length
      ? product.sizes
      : hasVariants
      ? [...new Set(variants.map((v) => v.size).filter(Boolean))]
      : DEFAULT_SIZES;
  const colors =
    product.colors && product.colors.length
      ? product.colors
      : [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const hasColors = colors.length > 0;

  const [mainImage, setMainImage] = useState(gallery[0]);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(hasColors ? "" : "");
  const [notice, setNotice] = useState("");

  const rounded = Math.round(product.avgRating || 0);

  // Stock for the selected (size,color). If no variants, fall back to "in stock".
  const stockFor = (size, color) => {
    if (!hasVariants) return Infinity;
    const v = variants.find(
      (x) => (x.size || "") === size && (x.color || "") === color
    );
    return v ? v.stock : 0;
  };
  const selectionComplete = selectedSize && (!hasColors || selectedColor);
  const selectedStock = selectionComplete
    ? stockFor(selectedSize, selectedColor)
    : null;
  const variantOutOfStock = selectedStock === 0;
  const variantLow = selectedStock > 0 && selectedStock <= 5;

  // Whole-product availability (any variant in stock).
  const totalStock = hasVariants
    ? variants.reduce((s, v) => s + (v.stock || 0), 0)
    : Infinity;
  const productOutOfStock = totalStock === 0;

  const handleAddToCart = () => {
    if (productOutOfStock) return;
    if (!selectedSize) {
      setNotice("Please select a size first.");
      return;
    }
    if (hasColors && !selectedColor) {
      setNotice("Please select a color first.");
      return;
    }
    if (variantOutOfStock) {
      setNotice("That option is out of stock.");
      return;
    }
    addToCart(product.id, selectedSize, selectedColor);
    toast.success(
      `Added to cart (${selectedSize}${selectedColor ? `, ${selectedColor}` : ""})`
    );
    setNotice("");
  };

  return (
    <div className="productdisplay">
      <div className="productdisplay-left">
        <div className="productdisplay-img-list">
          {gallery.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={product.name}
              className={img === mainImage ? "thumb-active" : ""}
              onClick={() => setMainImage(img)}
            />
          ))}
        </div>
        <div className="productdisplay-img">
          <img className="productdisplay-main-img" src={mainImage} alt={product.name} />
        </div>
      </div>
      <div className="productdisplay-right">
        {product.brand && (
          <p className="productdisplay-right-brand">{product.brand}</p>
        )}
        <h1>{product.name}</h1>
        <div className="productdisplay-right-star">
          {[1, 2, 3, 4, 5].map((n) => (
            <img key={n} src={n <= rounded ? star_icon : star_dull_icon} alt="" />
          ))}
          <p>
            {product.numReviews > 0
              ? `${product.avgRating.toFixed(1)} (${product.numReviews})`
              : "No reviews yet"}
          </p>
        </div>
        <div className="productdisplay-right-prices">
          <div className="productdisplay-right-price-old">${product.old_price}</div>
          <div className="productdisplay-right-price-new">${product.new_price}</div>
        </div>
        <div className="productdisplay-right-description">
          A lightweight, usually knitted, pullover shirt, close-fitting and with
          a round neckline and short sleeves, worn as an undershirt or outer
          garment.
        </div>

        {hasColors && (
          <div className="productdisplay-right-size">
            <h1 id="color-label">Select Color</h1>
            <div className="productdisplay-right-sizes" role="group" aria-labelledby="color-label">
              {colors.map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-pressed={selectedColor === color}
                  className={selectedColor === color ? "selected" : ""}
                  onClick={() => {
                    setSelectedColor(color);
                    setNotice("");
                  }}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="productdisplay-right-size">
          <h1 id="size-label">Select Size</h1>
          <div className="productdisplay-right-sizes" role="group" aria-labelledby="size-label">
            {sizes.map((size) => (
              <button
                type="button"
                key={size}
                aria-pressed={selectedSize === size}
                className={selectedSize === size ? "selected" : ""}
                onClick={() => {
                  setSelectedSize(size);
                  setNotice("");
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {productOutOfStock ? (
          <p className="productdisplay-stock out">Out of stock</p>
        ) : variantOutOfStock ? (
          <p className="productdisplay-stock out">This option is out of stock</p>
        ) : variantLow ? (
          <p className="productdisplay-stock low">Only {selectedStock} left</p>
        ) : null}

        <div className="productdisplay-actions">
          <button onClick={handleAddToCart} disabled={productOutOfStock}>
            {productOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
          </button>
          <button
            type="button"
            className={`productdisplay-wishlist ${isWished(product.id) ? "active" : ""}`}
            onClick={onWishlist}
          >
            {isWished(product.id) ? "♥ Wishlisted" : "♡ Wishlist"}
          </button>
        </div>
        {notice && <p className="productdisplay-right-notice">{notice}</p>}
        <p className="productdisplay-right-category">
          <span>Category :</span> {product.category}
          {product.brand ? `, ${product.brand}` : ""}
        </p>
        {product.sellerName && (
          <p className="productdisplay-right-category">
            <span>Sold by :</span> {product.sellerName}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductDisplay;
