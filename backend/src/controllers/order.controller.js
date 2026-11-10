const Order = require('../models/Order');
const Book = require('../models/Book');
const { ensureCart } = require('./auth.controller');
const { httpError, asyncHandler, nextSeq, pad } = require('../utils/helpers');
const vnpay = require('../utils/vnpay');
const { randomUUID } = require('node:crypto');

const restock = (order) => Promise.all(order.items.map((i) => Book.updateOne({ _id: i.bookId }, { $inc: { stock: i.quantity } })));
const log = (order, status, by, note = '') => order.statusHistory.push({ status, at: new Date(), by, note });

// Luồng trạng thái hợp lệ
const FLOW = { pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['delivered', 'cancelled'], delivered: [], cancelled: [] };

/* ---------- KHÁCH HÀNG ---------- */
async function createOrder(req, paymentMethod) {
  const { shippingInfo = {} } = req.body;
  if (!['COD', 'BANK', 'VNPAY'].includes(paymentMethod)) throw httpError(400, 'Phương thức thanh toán không hợp lệ');
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
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (paymentMethod === 'VNPAY' && (!Number.isSafeInteger(totalAmount * 100) || totalAmount <= 0)) throw httpError(400, 'Số tiền thanh toán không hợp lệ');

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

  let order;
  try {
    const code = `DH${pad(await nextSeq('orderCode', 3))}`;
    order = await Order.create({
      _id: code, orderCode: code, userId: req.user._id, handledBy: null, items,
      shippingInfo: { receiverName, phone, address }, paymentMethod, paymentStatus: 'unpaid',
      codAmount: paymentMethod === 'COD' ? totalAmount : 0, totalAmount, status: 'pending', deliveryAttempts: 0,
      ...(paymentMethod === 'VNPAY' ? { vnpTxnRef: code, vnpTxnRefs: [code], vnpExpiresAt: new Date(Date.now() + 15 * 60 * 1000) } : {}),
      statusHistory: [{ status: 'pending', at: new Date(), by: null, note: 'Khách đặt hàng' }],
    });
  } catch (error) {
    await restock({ items });
    throw error;
  }
  cart.items = [];
  await cart.save();
  return order;
}

exports.create = asyncHandler(async (req, res) => {
  const paymentMethod = req.body.paymentMethod || 'COD';
  if (paymentMethod === 'VNPAY') throw httpError(400, 'Vui lòng dùng chức năng thanh toán VNPAY');
  const order = await createOrder(req, paymentMethod);
  res.status(201).json(order);
});

exports.createPaymentUrl = asyncHandler(async (req, res) => {
  vnpay.config(); // Fail before reserving inventory if credentials are missing.
  const order = await createOrder(req, 'VNPAY');
  const payment = vnpay.createPayment(order, req.ip);
  res.status(201).json({ orderCode: order.orderCode, paymentUrl: payment.paymentUrl });
});

exports.retryPayment = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.code, userId: req.user._id });
  if (!order) throw httpError(404, 'Không tìm thấy đơn hàng');
  if (order.paymentMethod !== 'VNPAY' || order.paymentStatus !== 'unpaid' || order.status !== 'pending') {
    throw httpError(409, 'Chỉ thanh toán lại đơn VNPAY đang chờ và chưa thanh toán');
  }
  const payment = vnpay.createPayment({ orderCode: order.orderCode, totalAmount: order.totalAmount,
    vnpTxnRef: `${order.orderCode}A${randomUUID().replace(/-/g, '')}` }, req.ip);
  const updated = await Order.updateOne({ _id: order._id, userId: req.user._id, status: 'pending',
    paymentStatus: 'unpaid', vnpTxnRef: order.vnpTxnRef }, {
    $set: { vnpTxnRef: payment.txnRef, vnpExpiresAt: payment.expiresAt },
    $addToSet: { vnpTxnRefs: { $each: [order.vnpTxnRef, payment.txnRef] } },
  });
  if (!updated.modifiedCount) throw httpError(409, 'Đơn hàng vừa thay đổi, vui lòng tải lại');
  res.json({ orderCode: order.orderCode, paymentUrl: payment.paymentUrl });
});

