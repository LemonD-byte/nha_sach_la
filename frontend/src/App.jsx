import { Routes, Route } from 'react-router-dom';
import ShopLayout from './components/ShopLayout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Shop from './pages/Shop';
import BookDetail from './pages/BookDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Wishlist from './pages/Wishlist';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminBooks from './pages/admin/AdminBooks';
import AdminCategories from './pages/admin/AdminCategories';
import AdminReviews from './pages/admin/AdminReviews';
import AdminUsers from './pages/admin/AdminUsers';

const customer = (el) => <ProtectedRoute roles={['customer']}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<ShopLayout />}>
        <Route index element={<Home />} />
        <Route path="books" element={<Shop />} />
        <Route path="books/:id" element={<BookDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="cart" element={customer(<Cart />)} />
        <Route path="checkout" element={customer(<Checkout />)} />
        <Route path="orders" element={customer(<Orders />)} />
        <Route path="wishlist" element={customer(<Wishlist />)} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<p className="center muted">Không tìm thấy trang.</p>} />
      </Route>
      <Route path="/admin" element={<ProtectedRoute roles={['admin', 'staff']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="books" element={<AdminBooks />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="categories" element={<ProtectedRoute roles={['admin']}><AdminCategories /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
