// Meilisearch is used when MEILI_HOST is configured; otherwise callers fall
// back to MongoDB queries. Run it locally with:
//   docker run -d -p 7700:7700 -e MEILI_MASTER_KEY=devkey getmeili/meilisearch
// then set MEILI_HOST=http://127.0.0.1:7700 and MEILI_KEY=devkey, and `npm run index`.
//
// The `meilisearch` package is ESM-only, so we load it lazily via dynamic
// import() — and only when MEILI_HOST is set (keeps the CJS app/tests clean).
const host = process.env.MEILI_HOST;
const INDEX = "products";

const searchEnabled = () => Boolean(host);

let clientPromise = null;
const getClient = async () => {
  if (!host) return null;
  if (!clientPromise) {
    clientPromise = import("meilisearch").then((mod) => {
      // Export name varies across versions: MeiliSearch / Meilisearch / default.
      const Client = mod.MeiliSearch || mod.Meilisearch || mod.default;
      return new Client({ host, apiKey: process.env.MEILI_KEY || "" });
    });
  }
  return clientPromise;
};

const syncProducts = async (products) => {
  const client = await getClient();
  if (!client) return { synced: 0, skipped: "MEILI_HOST not set" };
  const index = client.index(INDEX);
  await index.updateSettings({
    searchableAttributes: ["name", "brand", "category"],
    filterableAttributes: ["category", "brand", "new_price", "available"],
    sortableAttributes: ["new_price", "avgRating", "id"],
  });
  const docs = products.map((p) => ({
    ...(p.toObject ? p.toObject() : p),
    _id: undefined,
    pk: p.id,
  }));
  await index.addDocuments(docs, { primaryKey: "pk" });
  return { synced: docs.length };
};

const meiliSearch = async ({ search, category, brand, minPrice, maxPrice, sort, page, limit }) => {
  const client = await getClient();
  const index = client.index(INDEX);
  const filters = ["available = true"];
  if (category) filters.push(`category = "${category}"`);
  if (brand) filters.push(`brand = "${brand}"`);
  if (minPrice) filters.push(`new_price >= ${Number(minPrice)}`);
  if (maxPrice) filters.push(`new_price <= ${Number(maxPrice)}`);

  const sortMap = {
    price_asc: ["new_price:asc"],
    price_desc: ["new_price:desc"],
    rating: ["avgRating:desc"],
    newest: ["id:desc"],
  };

  const res = await index.search(search || "", {
    filter: filters.join(" AND "),
    sort: sortMap[sort],
    limit,
    offset: (page - 1) * limit,
    facets: ["brand"],
  });

  return {
    items: res.hits,
    total: res.estimatedTotalHits,
    page,
    pages: Math.max(1, Math.ceil(res.estimatedTotalHits / limit)),
    brands: Object.keys((res.facetDistribution && res.facetDistribution.brand) || {}).sort(),
  };
};

// Upsert a single product into the index (called on create/update).
const indexOne = async (product) => {
  const client = await getClient();
  if (!client) return;
  const obj = product.toObject ? product.toObject() : product;
  await client
    .index(INDEX)
    .addDocuments([{ ...obj, _id: undefined, pk: obj.id }], { primaryKey: "pk" });
};

// Remove a single product from the index (called on delete).
const removeOne = async (id) => {
  const client = await getClient();
  if (!client) return;
  await client.index(INDEX).deleteDocument(id);
};

const meiliSuggest = async (q) => {
  const client = await getClient();
  const index = client.index(INDEX);
  const res = await index.search(q || "", { limit: 6, attributesToRetrieve: ["pk", "name", "image"] });
  return res.hits;
};

module.exports = {
  searchEnabled,
  syncProducts,
  meiliSearch,
  meiliSuggest,
  indexOne,
  removeOne,
  INDEX,
};