// Both callbacks use one atomic state transition, including when they arrive concurrently.
async function processPayment(query) {
  if (!vnpay.verify(query) || query.vnp_TmnCode !== vnpay.config().VNP_TMN_CODE) return { RspCode: '97', Message: 'Invalid signature' };
  if (!/^[a-z\d]{1,100}$/i.test(query.vnp_TxnRef || '')) return { RspCode: '01', Message: 'Order not found' };
  const referenceFilter = { $or: [{ vnpTxnRef: query.vnp_TxnRef }, { vnpTxnRefs: query.vnp_TxnRef }] };
  const order = await Order.findOne({ ...referenceFilter, paymentMethod: 'VNPAY' });
  if (!order) return { RspCode: '01', Message: 'Order not found' };
  const result = { orderCode: order.orderCode };
  if (!/^\d+$/.test(query.vnp_Amount || '') || BigInt(query.vnp_Amount) !== BigInt(order.totalAmount * 100)) {
    return { ...result, RspCode: '04', Message: 'Invalid amount' };
  }
  if (order.paymentStatus === 'paid' || order.status !== 'pending') return { ...result, RspCode: '02', Message: 'Order already confirmed' };
  const success = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
  // An older tab may finish paying after retry. Accept its success, but never let
  // an old failure cancel the currently active payment attempt.
  if (!success && order.vnpTxnRef !== query.vnp_TxnRef) return { ...result, RspCode: '02', Message: 'Payment attempt superseded' };
  const now = new Date();
  const updated = await Order.findOneAndUpdate({ _id: order._id,
    ...(success ? referenceFilter : { vnpTxnRef: query.vnp_TxnRef }),
    paymentStatus: 'unpaid', status: 'pending' }, {
    $set: success ? { paymentStatus: 'paid', paidAt: now, vnpTransactionNo: query.vnp_TransactionNo,
      vnpBankCode: query.vnp_BankCode } : { status: 'cancelled' },
    $push: { statusHistory: { status: success ? 'pending' : 'cancelled', at: now, by: null,
      note: success ? 'Thanh toán VNPAY thành công' : `Thanh toán VNPAY thất bại hoặc bị hủy (${query.vnp_ResponseCode})` } },
  }, { new: true });
  if (!updated) return { ...result, RspCode: '02', Message: 'Order already confirmed' };
  if (!success) await restock(updated);
  return { ...result, RspCode: '00', Message: 'Confirm Success' };
}
exports.processPayment = processPayment;
exports.vnpayIpn = async (req, res) => {
  try {
    const { RspCode, Message } = await processPayment(req.query);
    res.json({ RspCode, Message });
  } catch (error) {
    console.error('VNPAY IPN:', error.message);
    res.json({ RspCode: '99', Message: 'Internal error' });
  }
};
exports.vnpayReturn = asyncHandler(async (req, res) => {
  const result = await processPayment(req.query);
  const url = new URL('/payment/result', vnpay.config().CLIENT_URL);
  url.searchParams.set('code', result.RspCode);
  if (result.orderCode) url.searchParams.set('orderCode', result.orderCode);
  res.redirect(url.toString());
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
  if (order.paymentMethod === 'VNPAY' && order.paymentStatus === 'paid') throw httpError(409, 'Đơn đã thanh toán, vui lòng liên hệ cửa hàng để hủy và hoàn tiền');
  const cancelled = await Order.findOneAndUpdate({ _id: order._id, status: 'pending', paymentStatus: order.paymentStatus, vnpTxnRef: order.vnpTxnRef }, {
    $set: { status: 'cancelled' }, $push: { statusHistory: { status: 'cancelled', at: new Date(), by: null, note: 'Khách hủy đơn' } },
  }, { new: true });
  if (!cancelled) throw httpError(409, 'Đơn hàng vừa thay đổi, vui lòng tải lại');
  await restock(cancelled);
  res.json(cancelled);
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
  if (order.paymentMethod === 'VNPAY' && order.paymentStatus !== 'paid' && status !== 'cancelled') throw httpError(409, 'Đơn VNPAY chưa thanh toán');
  if (order.paymentMethod === 'VNPAY' && order.paymentStatus === 'paid' && status === 'cancelled') throw httpError(409, 'Cần xử lý hoàn tiền trước khi hủy đơn VNPAY đã thanh toán');

  if (status === 'cancelled') {
    const cancelled = await Order.findOneAndUpdate({ _id: order._id, status: order.status, paymentStatus: order.paymentStatus }, {
      $set: { status, handledBy: req.user._id },
      $push: { statusHistory: { status, at: new Date(), by: req.user._id, note } },
    }, { new: true });
    if (!cancelled) throw httpError(409, 'Đơn hàng vừa thay đổi, vui lòng tải lại');
    await restock(cancelled);
    return res.json(cancelled);
  }

  order.status = status;
  order.handledBy = req.user._id;
  const now = new Date();
  if (status === 'shipping') { order.shippedAt = now; order.deliveryAttempts = 1; }
  if (status === 'delivered') {
    order.deliveredAt = now;
    if (order.paymentMethod === 'COD' && order.paymentStatus !== 'paid') { order.paymentStatus = 'paid'; order.paidAt = now; }
  }
  log(order, status, req.user._id, note);
  await order.save();
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
  if (order.paymentMethod === 'VNPAY') throw httpError(400, 'Thanh toán VNPAY chỉ được xác nhận bởi cổng thanh toán');
  order.paymentStatus = 'paid';
  order.paidAt = new Date();
  order.handledBy = order.handledBy || req.user._id;
  log(order, order.status, req.user._id, 'Xác nhận đã thanh toán');
  await order.save();
  res.json(order);
});
