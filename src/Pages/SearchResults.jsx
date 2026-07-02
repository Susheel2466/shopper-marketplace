import React from "react";
import { useSearchParams } from "react-router-dom";
import ProductBrowser from "../Components/ProductBrowser/ProductBrowser";

const SearchResults = () => {
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  return (
    <ProductBrowser search={q} heading={q ? `Results for "${q}"` : "All products"} />
  );
};

export default SearchResults;
