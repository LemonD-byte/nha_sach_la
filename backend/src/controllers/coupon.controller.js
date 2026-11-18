const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const Book = require('../models/Book');
const { ensureCart } = require('./auth.controller');
const { httpError, asyncHandler, nextSeq, pad } = require('../utils/helpers');
const { normalizeCode, calcDiscount, rejectReason, validateCoupon } = require('../utils/coupon');

/* ---------- KHÁCH HÀNG ---------- */
async function cartSubtotal(userId) {
  const cart = await ensureCart(userId);
  const books = await Book.find({ _id: { $in: cart.items.map((i) => i.bookId) }, isActive: true });
  const price = new Map(books.map((b) => [b._id, b.price]));
  return cart.items.reduce((s, i) => s + (price.get(i.bookId) || 0) * i.quantity, 0);
}

exports.validate = asyncHandler(async (req, res) => {
  const subtotal = await cartSubtotal(req.user._id);
  if (!subtotal) throw httpError(400, 'Giỏ hàng đang trống');
  const { coupon, discountAmount } = await validateCoupon(req.body.code, subtotal, req.user._id);
  res.json({
    code: coupon.code, description: coupon.description, discountType: coupon.discountType,
    subtotal, discountAmount, total: subtotal - discountAmount,
  });
});

exports.available = asyncHandler(async (req, res) => {
  const now = new Date();
  const subtotal = await cartSubtotal(req.user._id);
  const coupons = await Coupon.find({
    isActive: true, isPublic: true,
    $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] }],
  }).sort({ createdAt: -1 });
  const usedByMe = await Order.aggregate([
    { $match: { userId: req.user._id, couponCode: { $in: coupons.map((c) => c.code) }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$couponCode', n: { $sum: 1 } } },
  ]);
  const used = new Map(usedByMe.map((u) => [u._id, u.n]));
  res.json(coupons
    .filter((c) => !(c.usageLimit > 0 && c.usedCount >= c.usageLimit))
    .map((c) => {
      let reason = rejectReason(c, subtotal, now);
      if (!reason && c.perUserLimit > 0 && (used.get(c.code) || 0) >= c.perUserLimit) reason = 'Bạn đã dùng hết lượt cho mã này';
      return {
        code: c.code, description: c.description, discountType: c.discountType, discountValue: c.discountValue,
        maxDiscount: c.maxDiscount, minOrderAmount: c.minOrderAmount, expiresAt: c.expiresAt,
        eligible: !reason, reason, discountAmount: reason ? 0 : calcDiscount(c, subtotal),
      };
    }));
});

/* ---------- ADMIN ---------- */
const num = (v, name, { min = 0, integer = true } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || (integer && !Number.isInteger(n))) throw httpError(400, `${name} không hợp lệ`);
  return n;
};
const date = (v, name) => {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw httpError(400, `${name} không hợp lệ`);
  return d;
};

function parseBody(b) {
  const out = {};
  if (b.description !== undefined) out.description = String(b.description).trim();
  if (b.discountType !== undefined) {
    if (!['percent', 'fixed'].includes(b.discountType)) throw httpError(400, 'Loại giảm giá không hợp lệ');
    out.discountType = b.discountType;
  }
  if (b.discountValue !== undefined) out.discountValue = num(b.discountValue, 'Giá trị giảm', { min: 1 });
  if (b.maxDiscount !== undefined) out.maxDiscount = num(b.maxDiscount || 0, 'Mức giảm tối đa');
  if (b.minOrderAmount !== undefined) out.minOrderAmount = num(b.minOrderAmount || 0, 'Đơn tối thiểu');
  if (b.usageLimit !== undefined) out.usageLimit = num(b.usageLimit || 0, 'Giới hạn lượt dùng');
  if (b.perUserLimit !== undefined) out.perUserLimit = num(b.perUserLimit || 0, 'Giới hạn mỗi khách');
  if (b.startsAt !== undefined) out.startsAt = date(b.startsAt, 'Ngày bắt đầu');
  if (b.expiresAt !== undefined) out.expiresAt = date(b.expiresAt, 'Ngày hết hạn');
  if (b.isPublic !== undefined) out.isPublic = !!b.isPublic;
  if (b.isActive !== undefined) out.isActive = !!b.isActive;
  return out;
}

function assertConsistent(c) {
  if (c.discountType === 'percent' && (c.discountValue < 1 || c.discountValue > 100)) throw httpError(400, 'Giảm theo % phải từ 1 đến 100');
  if (c.startsAt && c.expiresAt && new Date(c.expiresAt) <= new Date(c.startsAt)) throw httpError(400, 'Ngày hết hạn phải sau ngày bắt đầu');
  if (c.usageLimit > 0 && c.usageLimit < (c.usedCount || 0)) throw httpError(400, `Giới hạn lượt dùng không được nhỏ hơn số lượt đã dùng (${c.usedCount})`);
}

exports.list = asyncHandler(async (_req, res) => res.json(await Coupon.find().sort({ createdAt: -1 })));

exports.create = asyncHandler(async (req, res) => {
  const code = normalizeCode(req.body.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw httpError(400, 'Mã gồm 3–30 ký tự chữ, số, gạch ngang hoặc gạch dưới');
  if (!req.body.discountType || req.body.discountValue === undefined) throw httpError(400, 'Vui lòng chọn loại và giá trị giảm');
  const data = { ...parseBody(req.body), code };
  assertConsistent(data);
  if (await Coupon.exists({ code })) throw httpError(409, 'Mã giảm giá đã tồn tại');
  const last = await Coupon.findOne({ _id: /^CP\d+$/ }).sort({ _id: -1 });
  const seed = last ? Number(last._id.slice(2)) : 0;
  const _id = `CP${pad(await nextSeq('couponCode', seed))}`;
  res.status(201).json(await Coupon.create({ ...data, _id, createdBy: req.user._id }));
});

exports.update = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw httpError(404, 'Không tìm thấy mã giảm giá');
  const data = parseBody(req.body); // không cho đổi `code` vì đơn cũ đã lưu mã này
  assertConsistent({ ...coupon.toObject(), ...data });
  Object.assign(coupon, data);
  await coupon.save();
  res.json(coupon);
});

exports.remove = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw httpError(404, 'Không tìm thấy mã giảm giá');
  if (coupon.usedCount > 0 || (await Order.exists({ couponCode: coupon.code }))) {
    coupon.isActive = false; // đã có đơn dùng: giữ lại để tra cứu, chỉ tắt
    await coupon.save();
    return res.json({ message: 'Mã đã được dùng trong đơn hàng nên chỉ bị tắt', deactivated: true });
  }
  await coupon.deleteOne();
  res.json({ message: 'Đã xóa mã giảm giá' });
});