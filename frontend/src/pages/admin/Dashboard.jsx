import { useEffect, useState } from 'react';
import api from '../../api/client';
import { money } from '../../api/format';

export default function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/stats').then((r) => setS(r.data)); }, []);
  if (!s) return <p className="muted">Đang tải…</p>;

  const tiles = [
    [`Doanh thu tháng ${s.month}/${s.year}`, money(s.revenue)],
    ['Sản phẩm đang bán', s.books],
    ['Khách hàng', s.customers],
    ['Đơn chờ xử lý', (s.orders.pending || 0) + (s.orders.confirmed || 0)],
  ];
  const yearTotal = s.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const yearOrders = s.monthlyRevenue.reduce((sum, m) => sum + m.orders, 0);

  return (
    <>
      <h1>Tổng quan</h1>
      <div className="tiles">{tiles.map(([k, v]) => <div key={k} className="tile"><span className="muted small">{k}</span><strong>{v}</strong></div>)}</div>

      <div className="two-col">
        <div className="panel"><h2>Sản phẩm bán chạy nhất tháng {s.month}/{s.year}</h2>
          {s.topBooks.length === 0 ? <p className="muted">Tháng này chưa có dữ liệu bán hàng.</p> : s.topBooks.map((b) => (
            <div key={b._id} className="row-between small"><span>{b.title}</span><span>{b.sold} cuốn · {money(b.revenue)}</span></div>))}
        </div>
        <div className="panel"><h2>Sắp hết hàng (tồn ≤ 10)</h2>
          {s.lowStock.length === 0 ? <p className="muted">Tồn kho đều ổn.</p> : s.lowStock.map((b) => <div key={b._id} className="row-between small"><span>{b.title}</span><strong>{b.stock}</strong></div>)}
        </div>
      </div>

      <div className="panel"><h2>Doanh thu theo tháng năm {s.year}</h2>
        <table className="table">
          <thead><tr><th>Tháng</th><th>Số đơn đã thu</th><th>Doanh thu</th></tr></thead>
          <tbody>
            {s.monthlyRevenue.map((m) => (
              <tr key={m.month} style={m.month === s.month ? { fontWeight: 700, background: 'var(--sage)' } : undefined}>
                <td>Tháng {m.month}</td>
                <td>{m.orders}</td>
                <td>{money(m.revenue)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td>Tổng cả năm</td><td>{yearOrders}</td><td>{money(yearTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}