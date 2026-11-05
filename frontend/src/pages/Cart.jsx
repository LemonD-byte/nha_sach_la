import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BookCover from '../components/BookCover';
import { money } from '../api/format';

export default function Cart() {
  const [cart, setCart] = useState(null);
  const { refreshCart } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const apply = (data) => { setCart(data); refreshCart(); };
  useEffect(() => { api.get('/cart').then((r) => setCart(r.data)); }, []);

  const run = (p) => p.then((r) => apply(r.data)).catch((e) => toast(errMsg(e), 'err'));
  if (!cart) return <p className="center muted">Đang tải…</p>;
  if (cart.items.length === 0) return <div className="center panel"><h2>Giỏ hàng đang trống</h2><Link to="/" className="btn">Đến cửa hàng</Link></div>;

  return (
    <>
      <h1>Giỏ hàng</h1>
      <div className="two-col">
        <div className="panel">
          {cart.items.map(({ bookId, quantity, book }) => (
            <div key={bookId} className="cart-line">
              <BookCover book={book} className="cover-sm" />
              <div className="grow"><Link to={`/books/${bookId}`}><strong>{book.title}</strong></Link><div className="muted small">{money(book.price)}</div></div>
              <input type="number" min="1" max={book.stock} value={quantity} className="qty"
                onChange={(e) => run(api.put(`/cart/items/${bookId}`, { quantity: e.target.value }))} />
              <strong className="w100">{money(book.price * quantity)}</strong>
              <button className="btn-link danger" onClick={() => run(api.delete(`/cart/items/${bookId}`))}>Xóa</button>
            </div>
          ))}
          <button className="btn-link danger" onClick={() => run(api.delete('/cart'))}>Xóa toàn bộ giỏ</button>
        </div>
        <aside className="panel summary">
          <h2>Tạm tính</h2>
          <div className="row-between"><span>{cart.count} sản phẩm</span><strong className="big-price">{money(cart.total)}</strong></div>
          <button className="btn block" onClick={() => nav('/checkout')}>Tiến hành đặt hàng</button>
        </aside>
      </div>
    </>
  );
}
