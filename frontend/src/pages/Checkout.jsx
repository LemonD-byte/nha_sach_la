import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { money, couponLabel } from '../api/format';

export default function Checkout() {
  const { user, refreshCart } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [cart, setCart] = useState(null);
  const [form, setForm] = useState({ receiverName: user.fullName, phone: user.phone || '', address: user.address || '' });
  const [paymentMethod, setPay] = useState('COD');
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState(null);   // kết quả /coupons/validate
  const [available, setAvailable] = useState([]);
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    api.get('/cart').then((r) => setCart(r.data));
    api.get('/coupons/available').then((r) => setAvailable(r.data)).catch(() => {});
  }, []);
  const applyCoupon = async (code) => {
    if (!code.trim()) return;
    setCouponBusy(true);
    try {
      const { data } = await api.post('/coupons/validate', { code });
      setApplied(data); setCouponInput('');
      toast(`Đã áp dụng mã ${data.code}`);
    } catch (err) { setApplied(null); toast(errMsg(err), 'err'); } finally { setCouponBusy(false); }
  };
  if (!cart) return <p className="center muted">Đang tải…</p>;
  if (!cart.items.length) { nav('/cart'); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(paymentMethod === 'VNPAY' ? '/orders/create_payment_url' : '/orders', { shippingInfo: form, paymentMethod, couponCode: applied?.code });
      if (paymentMethod === 'VNPAY') { window.location.href = data.paymentUrl; return; }
      await refreshCart();
      toast(`Đặt hàng thành công — mã đơn ${data.orderCode}`);
      nav('/orders');
    } catch (err) { toast(errMsg(err), 'err'); } finally { setBusy(false); }
  };
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), required: true });

  return (
    <>
      <h1>Đặt hàng</h1>
      <form className="two-col" onSubmit={submit}>
        <div className="panel">
          <h2>Thông tin nhận hàng</h2>
          <label>Người nhận<input {...f('receiverName')} /></label>
          <label>Số điện thoại<input {...f('phone')} pattern="[0-9]{9,11}" title="Số điện thoại 9–11 chữ số" /></label>
          <label>Địa chỉ giao hàng<textarea rows="3" {...f('address')} /></label>
          <h2>Phương thức thanh toán</h2>
          <label className="radio"><input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPay('COD')} /> Thanh toán khi nhận hàng (COD)</label>
          <label className="radio"><input type="radio" checked={paymentMethod === 'VNPAY'} onChange={() => setPay('VNPAY')} /> Thanh toán qua VNPAY (thẻ hoặc QR)</label>
          {paymentMethod === 'VNPAY' && <p className="note">Bạn sẽ được chuyển đến VNPAY để thanh toán. Giao dịch có hiệu lực 15 phút. Nếu bỏ dở, bạn có thể thanh toán lại trong Đơn hàng của tôi.</p>}
        </div>
        <aside className="panel summary">
          <h2>Đơn hàng của bạn</h2>
          {cart.items.map((i) => <div key={i.bookId} className="row-between small"><span>{i.book.title} × {i.quantity}</span><span>{money(i.book.price * i.quantity)}</span></div>)}
          <hr />
          <h3>Mã giảm giá</h3>
          {applied ? (
            <div className="coupon-applied">
              <span><strong>{applied.code}</strong> <span className="small muted">{applied.description}</span></span>
              <button type="button" className="btn-link danger" onClick={() => setApplied(null)}>Bỏ mã</button>
            </div>
          ) : (
            <div className="row gap">
              <input className="grow" placeholder="Nhập mã giảm giá" value={couponInput} style={{ textTransform: 'uppercase' }}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(couponInput); } }} />
              <button type="button" className="btn btn-ghost" disabled={couponBusy || !couponInput.trim()} onClick={() => applyCoupon(couponInput)}>Áp dụng</button>
            </div>
          )}
          {!applied && available.length > 0 && (
            <div className="coupon-list">
              {available.map((c) => (
                <button type="button" key={c.code} className="coupon-card" disabled={!c.eligible || couponBusy} onClick={() => applyCoupon(c.code)}>
                  <strong>{c.code}</strong> · {couponLabel(c)}
                  <span className="small muted">{c.eligible ? c.description : c.reason}</span>
                </button>
              ))}
            </div>
          )}
          <hr />
          <div className="row-between"><span>Tạm tính</span><span>{money(cart.total)}</span></div>
          {applied && <div className="row-between"><span>Giảm giá ({applied.code})</span><span className="discount">− {money(applied.discountAmount)}</span></div>}
          <div className="row-between"><span>Tổng cộng</span><strong className="big-price">{money(cart.total - (applied?.discountAmount || 0))}</strong></div>
          <button className="btn block" disabled={busy}>{busy ? 'Đang xử lý…' : 'Xác nhận đặt hàng'}</button>
        </aside>
      </form>
    </>
  );
}