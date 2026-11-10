import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { money } from '../api/format';

export default function VnpayReturn() {
  const [params] = useSearchParams();
  const code = params.get('orderCode');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setOrder(null);
    setError('');
    if (!code) { setError('Không xác thực được kết quả thanh toán. Vui lòng kiểm tra đơn hàng.'); return; }
    api.get(`/orders/my/${encodeURIComponent(code)}`)
      .then(({ data }) => { if (active) setOrder(data); })
      .catch((e) => { if (active) setError(errMsg(e)); });
    return () => { active = false; };
  }, [code]);
  // Read payment state and amount from the authenticated API, never from URL flags.
  const paid = order?.paymentMethod === 'VNPAY' && order.paymentStatus === 'paid';
  return <div className="panel center" aria-live="polite">
    <h1>{error ? 'Không thể xác nhận thanh toán' : !order ? 'Đang kiểm tra thanh toán…' : paid ? 'Thanh toán VNPAY thành công' : order.status === 'cancelled' ? 'Thanh toán thất bại hoặc đã hủy' : 'Chưa ghi nhận thanh toán'}</h1>
    {error && <p role="alert">{error}</p>}
    {order && <>
      <p>Mã đơn: <strong>{order.orderCode}</strong></p>
      <p>Số tiền: <strong>{money(order.totalAmount)}</strong></p>
      <p>{paid ? 'Đơn hàng đang chờ cửa hàng xác nhận.' : order.status === 'cancelled' ? 'Đơn hàng đã hủy và sản phẩm được hoàn kho.' : 'Bạn có thể kiểm tra và thanh toán lại trong Đơn hàng của tôi.'}</p>
    </>}
    <Link to="/orders" className="btn">Xem đơn hàng</Link>
  </div>;
}
