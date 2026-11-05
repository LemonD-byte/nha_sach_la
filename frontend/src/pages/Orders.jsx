import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useToast } from '../context/ToastContext';
import OrderTimeline from '../components/OrderTimeline';
import Stars from '../components/Stars';
import { money, dateTime, STATUS, PAYMENT } from '../api/format';

function ReviewForm({ order, item, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const send = async () => {
    try { await api.post('/reviews', { bookId: item.bookId, orderCode: order.orderCode, rating, comment }); toast('Cảm ơn bạn đã đánh giá'); onDone(); }
    catch (e) { toast(errMsg(e), 'err'); }
  };
  return (
    <div className="review-form">
      <Stars value={rating} onChange={setRating} size={22} />
      <textarea rows="2" placeholder="Chia sẻ cảm nhận của bạn về sản phẩm" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn" onClick={send}>Gửi đánh giá</button>
    </div>
  );
}

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [reviewed, setReviewed] = useState(new Set());
  const [open, setOpen] = useState(null);
  const [writing, setWriting] = useState(null);

  const load = () => Promise.all([api.get('/orders/my'), api.get('/reviews/my')]).then(([o, r]) => {
    setOrders(o.data);
    setReviewed(new Set(r.data.map((x) => `${x.orderCode}:${x.bookId}`)));
  });
  useEffect(() => { load(); }, []);

  const cancel = async (code) => {
    if (!confirm(`Hủy đơn ${code}?`)) return;
    try { await api.patch(`/orders/my/${code}/cancel`); toast('Đã hủy đơn hàng'); load(); } catch (e) { toast(errMsg(e), 'err'); }
  };

  if (!orders) return <p className="center muted">Đang tải…</p>;
  if (!orders.length) return <div className="center panel"><h2>Bạn chưa có đơn hàng nào</h2><Link to="/" className="btn">Mua sắm ngay</Link></div>;

  return (
    <>
      <h1>Đơn hàng của tôi</h1>
      {orders.map((o) => (
        <div key={o._id} className="panel">
          <div className="row-between">
            <div><strong>{o.orderCode}</strong> <span className="muted small">{dateTime(o.createdAt)}</span></div>
            <span className={`badge st-${o.status}`}>{STATUS[o.status]}</span>
          </div>
          {o.items.map((i) => (
            <div key={i.bookId} className="order-item">
              <div className="row-between"><Link to={`/books/${i.bookId}`}>{i.title} × {i.quantity}</Link><span>{money(i.price * i.quantity)}</span></div>
              {o.status === 'delivered' && (reviewed.has(`${o.orderCode}:${i.bookId}`)
                ? <span className="muted small">Đã đánh giá</span>
                : writing === `${o._id}:${i.bookId}`
                  ? <ReviewForm order={o} item={i} onDone={() => { setWriting(null); load(); }} />
                  : <button className="btn-link" onClick={() => setWriting(`${o._id}:${i.bookId}`)}>Viết đánh giá</button>)}
            </div>
          ))}
          <div className="row-between">
            <span className="small muted">{PAYMENT[o.paymentMethod]} · {o.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
            <strong>{money(o.totalAmount)}</strong>
          </div>
          <div className="row gap">
            <button className="btn-link" onClick={() => setOpen(open === o._id ? null : o._id)}>{open === o._id ? 'Ẩn chi tiết' : 'Xem chi tiết'}</button>
            {o.status === 'pending' && <button className="btn-link danger" onClick={() => cancel(o.orderCode)}>Hủy đơn</button>}
          </div>
          {open === o._id && (
            <div className="detail-box">
              <p className="small">Giao đến: {o.shippingInfo.receiverName} · {o.shippingInfo.phone} · {o.shippingInfo.address}</p>
              <OrderTimeline history={o.statusHistory} />
            </div>
          )}
        </div>
      ))}
    </>
  );
}
