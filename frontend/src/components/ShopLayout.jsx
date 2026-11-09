import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6" /></svg>
);
const HeartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.4 4.8 6.6 4.8c2 0 3.6 1.1 5.4 3.2 1.8-2.1 3.4-3.2 5.4-3.2 3.2 0 5.2 3.1 3.9 6.5-1.8 4.6-9.3 9.2-9.3 9.2z" /></svg>
);
const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
);

export default function ShopLayout() {
  const { user, logout, cartCount, wishIds } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const isStaff = user && user.role !== 'customer';
  const go = (e) => { e.preventDefault(); nav(q.trim() ? `/books?search=${encodeURIComponent(q.trim())}` : '/books'); };

  return (
    <div className="shell">
      <div className="promo-bar">Miễn phí đổi trả trong 7 ngày · Giao hàng toàn quốc · Thanh toán khi nhận hàng</div>
      <header className="hdr">
        <div className="container hdr-in">
          <Link to="/" className="brand"><span>🍃</span> Nhà sách Lá</Link>
          <form className="hdr-search" onSubmit={go}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sách, bút, máy tính, đồ chơi…" aria-label="Tìm kiếm" />
            <button aria-label="Tìm">Tìm</button>
          </form>
          <div className="hdr-actions">
            {user?.role === 'customer' && <Link to="/wishlist" className="hdr-icon" title="Yêu thích"><HeartIcon />{wishIds.length > 0 && <b className="count">{wishIds.length}</b>}<span>Yêu thích</span></Link>}
            {user?.role === 'customer' && <Link to="/cart" className="hdr-icon" title="Giỏ hàng"><CartIcon />{cartCount > 0 && <b className="count">{cartCount}</b>}<span>Giỏ hàng</span></Link>}
            {user ? (
              <div className="hdr-user">
                <Link to="/profile" className="hdr-icon"><UserIcon /><span>{user.fullName.split(' ').slice(-1)}</span></Link>
                <div className="menu">
                  {user.role === 'customer' && <Link to="/orders">Đơn hàng của tôi</Link>}
                  {user.role === 'customer' && <Link to="/wishlist">Sản phẩm yêu thích</Link>}
                  {isStaff && <Link to="/admin">Trang quản trị</Link>}
                  <Link to="/profile">Tài khoản</Link>
                  <button onClick={() => { logout(); nav('/'); }}>Đăng xuất</button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="hdr-icon"><UserIcon /><span>Đăng nhập</span></Link>
            )}
          </div>
        </div>
        <nav className="catnav">
          <div className="container">
            <NavLink to="/" end>Trang chủ</NavLink>
            <NavLink to="/books" end>Tất cả sản phẩm</NavLink>
            {['Sách', 'Dụng cụ học tập', 'Đồ chơi'].map((g) => <Link key={g} to={`/books?group=${encodeURIComponent(g)}`}>{g}</Link>)}
            {user?.role === 'customer' && <NavLink to="/orders">Đơn hàng</NavLink>}
          </div>
        </nav>
      </header>
      <main className="container page"><Outlet /></main>
      <footer className="footer">
        <div className="container foot-grid">
          <div><strong className="brand">🍃 Nhà sách Lá</strong><p>Sách, dụng cụ học tập và đồ chơi cho mọi lứa tuổi.</p></div>
          <div><strong>Mua sắm</strong><p><Link to="/books?group=Sách">Sách</Link><br /><Link to="/books?group=Dụng cụ học tập">Dụng cụ học tập</Link><br /><Link to="/books?group=Đồ chơi">Đồ chơi</Link></p></div>
          <div><strong>Liên hệ</strong><p>Đồng Nai, Việt Nam<br />admin@nhasach.vn</p></div>
        </div>
      </footer>
    </div>
  );
}
