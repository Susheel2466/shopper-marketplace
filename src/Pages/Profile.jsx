import React, { useContext, useEffect, useState } from "react";
import "./CSS/Profile.css";
import { AuthContext } from "../Context/AuthContext";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../services/api";
import Loader from "../Components/Loader/Loader";

const emptyForm = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  isDefault: false,
};

const Profile = () => {
  const { user, token } = useContext(AuthContext);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAddresses(token)
      .then(setAddresses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const startEdit = (a) => {
    setEditingId(a._id);
    setForm({ ...a });
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const required = ["fullName", "phone", "line1", "city", "state", "postalCode", "country"];
    if (required.some((f) => !String(form[f]).trim())) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = editingId
        ? await updateAddress(editingId, form, token)
        : await addAddress(form, token);
      setAddresses(updated);
      reset();
    } catch (err) {
      setError(err.message || "Could not save address.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      setAddresses(await deleteAddress(id, token));
      if (editingId === id) reset();
    } catch (err) {
      setError(err.message);
    }
  };

  const makeDefault = async (a) => {
    try {
      setAddresses(await updateAddress(a._id, { ...a, isDefault: true }, token));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Loader message="Loading your profile..." />;

  return (
    <div className="profile">
      <h1>My Profile</h1>
      <div className="profile-user">
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
      </div>

      <h2>Saved Addresses</h2>
      <div className="profile-addresses">
        {addresses.length === 0 ? (
          <p className="profile-empty">No saved addresses yet.</p>
        ) : (
          addresses.map((a) => (
            <div className="profile-address-card" key={a._id}>
              {a.isDefault && <span className="profile-default-badge">Default</span>}
              <p className="profile-address-name">{a.fullName} · {a.phone}</p>
              <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
              <p>{a.city}, {a.state} {a.postalCode}, {a.country}</p>
              <div className="profile-address-actions">
                <button onClick={() => startEdit(a)}>Edit</button>
                {!a.isDefault && <button onClick={() => makeDefault(a)}>Set default</button>}
                <button className="profile-del" onClick={() => remove(a._id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <form className="profile-form" onSubmit={submit}>
        <h3>{editingId ? "Edit address" : "Add a new address"}</h3>
        <div className="profile-form-grid">
          <input name="fullName" aria-label="Full name" placeholder="Full name *" value={form.fullName} onChange={change} />
          <input name="phone" aria-label="Phone" placeholder="Phone *" value={form.phone} onChange={change} />
          <input className="span-2" name="line1" aria-label="Address line 1" placeholder="Address line 1 *" value={form.line1} onChange={change} />
          <input className="span-2" name="line2" aria-label="Address line 2" placeholder="Address line 2" value={form.line2} onChange={change} />
          <input name="city" aria-label="City" placeholder="City *" value={form.city} onChange={change} />
          <input name="state" aria-label="State" placeholder="State *" value={form.state} onChange={change} />
          <input name="postalCode" aria-label="Postal code" placeholder="Postal code *" value={form.postalCode} onChange={change} />
          <input name="country" aria-label="Country" placeholder="Country *" value={form.country} onChange={change} />
          <label className="profile-check">
            <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={change} /> Set as default
          </label>
        </div>
        {error && <p className="profile-error">{error}</p>}
        <div className="profile-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Add address"}
          </button>
          {editingId && (
            <button type="button" className="profile-cancel" onClick={reset}>Cancel</button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Profile;
