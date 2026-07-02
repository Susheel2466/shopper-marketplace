import React, { useContext, useEffect, useState } from "react";
import "./CSS/AdminProducts.css";
import { AuthContext } from "../Context/AuthContext";
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from "../services/api";
import Loader from "../Components/Loader/Loader";
import { useToast } from "../Context/ToastContext";

const emptyForm = {
  name: "",
  category: "women",
  image: "product_1.png",
  new_price: "",
  old_price: "",
  popular: false,
  newCollection: false,
};

const blankVariant = () => ({ size: "", color: "", stock: "" });

const AdminProducts = ({ listApi = getAdminProducts, title = "Admin — Products" }) => {
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [variants, setVariants] = useState([blankVariant()]);
  const [editingId, setEditingId] = useState(null); // null = creating
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { filename } = await uploadProductImage(file, token);
      setForm((f) => ({ ...f, image: filename }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const load = () => {
    setLoading(true);
    listApi(token)
      .then((data) => {
        setProducts(data);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load products."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, listApi]);

  const changeForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const changeVariant = (i, field, value) => {
    setVariants((prev) =>
      prev.map((v, idx) => (idx === i ? { ...v, [field]: value } : v))
    );
  };
  const addVariantRow = () => setVariants((prev) => [...prev, blankVariant()]);
  const removeVariantRow = (i) =>
    setVariants((prev) => prev.filter((_, idx) => idx !== i));

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setVariants([blankVariant()]);
    setFormError("");
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setFormError("");
    const image = p.image?.includes("/images/")
      ? p.image.split("/images/")[1]
      : p.image;
    setForm({
      name: p.name,
      category: p.category,
      image,
      new_price: p.new_price,
      old_price: p.old_price,
      popular: p.popular,
      newCollection: p.newCollection,
    });
    setVariants(
      p.variants && p.variants.length
        ? p.variants.map((v) => ({ size: v.size, color: v.color, stock: v.stock }))
        : [blankVariant()]
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.new_price === "" || form.old_price === "") {
      setFormError("Name, new price and old price are required.");
      return;
    }
    const cleanVariants = variants
      .filter((v) => v.size || v.color)
      .map((v) => ({
        size: v.size.trim(),
        color: v.color.trim(),
        stock: Number(v.stock) || 0,
      }));
    setSaving(true);
    setFormError("");
    const payload = {
      ...form,
      new_price: Number(form.new_price),
      old_price: Number(form.old_price),
      variants: cleanVariants,
    };
    try {
      if (editingId == null) {
        await createProduct(payload, token);
        toast.success("Product created");
      } else {
        await updateProduct(editingId, payload, token);
        toast.success("Product updated");
      }
      startCreate();
      load();
    } catch (err) {
      setFormError(err.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Delete product #${id}?`)) return;
    try {
      await deleteProduct(id, token);
      toast.success("Product deleted");
      if (editingId === id) startCreate();
      load();
    } catch (err) {
      toast.error(err.message || "Could not delete product.");
    }
  };

  if (loading) return <Loader message="Loading products..." />;
  if (error) return <div className="adminproducts-error">{error}</div>;

  return (
    <div className="adminproducts">
      <h1>{title} ({products.length})</h1>

      <form className="adminproducts-form" onSubmit={submit}>
        <h2>{editingId == null ? "Add product" : `Edit product #${editingId}`}</h2>
        <div className="adminproducts-form-grid">
          <input name="name" aria-label="Product name" placeholder="Name *" value={form.name} onChange={changeForm} />
          <select name="category" aria-label="Category" value={form.category} onChange={changeForm}>
            <option value="women">women</option>
            <option value="men">men</option>
            <option value="kid">kid</option>
          </select>
          <input name="image" aria-label="Image filename or URL" placeholder="Image filename or URL" value={form.image} onChange={changeForm} />
          <label className="adminproducts-upload">
            {uploading ? "Uploading..." : "Upload image"}
            <input type="file" accept="image/*" onChange={onUpload} hidden />
          </label>
          <input name="new_price" aria-label="New price" type="number" step="0.01" placeholder="New price *" value={form.new_price} onChange={changeForm} />
          <input name="old_price" aria-label="Old price" type="number" step="0.01" placeholder="Old price *" value={form.old_price} onChange={changeForm} />
          <label className="adminproducts-check">
            <input type="checkbox" name="popular" checked={form.popular} onChange={changeForm} /> Popular
          </label>
          <label className="adminproducts-check">
            <input type="checkbox" name="newCollection" checked={form.newCollection} onChange={changeForm} /> New collection
          </label>
        </div>

        <div className="adminproducts-variants">
          <h4>Variants (size / color / stock)</h4>
          {variants.map((v, i) => (
            <div className="adminproducts-variant-row" key={i}>
              <input aria-label={`Variant ${i + 1} size`} placeholder="Size" value={v.size} onChange={(e) => changeVariant(i, "size", e.target.value)} />
              <input aria-label={`Variant ${i + 1} color`} placeholder="Color" value={v.color} onChange={(e) => changeVariant(i, "color", e.target.value)} />
              <input aria-label={`Variant ${i + 1} stock`} type="number" placeholder="Stock" value={v.stock} onChange={(e) => changeVariant(i, "stock", e.target.value)} />
              <button type="button" className="adminproducts-del" aria-label={`Remove variant ${i + 1}`} onClick={() => removeVariantRow(i)}>✕</button>
            </div>
          ))}
          <button type="button" className="adminproducts-addvariant" onClick={addVariantRow}>
            + Add variant
          </button>
        </div>

        {formError && <p className="adminproducts-form-error">{formError}</p>}
        <div className="adminproducts-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId == null ? "Add product" : "Save changes"}
          </button>
          {editingId != null && (
            <button type="button" className="adminproducts-cancel" onClick={startCreate}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="adminproducts-table">
        <div className="adminproducts-row adminproducts-head">
          <span>Img</span>
          <span>ID</span>
          <span>Name</span>
          <span>Cat</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Actions</span>
        </div>
        {products.map((p) => (
          <div className="adminproducts-row" key={p.id}>
            <span><img className="adminproducts-thumb" src={p.image} alt={p.name} /></span>
            <span>#{p.id}</span>
            <span className="adminproducts-name">{p.name}</span>
            <span>{p.category}</span>
            <span>${p.new_price}</span>
            <span className={p.totalStock === 0 ? "adminproducts-stock-out" : p.totalStock <= 5 ? "adminproducts-stock-low" : ""}>
              {p.totalStock}
            </span>
            <span className="adminproducts-actions">
              <button onClick={() => startEdit(p)}>Edit</button>
              <button className="adminproducts-del" onClick={() => remove(p.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProducts;
