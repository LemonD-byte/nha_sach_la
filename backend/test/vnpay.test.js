const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Order = require('../src/models/Order');
const Book = require('../src/models/Book');
const User = require('../src/models/User');
const helpers = require('../src/utils/helpers');
const authController = require('../src/controllers/auth.controller');
const vnpay = require('../src/utils/vnpay');

Object.assign(process.env, { VNP_TMN_CODE: 'TESTSHOP', VNP_HASH_SECRET: 'test-secret',
  VNP_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  VNP_RETURN_URL: 'http://localhost:5000/api/orders/vnpay_return', CLIENT_URL: 'http://localhost:5173' });

let orders, stock, cart, sequence, server, base, token;
const copy = (value) => structuredClone(value);
function matches(order, filter) {
  return Object.entries(filter).every(([key, value]) => key === '$or'
    ? value.some((branch) => matches(order, branch))
    : Array.isArray(order[key]) ? order[key].includes(value) : order[key] === value);
}
function update(filter, changes) {
  const order = orders.find((entry) => matches(entry, filter));
  if (!order) return null;
  Object.assign(order, changes.$set);
  for (const [key, value] of Object.entries(changes.$push || {})) (order[key] ||= []).push(value);
  for (const [key, value] of Object.entries(changes.$addToSet || {})) order[key] = [...new Set([...(order[key] || []), ...value.$each])];
  return copy(order);
}
helpers.nextSeq = async () => ++sequence;
authController.ensureCart = async () => cart;
const controller = require('../src/controllers/order.controller');

