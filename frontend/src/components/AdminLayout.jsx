import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  return (
    <div className="admin">
      <aside className="sidebar">
        <Link to="/" className="brand"><span>🍃</span> Nhà sách Lá</Link>
        <p className="small light">{user.fullName} · {admin ? 'Quản trị viên' : 'Nhân viên'}</p>
        <NavLink to="/admin" end>Tổng quan</NavLink>
        <NavLink to="/admin/orders">Đơn hàng</NavLink>
        <NavLink to="/admin/books">Sản phẩm</NavLink>
        <NavLink to="/admin/reviews">Đánh giá</NavLink>
        {admin && <NavLink to="/admin/categories">Danh mục</NavLink>}
        {admin && <NavLink to="/admin/users">Tài khoản</NavLink>}
        <Link to="/" className="back">← Về cửa hàng</Link>
      </aside>
      <section className="admin-main"><Outlet /></section>
    </div>
  );
}
