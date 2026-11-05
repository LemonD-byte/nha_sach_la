const Order = require('../models/Order');
const Book = require('../models/Book');
const { ensureCart } = require('./auth.controller');
const { httpError, asyncHandler, nextSeq, pad } = require('../utils/helpers');

const restock = (order) => Promise.all(order.items.map((i) => Book.updateOne({ _id: i.bookId }, { $inc: { stock: i.quantity } })));
const log = (order, status, by, note = '') => order.statusHistory.push({ status, at: new Date(), by, note });

// Luồng trạng thái hợp lệ
const FLOW = { pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['delivered', 'cancelled'], delivered: [], cancelled: [] };

/* ---------- KHÁCH HÀNG ---------- */
exports.create = asyncHandler(async (req, res) => {
  const { shippingInfo = {}, paymentMethod = 'COD' } = req.body;
  if (!['COD', 'BANK'].includes(paymentMethod)) throw httpError(400, 'Phương thức thanh toán không hợp lệ');
  const { receiverName, phone, address } = shippingInfo;
  if (!receiverName || !phone || !address) throw httpError(400, 'Vui lòng nhập đủ thông tin nhận hàng');

  const cart = await ensureCart(req.user._id);
  if (!cart.items.length) throw httpError(400, 'Giỏ hàng đang trống');
  const books = await Book.find({ _id: { $in: cart.items.map((i) => i.bookId) }, isActive: true });
  const map = new Map(books.map((b) => [b._id, b]));
  const items = cart.items.map((i) => {
    const b = map.get(i.bookId);
    if (!b) throw httpError(409, 'Có sản phẩm trong giỏ không còn được bán, vui lòng xóa khỏi giỏ');
    return { bookId: b._id, title: b.title, price: b.price, quantity: i.quantity };
  });

  // Trừ kho nguyên tử; nếu thiếu hàng thì hoàn lại những dòng đã trừ
  const reserved = [];
  try {
    for (const it of items) {
      const r = await Book.updateOne({ _id: it.bookId, stock: { $gte: it.quantity } }, { $inc: { stock: -it.quantity } });
      if (!r.modifiedCount) throw httpError(409, `"${it.title}" không đủ hàng trong kho`);
      reserved.push(it);
    }
  } catch (e) {
    await Promise.all(reserved.map((it) => Book.updateOne({ _id: it.bookId }, { $inc: { stock: it.quantity } })));
    throw e;
  }

  const code = `DH${pad(await nextSeq('orderCode', 3))}`;
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const order = await Order.create({
    _id: code, orderCode: code, userId: req.user._id, handledBy: null, items,
    shippingInfo: { receiverName, phone, address }, paymentMethod, paymentStatus: 'unpaid',
    codAmount: paymentMethod === 'COD' ? totalAmount : 0, totalAmount, status: 'pending', deliveryAttempts: 0,
    statusHistory: [{ status: 'pending', at: new Date(), by: null, note: 'Khách đặt hàng' }],
  });
  cart.items = [];
  await cart.save();
  res.status(201).json(order);
});

exports.mine = asyncHandler(async (req, res) => res.json(await Order.find({ userId: req.user._id }).sort({ createdAt: -1 })));

exports.mineOne = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.code, userId: req.user._id });
  if (!order) throw httpError(404, 'Không tìm thấy đơn hàng');
  res.json(order);
});

exports.cancelMine = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.code, userId: req.user._id });
  if (!order) throw httpError(404, 'Không tìm thấy đơn hàng');
  if (order.status !== 'pending') throw httpError(400, 'Chỉ hủy được đơn đang chờ xác nhận');
  order.status = 'cancelled';
  log(order, 'cancelled', null, 'Khách hủy đơn');
  await order.save();
  await restock(order);
  res.json(order);
});

/* ---------- NHÂN VIÊN / ADMIN ---------- */
exports.list = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.$or = [{ orderCode: new RegExp(q, 'i') }, { 'shippingInfo.receiverName': new RegExp(q, 'i') }, { 'shippingInfo.phone': new RegExp(q, 'i') }];
  res.json(await Order.find(filter).sort({ createdAt: -1 }).limit(300));
});

exports.get = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.code);
  if (!order) throw httpError(404, 'Không tìm thấy đơn hàng');
  res.json(order);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  const order = await Order.findById(req.params.code);
  if (!order) throw httpError(404, 'Không tìm thấy đơn hàng');
  if (!FLOW[order.status].includes(status)) throw httpError(400, `Không thể chuyển từ "${order.status}" sang "${status}"`);

  order.status = status;
  order.handledBy = req.user._id;
  const now = new Date();
  if (status === 'shipping') { order.shippedAt = now; order.deliveryAttempts = 1; }
  if (status === 'delivered') {
    order.deliveredAt = now;
    if (order.paymentStatus !== 'paid') { order.paymentStatus = 'paid'; order.paidAt = now; } // COD thu tiền khi giao
  }
  log(order, status, req.user._id, note);
  await order.save();
  if (status === 'cancelled') await restock(order);
  res.json(order);
});

exports.deliveryFailed = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.code);
  if (!order || order.status !== 'shipping') throw httpError(400, 'Đơn không ở trạng thái đang giao');
  order.deliveryAttempts += 1;
  log(order, 'shipping', req.user._id, req.body.note || `Giao thất bại, giao lại lần ${order.deliveryAttempts}`);
  await order.save();
  res.json(order);
});

exports.markPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.code);
  if (!order || order.status === 'cancelled') throw httpError(400, 'Không thể xác nhận thanh toán cho đơn này');
  order.paymentStatus = 'paid';
  order.paidAt = new Date();
  order.handledBy = order.handledBy || req.user._id;
  log(order, order.status, req.user._id, 'Xác nhận đã thanh toán');
  await order.save();
  res.json(order);
});
