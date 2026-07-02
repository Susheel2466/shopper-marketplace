import React, { useContext } from "react";
import { useParams } from "react-router-dom";
import { ShopContext } from "../Context/ShopContext";
import Loader from "../Components/Loader/Loader";
import Breadcrum from "../Components/Breadcrums/Breadcrum";
import ProductDisplay from "../Components/ProductDisplay/ProductDisplay";
import DescriptionBox from "../Components/DescriptionBox/DescriptionBox";
import RelatedProducts from "../Components/RelatedProducts/RelatedProducts";

const Product = () => {
  const { all_product, loading, error } = useContext(ShopContext);
  const { productId } = useParams();

  if (loading) {
    return <Loader message="Loading product..." />;
  }

  if (error) {
    return <div style={{ margin: "100px 170px" }}>{error}</div>;
  }

  const product = all_product.find((e) => e.id === Number(productId));

  if (!product) {
    return <div style={{ margin: "100px 170px" }}>Product not found.</div>;
  }

  return (
    <div>
      <Breadcrum product={product} />
      <ProductDisplay product={product} />
      <DescriptionBox product={product} />
      <RelatedProducts productId={product.id} />
    </div>
  );
};

export default Product;
