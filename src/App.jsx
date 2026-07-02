import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import ShopContextProvider from './Context/ShopContext';
import AuthContextProvider from './Context/AuthContext';
import WishlistContextProvider from './Context/WishlistContext';
import ToastProvider from './Context/ToastContext';
import Navbar from './Components/Navbar/Navbar';
import Footer from './Components/Footer/Footer';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute';
import AdminRoute from './Components/AdminRoute/AdminRoute';
import SellerRoute from './Components/SellerRoute/SellerRoute';
import Shop from './Pages/Shop';
import ShopCategory from './Pages/ShopCategory';
import Product from './Pages/Product';
import Cart from './Pages/Cart';
import Checkout from './Pages/Checkout';
import SearchResults from './Pages/SearchResults';
import BrandPage from './Pages/BrandPage';
import Orders from './Pages/Orders';
import OrderDetail from './Pages/OrderDetail';
import Wishlist from './Pages/Wishlist';
import Profile from './Pages/Profile';
import AdminDashboard from './Pages/AdminDashboard';
import AdminOrders from './Pages/AdminOrders';
import AdminProducts from './Pages/AdminProducts';
import AdminReturns from './Pages/AdminReturns';
import AdminSellers from './Pages/AdminSellers';
import Sell from './Pages/Sell';
import SellerDashboard from './Pages/SellerDashboard';
import SellerProducts from './Pages/SellerProducts';
import SellerOrders from './Pages/SellerOrders';
import LoginSignup from './Pages/LoginSignup';
import NotFound from './Pages/NotFound';
import men_banner from './Components/Assets/banner_mens.png';
import women_banner from './Components/Assets/banner_women.png';
import kid_banner from './Components/Assets/banner_kids.png';

function App() {
  return (
    <div>
      <ToastProvider>
      <ShopContextProvider>
        <AuthContextProvider>
          <WishlistContextProvider>
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path='/' element={<Shop />} />
              <Route path='/mens' element={<ShopCategory banner={men_banner} category='men' />} />
              <Route path='/womens' element={<ShopCategory banner={women_banner} category='women' />} />
              <Route path='/kids' element={<ShopCategory banner={kid_banner} category='kid' />} />
              <Route path='/search' element={<SearchResults />} />
            <Route path='/brand/:brand' element={<BrandPage />} />
            <Route path='/product' element={<Product />} />
              <Route path='/product/:productId' element={<Product />} />
              <Route
                path='/cart'
                element={
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/checkout'
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/orders'
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/orders/:id'
                element={
                  <ProtectedRoute>
                    <OrderDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/wishlist'
                element={
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/profile'
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/admin'
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path='/admin/orders'
                element={
                  <AdminRoute>
                    <AdminOrders />
                  </AdminRoute>
                }
              />
              <Route
                path='/admin/products'
                element={
                  <AdminRoute>
                    <AdminProducts />
                  </AdminRoute>
                }
              />
              <Route
                path='/admin/returns'
                element={
                  <AdminRoute>
                    <AdminReturns />
                  </AdminRoute>
                }
              />
              <Route
                path='/admin/sellers'
                element={
                  <AdminRoute>
                    <AdminSellers />
                  </AdminRoute>
                }
              />
              <Route path='/sell' element={<Sell />} />
              <Route
                path='/seller'
                element={
                  <SellerRoute>
                    <SellerDashboard />
                  </SellerRoute>
                }
              />
              <Route
                path='/seller/products'
                element={
                  <SellerRoute>
                    <SellerProducts />
                  </SellerRoute>
                }
              />
              <Route
                path='/seller/orders'
                element={
                  <SellerRoute>
                    <SellerOrders />
                  </SellerRoute>
                }
              />
              <Route path='/login' element={<LoginSignup />} />
              <Route path='*' element={<NotFound />} />
            </Routes>
            <Footer />
          </BrowserRouter>
          </WishlistContextProvider>
        </AuthContextProvider>
      </ShopContextProvider>
      </ToastProvider>
    </div>
  );
}

export default App;
