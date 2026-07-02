import React from "react";
import ProductBrowser from "../Components/ProductBrowser/ProductBrowser";

const ShopCategory = (props) => {
  return (
    <ProductBrowser
      category={props.category}
      banner={props.banner}
      heading={props.category.charAt(0).toUpperCase() + props.category.slice(1)}
    />
  );
};

export default ShopCategory;
