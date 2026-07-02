import React, { useContext } from 'react'
import './Navbar.css';
import logo from '../Assets/logo.png';
import cart_icon from '../Assets/cart_icon.png';
import { Link, useNavigate } from 'react-router-dom';
import { ShopContext } from '../../Context/ShopContext';
import { AuthContext } from '../../Context/AuthContext';
import { WishlistContext } from '../../Context/WishlistContext';
import { getBrands, suggestProducts } from '../../services/api';

const Navbar = () => {
    const [menu, setMenu] = React.useState("shop");
    const [query, setQuery] = React.useState("");
    const [brands, setBrands] = React.useState({});
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState([]);
    const [showSuggest, setShowSuggest] = React.useState(false);

    React.useEffect(() => {
        getBrands().then(setBrands).catch(() => setBrands({}));
    }, []);

    // Debounced autocomplete.
    React.useEffect(() => {
        if (query.trim().length < 2) { setSuggestions([]); return; }
        const t = setTimeout(() => {
            suggestProducts(query.trim()).then(setSuggestions).catch(() => setSuggestions([]));
        }, 250);
        return () => clearTimeout(t);
    }, [query]);
    const { getTotalCartItems } = useContext(ShopContext);
    const { user, logout } = useContext(AuthContext);
    const { count: wishlistCount } = useContext(WishlistContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setShowSuggest(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    };

    const pickSuggestion = (s) => {
        setShowSuggest(false);
        setQuery("");
        navigate(`/product/${s.id}`);
    };

  return (
    <div className="navbar">
        <div className="nav-logo">
          <img src={logo} alt="Logo" />
          <p>SHOPPER</p>
        </div>
        <button
          className="nav-hamburger"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        <ul className={`nav-menu ${menuOpen ? "nav-menu-open" : ""}`}>
            <li onClick={() => {setMenu("shop"); setMenuOpen(false)}}><Link to="/">Shop</Link> {menu === "shop" && <hr />}</li>
            {[
              { key: "men", label: "Men", to: "/mens", cat: "men" },
              { key: "women", label: "Women", to: "/womens", cat: "women" },
              { key: "kids", label: "Kids", to: "/kids", cat: "kid" },
            ].map((m) => (
              <li key={m.key} className="nav-has-mega" onClick={() => { setMenu(m.key); setMenuOpen(false); }}>
                <Link to={m.to}>{m.label}</Link>
                {menu === m.key && <hr />}
                {brands[m.cat] && brands[m.cat].length > 0 && (
                  <div className="nav-mega">
                    <p className="nav-mega-title">Brands</p>
                    {brands[m.cat].map((b) => (
                      <Link key={b} to={`/brand/${encodeURIComponent(b)}`} className="nav-mega-link">
                        {b}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
        </ul>
        <form className="nav-search" onSubmit={handleSearch} role="search">
            <input
                type="text"
                placeholder="Search products"
                aria-label="Search products"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            />
            <button type="submit">Search</button>
            {showSuggest && suggestions.length > 0 && (
                <ul className="nav-suggest">
                    {suggestions.map((s) => (
                        <li key={s.id} onMouseDown={() => pickSuggestion(s)}>
                            <img src={s.image} alt="" />
                            <span>{s.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </form>
        <div className="nav-login-cart">
            {user ? (
                <>
                    <Link to="/profile" className="nav-orders">Hi, {user.name}</Link>
                    {user.role === "admin" && (
                        <div className="nav-has-dropdown">
                            <button type="button" className="nav-orders nav-dropdown-toggle">
                                Admin <span className="nav-dropdown-caret">▾</span>
                            </button>
                            <div className="nav-dropdown">
                                <Link to="/admin">Dashboard</Link>
                                <Link to="/admin/orders">Orders</Link>
                                <Link to="/admin/products">Products</Link>
                                <Link to="/admin/returns">Returns</Link>
                                <Link to="/admin/sellers">Sellers</Link>
                            </div>
                        </div>
                    )}
                    {user.role === "seller" && (
                        <Link to="/seller" className="nav-orders">Seller Hub</Link>
                    )}
                    {user.role === "user" && (
                        <Link to="/sell" className="nav-orders">Sell</Link>
                    )}
                    <Link to="/orders" className="nav-orders">Orders</Link>
                    <Link to="/wishlist" className="nav-orders">Wishlist ({wishlistCount})</Link>
                    <button onClick={handleLogout}>Logout</button>
                </>
            ) : (
                <Link to="/login">
                    <button>Login</button>
                </Link>
            )}
            <Link to="/cart" aria-label={`Cart, ${getTotalCartItems()} items`}>
                <img src={cart_icon} alt="" />
            </Link>
            <div className="nav-cart-count" aria-hidden="true">{getTotalCartItems()}</div>
        </div>
    </div>
  )
}

export default Navbar