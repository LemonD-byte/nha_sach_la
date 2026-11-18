const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { httpError } = require('./helpers');

const money = (n) => `${Number(n).toLocaleString('vi-VN')}₫`;
const normalizeCode = (code) => String(code ?? '').trim().toUpperCase();

/** Số tiền được giảm (làm tròn xuống, không vượt quá tiền hàng). */
function calcDiscount(coupon, subtotal) {
  let discount = coupon.discountType === 'percent'
    ? Math.floor((subtotal * coupon.discountValue) / 100)
    : coupon.discountValue;
  if (coupon.discountType === 'percent' && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  return Math.max(0, Math.min(discount, subtotal));
}

/** Trả về lý do không dùng được, hoặc null nếu hợp lệ. */
function rejectReason(coupon, subtotal, now = new Date()) {
  if (!coupon || !coupon.isActive) return 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng';
  if (coupon.startsAt && now < new Date(coupon.startsAt)) return 'Mã giảm giá chưa đến thời gian áp dụng';
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) return 'Mã giảm giá đã hết hạn';
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return 'Mã giảm giá đã hết lượt sử dụng';
  if (subtotal < coupon.minOrderAmount) return `Đơn hàng tối thiểu ${money(coupon.minOrderAmount)} để dùng mã này`;
  return null;
}

/** Kiểm tra mã cho một khách; ném lỗi 400 nếu không hợp lệ. */
async function validateCoupon(code, subtotal, userId, now = new Date()) {
  const normalized = normalizeCode(code);
  if (!normalized) throw httpError(400, 'Vui lòng nhập mã giảm giá');
  const coupon = await Coupon.findOne({ code: normalized });
  const reason = rejectReason(coupon, subtotal, now);
  if (reason) throw httpError(400, reason);
  if (coupon.perUserLimit > 0) {
    const used = await Order.countDocuments({ userId, couponCode: coupon.code, status: { $ne: 'cancelled' } });
    if (used >= coupon.perUserLimit) throw httpError(400, 'Bạn đã dùng hết lượt cho mã giảm giá này');
  }
  return { coupon, discountAmount: calcDiscount(coupon, subtotal) };
}

/** Giữ chỗ 1 lượt dùng (nguyên tử, không vượt usageLimit khi đặt cùng lúc). */
async function reserveCoupon(coupon, now = new Date()) {
  const r = await Coupon.updateOne({
    _id: coupon._id, isActive: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      { $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
    ],
  }, { $inc: { usedCount: 1 } });
  if (!r.modifiedCount) throw httpError(409, 'Mã giảm giá vừa hết lượt hoặc hết hạn, vui lòng kiểm tra lại');
}

/** Hoàn lại lượt dùng khi đơn bị hủy hoặc thanh toán thất bại. */
async function releaseCoupon(order) {
  if (!order?.couponCode) return;
  await Coupon.updateOne({ code: order.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}

module.exports = { normalizeCode, calcDiscount, rejectReason, validateCoupon, reserveCoupon, releaseCoupon };