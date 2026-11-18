export const money = (n) => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;
export const dateTime = (d) => (d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export const STATUS = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
};
export const PAYMENT = { COD: 'Thanh toán khi nhận hàng', BANK: 'Chuyển khoản', VNPAY: 'Thanh toán qua VNPAY' };
// Nhãn ngắn của ưu đãi: "Giảm 10% (tối đa 30.000 ₫)" / "Giảm 20.000 ₫"
export const couponLabel = (c) => c.discountType === 'percent'
  ? `Giảm ${c.discountValue}%${c.maxDiscount > 0 ? ` (tối đa ${money(c.maxDiscount)})` : ''}`
  : `Giảm ${money(c.discountValue)}`;
export const ROLE = { admin: 'Quản trị viên', staff: 'Nhân viên', customer: 'Khách hàng' };
