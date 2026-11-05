import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { money } from '../api/format';

export default function Checkout() {
  const { user, refreshCart } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [cart, setCart] = useState(null);
  const [form, setForm] = useState({ receiverName: user.fullName, phone: user.phone || '', address: user.address || '' });
  const [paymentMethod, setPay] = useState('COD');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/cart').then((r) => setCart(r.data)); }, []);
  if (!cart) return <p className="center muted">Đang tải…</p>;
  if (!cart.items.length) { nav('/cart'); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/orders', { shippingInfo: form, paymentMethod });
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
          <label className="radio"><input type="radio" checked={paymentMethod === 'BANK'} onChange={() => setPay('BANK')} /> Chuyển khoản ngân hàng</label>
          {paymentMethod === 'BANK' && <p className="note">Sau khi đặt hàng, nhân viên sẽ liên hệ để cung cấp thông tin chuyển khoản và xác nhận thanh toán.</p>}
        </div>
        <aside className="panel summary">
          <h2>Đơn hàng của bạn</h2>
          {cart.items.map((i) => <div key={i.bookId} className="row-between small"><span>{i.book.title} × {i.quantity}</span><span>{money(i.book.price * i.quantity)}</span></div>)}
          <hr />
          <div className="row-between"><span>Tổng cộng</span><strong className="big-price">{money(cart.total)}</strong></div>
          <button className="btn block" disabled={busy}>{busy ? 'Đang xử lý…' : 'Xác nhận đặt hàng'}</button>
        </aside>
      </form>
    </>
  );
}
