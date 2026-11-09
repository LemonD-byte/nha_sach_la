import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BookCover from '../components/BookCover';
import { money } from '../api/format';

export default function Wishlist() {
  const [data, setData] = useState(null);
  const { refreshCart, setWishIds } = useAuth();
  const toast = useToast();

  const apply = (d) => { setData(d); setWishIds(d.ids); };
  useEffect(() => { api.get('/wishlist').then((r) => apply(r.data)).catch((e) => toast(errMsg(e), 'err')); }, []); // eslint-disable-line

  const unlike = (bookId) => api.delete(`/wishlist/${bookId}`).then((r) => { apply(r.data); toast('Đã bỏ khỏi yêu thích'); }).catch((e) => toast(errMsg(e), 'err'));
  const addToCart = async (bookId) => {
    try { await api.post('/cart/items', { bookId, quantity: 1 }); await refreshCart(); toast('Đã thêm vào giỏ hàng'); }
    catch (e) { toast(errMsg(e), 'err'); }
  };

  if (!data) return <p className="center muted">Đang tải…</p>;
  if (data.items.length === 0) return <div className="center panel"><h2>Chưa có sản phẩm yêu thích</h2><p className="muted">Bấm vào biểu tượng trái tim trên sản phẩm để lưu lại.</p><Link to="/books" className="btn">Khám phá cửa hàng</Link></div>;

  return (
    <>
      <h1>Sản phẩm yêu thích <span className="muted small">({data.count})</span></h1>
      <div className="panel">
        {data.items.map(({ bookId, book }) => (
          <div key={bookId} className="cart-line">
            <BookCover book={book} className="cover-sm" />
            <div className="grow">
              <Link to={`/books/${bookId}`}><strong>{book.title}</strong></Link>
              <div className="muted small">{book.author === 'Đang cập nhật' ? '' : book.author}</div>
              <div className="price">{money(book.price)}</div>
              {book.stock === 0 && <span className="badge badge-red">Hết hàng</span>}
            </div>
            <button className="btn" disabled={book.stock === 0} onClick={() => addToCart(bookId)}>Thêm vào giỏ</button>
            <button className="btn-link danger" onClick={() => unlike(bookId)}>Bỏ thích</button>
          </div>
        ))}
      </div>
    </>
  );
}
