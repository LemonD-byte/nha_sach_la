import { useEffect, useState } from 'react';
import api from '../../api/client';
import { money, STATUS } from '../../api/format';

export default function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/stats').then((r) => setS(r.data)); }, []);
  if (!s) return <p className="muted">Đang tải…</p>;
  const tiles = [
    ['Doanh thu đã thu', money(s.revenue)], ['Sản phẩm đang bán', s.books], ['Khách hàng', s.customers],
    ['Đơn chờ xử lý', (s.orders.pending || 0) + (s.orders.confirmed || 0)],
  ];
  return (
    <>
      <h1>Tổng quan</h1>
      <div className="tiles">{tiles.map(([k, v]) => <div key={k} className="tile"><span className="muted small">{k}</span><strong>{v}</strong></div>)}</div>
      <div className="two-col">
        <div className="panel"><h2>Đơn hàng theo trạng thái</h2>
          {Object.keys(STATUS).map((k) => <div key={k} className="row-between"><span className={`badge st-${k}`}>{STATUS[k]}</span><strong>{s.orders[k] || 0}</strong></div>)}
        </div>
        <div className="panel"><h2>Bán chạy nhất</h2>
          {s.topBooks.length === 0 ? <p className="muted">Chưa có dữ liệu bán hàng.</p> : s.topBooks.map((b) => (
            <div key={b._id} className="row-between small"><span>{b.title}</span><span>{b.sold} cuốn · {money(b.revenue)}</span></div>))}
        </div>
      </div>
      <div className="panel"><h2>Sắp hết hàng (tồn ≤ 10)</h2>
        {s.lowStock.length === 0 ? <p className="muted">Tồn kho đều ổn.</p> : s.lowStock.map((b) => <div key={b._id} className="row-between small"><span>{b.title}</span><strong>{b.stock}</strong></div>)}
      </div>
    </>
  );
}
