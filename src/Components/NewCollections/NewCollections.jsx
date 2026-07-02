import React from "react";
import "./NewCollections.css";
import Item from "../Item/Item";
import ProductGridSkeleton from "../Skeleton/ProductGridSkeleton";
import useFetch from "../../hooks/useFetch";
import { getNewCollections } from "../../services/api";

const NewCollections = () => {
  const { data: new_collections, loading, error } = useFetch(getNewCollections);

  return (
    <div className="new-collections" id="new-collections">
      <h1>NEW COLLECTIONS</h1>
      <hr />
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : error ? (
        <p className="newcollections-error">{error}</p>
      ) : (
        <div className="collections">
          {new_collections.map((item, i) => (
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

export default NewCollections;
