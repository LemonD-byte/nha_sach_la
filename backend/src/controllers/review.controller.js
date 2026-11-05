const Review = require('../models/Review');
const Order = require('../models/Order');
const Book = require('../models/Book');
const User = require('../models/User');
const { httpError, asyncHandler, nextSeq, pad } = require('../utils/helpers');

/** Tính lại ratingAvg / ratingCount / ratingBreakdown của sách từ các đánh giá đang hiển thị */
async function recalc(bookId) {
  const rows = await Review.find({ bookId, status: 'visible' });
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rows.forEach((r) => breakdown[r.rating]++);
  const count = rows.length;
  const avg = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  await Book.updateOne({ _id: bookId }, { ratingAvg: avg, ratingCount: count, ratingBreakdown: breakdown });
}

const withUsers = async (reviews) => {
  const users = await User.find({ _id: { $in: reviews.map((r) => r.userId) } });
  const name = new Map(users.map((u) => [u._id, u.fullName]));
  return reviews.map((r) => ({ ...r.toObject(), userName: name.get(r.userId) || 'Khách hàng' }));
};

exports.byBook = asyncHandler(async (req, res) =>
  res.json(await withUsers(await Review.find({ bookId: req.params.bookId, status: 'visible' }).sort({ createdAt: -1 }))));

exports.mine = asyncHandler(async (req, res) => res.json(await Review.find({ userId: req.user._id })));

exports.create = asyncHandler(async (req, res) => {
  const { bookId, orderCode, rating, comment = '' } = req.body;
  if (!(rating >= 1 && rating <= 5)) throw httpError(400, 'Điểm đánh giá từ 1 đến 5');
  const order = await Order.findOne({ _id: orderCode, userId: req.user._id });
  if (!order || order.status !== 'delivered') throw httpError(400, 'Chỉ đánh giá được sản phẩm của đơn đã giao');
  if (!order.items.some((i) => i.bookId === bookId)) throw httpError(400, 'Sản phẩm không thuộc đơn hàng này');
  if (await Review.exists({ bookId, orderCode, userId: req.user._id })) throw httpError(409, 'Bạn đã đánh giá sản phẩm này rồi');
  const review = await Review.create({ _id: `RV${pad(await nextSeq('reviewCode', 2))}`, bookId, orderCode, userId: req.user._id, rating, comment });
  await recalc(bookId);
  res.status(201).json(review);
});

/* Nhân viên / admin */
exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(300);
  const books = await Book.find({ _id: { $in: reviews.map((r) => r.bookId) } });
  const title = new Map(books.map((b) => [b._id, b.title]));
  res.json((await withUsers(reviews)).map((r) => ({ ...r, bookTitle: title.get(r.bookId) })));
});

exports.reply = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { reply: req.body.reply || null }, { new: true });
  if (!review) throw httpError(404, 'Không tìm thấy đánh giá');
  res.json(review);
});

exports.setStatus = asyncHandler(async (req, res) => {
  if (!['visible', 'hidden'].includes(req.body.status)) throw httpError(400, 'Trạng thái không hợp lệ');
  const review = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!review) throw httpError(404, 'Không tìm thấy đánh giá');
  await recalc(review.bookId);
  res.json(review);
});
