import React from "react";
import "./Popular.css";
import Item from "../Item/Item";
import ProductGridSkeleton from "../Skeleton/ProductGridSkeleton";
import useFetch from "../../hooks/useFetch";
import { getPopularProducts } from "../../services/api";

const Popular = () => {
  const { data: popularProducts, loading, error } = useFetch(getPopularProducts);

  return (
    <div className="popular">
      <h1>POPULAR IN WOMEN</h1>
      <hr />
      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : error ? (
        <p className="popular-error">{error}</p>
      ) : (
        <div className="popular-item">
          {popularProducts.map((item, i) => (
            <Item
              key={i}
              id={item.id}
              name={item.name}
              image={item.image}
              new_price={item.new_price}
              old_price={item.old_price}
              inStock={item.inStock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Popular;
