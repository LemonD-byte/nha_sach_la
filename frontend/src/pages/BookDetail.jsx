import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BookCover from '../components/BookCover';
import Stars from '../components/Stars';
import { money, dateTime } from '../api/format';

export default function BookDetail() {
  const { id } = useParams();
  const { user, refreshCart } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [book, setBook] = useState(null);
  const [cat, setCat] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api.get(`/books/${id}`).then(async (r) => {
      setBook(r.data);
      const cats = await api.get('/categories');
      setCat(cats.data.find((c) => c._id === r.data.categoryId));
    }).catch(() => setBook(false));
    api.get(`/books/${id}/reviews`).then((r) => setReviews(r.data));
  }, [id]);

  if (book === false) return <p className="center muted">Không tìm thấy sản phẩm.</p>;
  if (!book) return <p className="center muted">Đang tải…</p>;

  const add = async (goCart) => {
    if (!user) return nav('/login', { state: { from: `/books/${id}` } });
    if (user.role !== 'customer') return toast('Chỉ tài khoản khách hàng mới mua được', 'err');
    try {
      await api.post('/cart/items', { bookId: book._id, quantity: qty });
      await refreshCart();
      toast('Đã thêm vào giỏ hàng');
      if (goCart) nav('/cart');
    } catch (e) { toast(errMsg(e), 'err'); }
  };

  return (
    <>
      <div className="detail">
        <BookCover book={book} className="cover-lg" />
        <div>
          <p className="muted small"><Link to="/">Trang chủ</Link> › <Link to={`/books?group=${encodeURIComponent(cat?.group || '')}`}>{cat?.group}</Link> › <Link to={`/books?categoryId=${book.categoryId}`}>{cat?.name}</Link></p>
          <h1>{book.title}</h1>
          <p>Tác giả: <strong>{book.author}</strong></p>
          <p className="row gap"><Stars value={book.ratingAvg} /> <span className="muted">{book.ratingCount ? `${book.ratingAvg}/5 (${book.ratingCount} đánh giá)` : 'Chưa có đánh giá'}</span></p>
          <p className="big-price">{money(book.price)}</p>
          <p>{book.description}</p>
          <p className="muted">{book.stock > 0 ? `Còn ${book.stock} sản phẩm` : 'Tạm hết hàng'}</p>
          {book.stock > 0 && (
            <div className="row gap">
              <input type="number" min="1" max={book.stock} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} className="qty" />
              <button className="btn" onClick={() => add(false)}>Thêm vào giỏ</button>
              <button className="btn btn-ghost" onClick={() => add(true)}>Mua ngay</button>
            </div>
          )}
        </div>
      </div>

      <section className="panel">
        <h2>Đánh giá của độc giả</h2>
        {book.ratingCount > 0 && (
          <div className="breakdown">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="row gap small"><span>{n} sao</span>
                <div className="bar"><i style={{ width: `${(book.ratingBreakdown[n] / book.ratingCount) * 100}%` }} /></div>
                <span>{book.ratingBreakdown[n]}</span></div>
            ))}
          </div>
        )}
        {reviews.length === 0 ? <p className="muted">Chưa có đánh giá nào. Hãy mua và là người đầu tiên chia sẻ cảm nhận.</p> : reviews.map((r) => (
          <article key={r._id} className="review">
            <div className="row-between"><strong>{r.userName}</strong><span className="muted small">{dateTime(r.createdAt)}</span></div>
            <Stars value={r.rating} size={15} />
            <p>{r.comment}</p>
            {r.reply && <blockquote><strong>Nhà sách Lá phản hồi:</strong> {r.reply}</blockquote>}
          </article>
        ))}
      </section>
    </>
  );
}
