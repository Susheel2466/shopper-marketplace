import React, { useEffect, useState } from "react";
import "./RelatedProducts.css";
import Item from "../Item/Item";
import { getRecommended } from "../../services/api";

const RelatedProducts = ({ productId }) => {
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let mounted = true;
    getRecommended(productId)
      .then((data) => mounted && setRelated(data))
      .catch(() => mounted && setRelated([]));
    return () => {
      mounted = false;
    };
  }, [productId]);

  if (related.length === 0) return null;

  return (
    <div className="relatedproducts">
      <h1>You may also like</h1>
      <hr />
      <div className="relatedproducts-item">
        {related.map((item) => (
          <Item
            key={item.id}
            id={item.id}
            name={item.name}
            image={item.image}
            new_price={item.new_price}
            old_price={item.old_price}
            inStock={item.inStock}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