before(async () => {
  const app = require('../src/app');
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/orders`;
  token = require('../src/middleware/auth').signToken({ _id: 'customer1', role: 'customer' });
});
after(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => {
  sequence = 3;
  stock = 8;
  orders = [{ _id: 'DH0007', orderCode: 'DH0007', userId: 'customer1', paymentMethod: 'VNPAY',
    paymentStatus: 'unpaid', totalAmount: 100000, codAmount: 0, status: 'pending',
    vnpTxnRef: 'DH0007', vnpTxnRefs: ['DH0007'], items: [{ bookId: 'SP0001', quantity: 2 }], statusHistory: [] }];
  cart = { items: [{ bookId: 'SP0001', quantity: 2 }], save: async () => {} };
  User.findById = async () => ({ _id: 'customer1', role: 'customer', status: 'active' });
  Order.findOne = async (filter) => copy(orders.find((order) => matches(order, filter)) || null);
  Order.findById = async (id) => copy(orders.find((order) => order._id === id) || null);
  Order.findOneAndUpdate = async (filter, changes) => update(filter, changes);
  Order.updateOne = async (filter, changes) => ({ modifiedCount: update(filter, changes) ? 1 : 0 });
  Order.create = async (order) => { orders.push(copy(order)); return copy(order); };
  Book.find = async () => [{ _id: 'SP0001', title: 'Sách thử', price: 50000 }];
  Book.updateOne = async (filter, changes) => {
    if (filter.stock && stock < filter.stock.$gte) return { modifiedCount: 0 };
    stock += changes.$inc.stock;
    return { modifiedCount: 1 };
  };
});
function callback(overrides = {}) {
  const params = { vnp_TmnCode: 'TESTSHOP', vnp_TxnRef: 'DH0007', vnp_Amount: '10000000',
    vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '123456', vnp_BankCode: 'NCB', ...overrides };
  return { ...params, vnp_SecureHash: vnpay.sign(params) };
}
async function request(path, body, authorized = true, method = 'POST') {
  return fetch(base + path, { method, headers: { 'Content-Type': 'application/json',
    ...(authorized ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
const shippingInfo = { receiverName: 'Nguyễn Văn A', phone: '0901234567', address: 'TP HCM' };

test('signing uses a known independent HMAC over sorted form-encoded values', () => {
  const params = { vnp_TxnRef: 'DH0007', vnp_OrderInfo: 'Thanh toán A+B' };
  const expected = crypto.createHmac('sha512', 'test-secret')
    .update('vnp_OrderInfo=Thanh+to%C3%A1n+A%2BB&vnp_TxnRef=DH0007').digest('hex');
  assert.equal(vnpay.sign(params), expected);
  assert.equal(vnpay.verify({ ...params, vnp_SecureHash: expected }), true);
  assert.equal(vnpay.verify({ ...params, vnp_TxnRef: ['DH0007'], vnp_SecureHash: expected }), false);
});
test('URL has a valid signature, server amount, GMT+7 timestamps and 15 minute expiry', () => {
  const payment = vnpay.createPayment(orders[0], '::ffff:127.0.0.1', new Date('2026-11-10T10:00:00Z'));
  const query = Object.fromEntries(new URL(payment.paymentUrl).searchParams);
  assert.equal(query.vnp_CreateDate, '20261110170000');
  assert.equal(query.vnp_ExpireDate, '20261110171500');
  assert.equal(query.vnp_Amount, '10000000');
  assert.equal(query.vnp_IpAddr, '127.0.0.1');
  assert.equal(vnpay.verify(query), true);
});
test('create-payment authenticates customer, computes amount, reserves stock and clears cart', async () => {
  const res = await request('/create_payment_url', { shippingInfo, totalAmount: 1 });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.orderCode, 'DH0004');
  assert.equal(new URL(data.paymentUrl).searchParams.get('vnp_Amount'), '10000000');
  assert.equal(stock, 6);
  assert.equal(cart.items.length, 0);
  assert.equal(orders[1].paymentMethod, 'VNPAY');
  assert.equal(orders[1].paymentStatus, 'unpaid');
});
test('missing merchant configuration does not change stock or cart', async () => {
  const secret = process.env.VNP_HASH_SECRET;
  delete process.env.VNP_HASH_SECRET;
  try {
    assert.equal((await request('/create_payment_url', { shippingInfo })).status, 503);
    assert.equal(stock, 8);
    assert.equal(cart.items.length, 1);
  } finally { process.env.VNP_HASH_SECRET = secret; }
});
test('invalid shipping, empty cart and insufficient inventory reject creation', async () => {
  assert.equal((await request('/create_payment_url', {})).status, 400);
  cart.items = [];
  assert.equal((await request('/create_payment_url', { shippingInfo })).status, 400);
  cart.items = [{ bookId: 'SP0001', quantity: 20 }];
  assert.equal((await request('/create_payment_url', { shippingInfo })).status, 409);
  assert.equal(stock, 8);
});
test('failure to persist order releases reserved inventory', async () => {
  Order.create = async () => { throw new Error('database unavailable'); };
  assert.equal((await request('/create_payment_url', { shippingInfo })).status, 500);
  assert.equal(stock, 8);
  assert.equal(cart.items.length, 1);
});
test('callbacks are public but creating a payment requires a customer token', async () => {
  assert.equal((await request('/create_payment_url', { shippingInfo }, false)).status, 401);
  User.findById = async () => ({ _id: 'staff1', role: 'staff', status: 'active' });
  assert.equal((await request('/create_payment_url', { shippingInfo })).status, 403);
  const res = await fetch(base + '/vnpay_ipn?' + new URLSearchParams(callback()));
  assert.deepEqual(await res.json(), { RspCode: '00', Message: 'Confirm Success' });
});
test('invalid signature, merchant, unknown reference and amount return 97/01/04 without mutations', async () => {
  for (const [params, expected] of [
    [{ ...callback(), vnp_SecureHash: '0'.repeat(128) }, '97'],
    [callback({ vnp_TmnCode: 'OTHER' }), '97'],
    [callback({ vnp_TxnRef: 'MISSING' }), '01'],
    [callback({ vnp_Amount: '100' }), '04'],
  ]) assert.equal((await controller.processPayment(params)).RspCode, expected);
  assert.equal(stock, 8);
  assert.equal(orders[0].paymentStatus, 'unpaid');
  assert.equal(orders[0].statusHistory.length, 0);
});
test('success records transaction and paidAt, keeps pending, and duplicate returns 02', async () => {
  assert.equal((await controller.processPayment(callback())).RspCode, '00');
  assert.equal(orders[0].status, 'pending');
  assert.equal(orders[0].paymentStatus, 'paid');
  assert.ok(orders[0].paidAt);
  assert.equal(orders[0].vnpTransactionNo, '123456');
  assert.equal(orders[0].vnpBankCode, 'NCB');
  assert.equal((await controller.processPayment(callback())).RspCode, '02');
  assert.equal(orders[0].statusHistory.length, 1);
  assert.equal(stock, 8);
});
test('cancel and non-success transaction status cancel order and restock exactly once', async () => {
  const cancelled = callback({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02' });
  const results = await Promise.all([controller.processPayment(cancelled), controller.processPayment(cancelled)]);
  assert.deepEqual(results.map((r) => r.RspCode).sort(), ['00', '02']);
  assert.equal(orders[0].status, 'cancelled');
  assert.equal(orders[0].paymentStatus, 'unpaid');
  assert.equal(stock, 10);
  assert.equal(orders[0].statusHistory.length, 1);
});
test('response 00 alone does not mark a failed transaction paid', async () => {
  await controller.processPayment(callback({ vnp_TransactionStatus: '02' }));
  assert.equal(orders[0].status, 'cancelled');
  assert.equal(orders[0].paymentStatus, 'unpaid');
});
test('simultaneous Return and IPN settle payment once and Return redirects to frontend', async () => {
  const query = new URLSearchParams(callback());
  const [ret, ipn] = await Promise.all([
    fetch(base + '/vnpay_return?' + query, { redirect: 'manual' }),
    fetch(base + '/vnpay_ipn?' + query),
  ]);
  assert.equal(ret.status, 302);
  assert.match(ret.headers.get('location'), /^http:\/\/localhost:5173\/payment\/result\?/);
  assert.equal(new URL(ret.headers.get('location')).searchParams.get('orderCode'), 'DH0007');
  assert.ok(['00', '02'].includes((await ipn.json()).RspCode));
  assert.equal(orders[0].statusHistory.length, 1);
});
test('retry creates unique alphanumeric refs without changing stock or cart', async () => {
  const first = await (await request('/my/DH0007/retry-payment')).json();
  const second = await (await request('/my/DH0007/retry-payment')).json();
  const firstRef = new URL(first.paymentUrl).searchParams.get('vnp_TxnRef');
  const secondRef = new URL(second.paymentUrl).searchParams.get('vnp_TxnRef');
  assert.match(firstRef, /^DH0007A[a-z\d]+$/i);
  assert.notEqual(firstRef, secondRef);
  assert.equal(stock, 8);
  assert.equal(cart.items.length, 1);
  assert.equal((await controller.processPayment(callback({ vnp_ResponseCode: '24' }))).RspCode, '02');
  assert.equal(orders[0].status, 'pending');
  assert.equal((await controller.processPayment(callback())).RspCode, '00');
  assert.equal(orders[0].paymentStatus, 'paid');
});
test('retry rejects another customer, paid, cancelled and non-VNPAY orders', async () => {
  orders[0].userId = 'someone-else';
  assert.equal((await request('/my/DH0007/retry-payment')).status, 404);
  orders[0].userId = 'customer1';
  for (const overrides of [{ paymentStatus: 'paid' }, { status: 'cancelled' }, { paymentMethod: 'COD' }]) {
    Object.assign(orders[0], { paymentStatus: 'unpaid', status: 'pending', paymentMethod: 'VNPAY' }, overrides);
    assert.equal((await request('/my/DH0007/retry-payment')).status, 409);
  }
});
test('customer cancellation racing a failed callback restocks once', async () => {
  await Promise.all([
    request('/my/DH0007/cancel', null, true, 'PATCH'),
    controller.processPayment(callback({ vnp_ResponseCode: '24' })),
  ]);
  assert.equal(orders[0].status, 'cancelled');
  assert.equal(stock, 10);
});
test('staff cannot manually mark VNPAY paid or advance an unpaid VNPAY order', async () => {
  User.findById = async () => ({ _id: 'staff1', role: 'staff', status: 'active' });
  assert.equal((await request('/DH0007/pay', null, true, 'PATCH')).status, 400);
  assert.equal((await request('/DH0007/status', { status: 'confirmed' }, true, 'PATCH')).status, 409);
  assert.equal(orders[0].paymentStatus, 'unpaid');
});
test('COD and BANK creation retain their existing amounts and methods', async () => {
  for (const paymentMethod of ['COD', 'BANK']) {
    cart.items = [{ bookId: 'SP0001', quantity: 2 }];
    const res = await request('', { shippingInfo, paymentMethod });
    assert.equal(res.status, 201);
    const order = await res.json();
    assert.equal(order.paymentMethod, paymentMethod);
    assert.equal(order.codAmount, paymentMethod === 'COD' ? 100000 : 0);
  }
});
