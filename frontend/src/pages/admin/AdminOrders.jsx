import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import OrderTimeline from '../../components/OrderTimeline';
import { money, dateTime, STATUS, PAYMENT } from '../../api/format';

const NEXT = { pending: [['confirmed', 'Xác nhận đơn']], confirmed: [['shipping', 'Bắt đầu giao']], shipping: [['delivered', 'Giao thành công']] };

export default function AdminOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);

  const load = () => api.get('/orders', { params: { status, q } }).then((r) => setOrders(r.data));
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  const act = async (req, msg) => {
    try { const { data } = await req; toast(msg); setSel(data); load(); } catch (e) { toast(errMsg(e), 'err'); }
  };
  const code = sel?.orderCode;

  return (
    <>
      <h1>Đơn hàng</h1>
      <div className="row gap wrap">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="row gap">
          <input placeholder="Mã đơn, tên hoặc SĐT" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-ghost">Tìm</button>
        </form>
      </div>
      <table className="table">
        <thead><tr><th>Mã đơn</th><th>Người nhận</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>{orders.map((o) => (
          <tr key={o._id}>
            <td><strong>{o.orderCode}</strong></td><td>{o.shippingInfo.receiverName}</td><td>{dateTime(o.createdAt)}</td>
            <td>{money(o.totalAmount)}</td><td>{o.paymentMethod} · {o.paymentStatus === 'paid' ? 'đã thu' : 'chưa thu'}</td>
            <td><span className={`badge st-${o.status}`}>{STATUS[o.status]}</span></td>
            <td><button className="btn-link" onClick={() => setSel(o)}>Chi tiết</button></td>
          </tr>))}
        </tbody>
      </table>
      {orders.length === 0 && <p className="muted center">Không có đơn hàng.</p>}

      {sel && (
        <Modal title={`Đơn ${code}`} onClose={() => setSel(null)}>
          <p><span className={`badge st-${sel.status}`}>{STATUS[sel.status]}</span> · {PAYMENT[sel.paymentMethod]} · {sel.paymentStatus === 'paid' ? `Đã thanh toán (${dateTime(sel.paidAt)})` : 'Chưa thanh toán'}</p>
          <p className="small">Giao đến: {sel.shippingInfo.receiverName} · {sel.shippingInfo.phone} · {sel.shippingInfo.address}</p>
          {sel.items.map((i) => <div key={i.bookId} className="row-between small"><span>{i.title} × {i.quantity}</span><span>{money(i.price * i.quantity)}</span></div>)}
          <div className="row-between"><span>Thu hộ (COD): {money(sel.codAmount)}</span><strong>{money(sel.totalAmount)}</strong></div>
          {sel.status === 'shipping' && <p className="small muted">Số lần giao: {sel.deliveryAttempts}</p>}
          <OrderTimeline history={sel.statusHistory} />
          <div className="row gap wrap">
            {(NEXT[sel.status] || []).map(([s, label]) => <button key={s} className="btn" onClick={() => act(api.patch(`/orders/${code}/status`, { status: s }), label + ' thành công')}>{label}</button>)}
            {sel.status === 'shipping' && <button className="btn btn-ghost" onClick={() => act(api.patch(`/orders/${code}/delivery-failed`, {}), 'Đã ghi nhận giao thất bại')}>Giao thất bại</button>}
            {sel.paymentStatus === 'unpaid' && sel.status !== 'cancelled' && <button className="btn btn-ghost" onClick={() => act(api.patch(`/orders/${code}/pay`), 'Đã xác nhận thanh toán')}>Xác nhận đã thanh toán</button>}
            {['pending', 'confirmed', 'shipping'].includes(sel.status) && <button className="btn btn-danger" onClick={() => { const note = prompt('Lý do hủy đơn?'); if (note !== null) act(api.patch(`/orders/${code}/status`, { status: 'cancelled', note }), 'Đã hủy đơn'); }}>Hủy đơn</button>}
          </div>
        </Modal>
      )}
    </>
  );
}
