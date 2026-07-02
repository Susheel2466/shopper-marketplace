import React from "react";
import { useParams } from "react-router-dom";
import ProductBrowser from "../Components/ProductBrowser/ProductBrowser";

const BrandPage = () => {
  const { brand } = useParams();
  return <ProductBrowser fixedBrand={brand} heading={brand} />;
};

export default BrandPage;
