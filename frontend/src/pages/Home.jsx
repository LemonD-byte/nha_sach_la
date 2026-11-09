import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import BookCard from '../components/BookCard';
import { getRecent, removeRecent } from '../api/recent';

const GROUPS = [
  ['Sách', '📚', 'Văn học, kinh tế, thiếu nhi, công nghệ'],
  ['Dụng cụ học tập', '✏️', 'Vở, bút, máy tính Casio'],
  ['Đồ chơi', '🧩', 'Xếp hình, cờ vua, cờ tướng'],
];

function Shelf({ title, params, to }) {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get('/books', { params: { limit: 5, ...params } }).then((r) => setItems(r.data.items)); }, []); // eslint-disable-line
  if (items && items.length === 0) return null;
  return (
    <section className="shelf">
      <div className="shelf-head"><h2>{title}</h2><Link to={to}>Xem tất cả</Link></div>
      {items ? <div className="grid grid-5">{items.map((b) => <BookCard key={b._id} book={b} />)}</div> : <p className="muted">Đang tải…</p>}
    </section>
  );
}

/** “Đã xem gần đây”: id lấy từ localStorage, thông tin lấy bằng GET /books/:id; id nào không còn thì bỏ qua */
function RecentShelf() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const ids = getRecent();
    if (!ids.length) return;
    Promise.allSettled(ids.map((id) => api.get(`/books/${id}`))).then((rs) => {
      rs.forEach((r, i) => { if (r.status === 'rejected' && r.reason?.response?.status === 404) removeRecent(ids[i]); });
      setItems(rs.filter((r) => r.status === 'fulfilled').map((r) => r.value.data));
    });
  }, []);
  if (items.length === 0) return null;
  return (
    <section className="shelf">
      <div className="shelf-head"><h2>Đã xem gần đây</h2></div>
      <div className="grid grid-5">{items.map((b) => <BookCard key={b._id} book={b} />)}</div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <section className="banner">
        <div className="banner-text">
          <h1>Mỗi cuốn sách là một chiếc lá trong khu vườn tri thức</h1>
          <p>Sách hay, dụng cụ học tập và đồ chơi sáng tạo — giao tận nơi, thanh toán linh hoạt.</p>
          <Link to="/books" className="btn btn-gold">Khám phá cửa hàng</Link>
        </div>
        <div className="banner-art" aria-hidden>🍃</div>
      </section>

      <section className="group-tiles">
        {GROUPS.map(([g, icon, desc]) => (
          <Link key={g} to={`/books?group=${encodeURIComponent(g)}`} className="group-tile">
            <span className="group-icon">{icon}</span>
            <div><strong>{g}</strong><div className="muted small">{desc}</div></div>
          </Link>
        ))}
      </section>

      <RecentShelf />

      <Shelf title="Sản phẩm mới" params={{ sort: 'newest' }} to="/books?sort=newest" />
      <Shelf title="Được đánh giá cao" params={{ sort: 'rating', minRating: 4 }} to="/books?sort=rating&minRating=4" />
      <Shelf title="Sách" params={{ group: 'Sách' }} to="/books?group=Sách" />
      <Shelf title="Dụng cụ học tập" params={{ group: 'Dụng cụ học tập' }} to="/books?group=Dụng cụ học tập" />
      <Shelf title="Đồ chơi" params={{ group: 'Đồ chơi' }} to="/books?group=Đồ chơi" />
    </>
  );
}
