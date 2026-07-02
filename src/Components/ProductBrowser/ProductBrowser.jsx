import React, { useEffect, useState } from "react";
import "./ProductBrowser.css";
import Item from "../Item/Item";
import ProductGridSkeleton from "../Skeleton/ProductGridSkeleton";
import { searchProducts } from "../../services/api";

const SORTS = [
  { value: "", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Customer Rating" },
  { value: "newest", label: "Newest" },
];

const PAGE_SIZE = 12;

const ProductBrowser = ({ category, banner, search = "", heading, fixedBrand }) => {
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  // price draft (applied on button) vs active values used in the query
  const [minDraft, setMinDraft] = useState("");
  const [maxDraft, setMaxDraft] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [data, setData] = useState({ items: [], total: 0, pages: 1, brands: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reset filters when the search term or category changes.
  useEffect(() => {
    setBrand("");
    setSort("");
    setPage(1);
    setMinDraft("");
    setMaxDraft("");
    setMinPrice("");
    setMaxPrice("");
  }, [search, category]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    searchProducts({
      search,
      category,
      brand: fixedBrand || brand,
      minPrice,
      maxPrice,
      sort,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (!mounted) return;
        setData(res);
        setError("");
      })
      .catch((err) => mounted && setError(err.message || "Search failed."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [search, category, fixedBrand, brand, minPrice, maxPrice, sort, page]);

  const changeBrand = (b) => {
    setBrand(b);
    setPage(1);
  };
  const changeSort = (s) => {
    setSort(s);
    setPage(1);
  };
  const applyPrice = () => {
    setMinPrice(minDraft);
    setMaxPrice(maxDraft);
    setPage(1);
  };
  const clearFilters = () => {
    setBrand("");
    setMinDraft("");
    setMaxDraft("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  };

  return (
    <div className="browser">
      {banner && <img className="browser-banner" src={banner} alt={category} />}

      <div className="browser-layout">
        <aside className="browser-filters">
          <div className="browser-filter-head">
            <h3>Filters</h3>
            <button onClick={clearFilters}>Clear</button>
          </div>

          {!fixedBrand && (
            <div className="browser-filter-group">
              <h4>Brand</h4>
              <label>
                <input
                  type="radio"
                  name="brand"
                  checked={brand === ""}
                  onChange={() => changeBrand("")}
                />{" "}
                All brands
              </label>
              {data.brands.map((b) => (
                <label key={b}>
                  <input
                    type="radio"
                    name="brand"
                    checked={brand === b}
                    onChange={() => changeBrand(b)}
                  />{" "}
                  {b}
                </label>
              ))}
            </div>
          )}

          <div className="browser-filter-group">
            <h4>Price</h4>
            <div className="browser-price-inputs">
              <input
                type="number"
                placeholder="Min"
                aria-label="Minimum price"
                value={minDraft}
                onChange={(e) => setMinDraft(e.target.value)}
              />
              <span>–</span>
              <input
                type="number"
                placeholder="Max"
                aria-label="Maximum price"
                value={maxDraft}
                onChange={(e) => setMaxDraft(e.target.value)}
              />
            </div>
            <button className="browser-apply" onClick={applyPrice}>
              Apply
            </button>
          </div>
        </aside>

        <section className="browser-main">
          <div className="browser-toolbar">
            <p>
              {heading ? <strong>{heading}</strong> : null}
              <span className="browser-count">
                {data.total} product{data.total === 1 ? "" : "s"}
              </span>
            </p>
            <select aria-label="Sort products" value={sort} onChange={(e) => changeSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <ProductGridSkeleton count={12} />
          ) : error ? (
            <p className="browser-error">{error}</p>
          ) : data.items.length === 0 ? (
            <p className="browser-empty">No products match your filters.</p>
          ) : (
            <>
              <div className="browser-grid">
                {data.items.map((item) => (
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

              {data.pages > 1 && (
                <div className="browser-pagination">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Prev
                  </button>
                  <span>
                    Page {page} of {data.pages}
                  </span>
                  <button
                    disabled={page >= data.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProductBrowser;
