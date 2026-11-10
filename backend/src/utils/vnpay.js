const crypto = require('node:crypto');
const qs = require('qs');
const { httpError } = require('./helpers');

function config() {
  const { VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, VNP_RETURN_URL, CLIENT_URL } = process.env;
  if (![VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, VNP_RETURN_URL, CLIENT_URL].every(Boolean)) {
    throw httpError(503, 'Chưa cấu hình cổng thanh toán VNPAY');
  }
  for (const value of [VNP_URL, VNP_RETURN_URL, CLIENT_URL]) {
    try {
      if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error();
    } catch { throw httpError(503, 'URL cấu hình VNPAY không hợp lệ'); }
  }
  return { VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, VNP_RETURN_URL, CLIENT_URL };
}

// VNPAY 2.1.0 signs sorted, form-encoded parameters (spaces become +).
function serialize(params) {
  const sorted = {};
  for (const key of Object.keys(params).sort()) sorted[key] = encodeURIComponent(String(params[key])).replace(/%20/g, '+');
  return qs.stringify(sorted, { encode: false });
}
function sign(params, secret = config().VNP_HASH_SECRET) {
  return crypto.createHmac('sha512', secret).update(Buffer.from(serialize(params), 'utf8')).digest('hex');
}
function verify(query) {
  const params = {};
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('vnp_') || typeof value !== 'string') return false;
    if (!['vnp_SecureHash', 'vnp_SecureHashType'].includes(key)) params[key] = value;
  }
  if (!/^[a-f\d]{128}$/i.test(query.vnp_SecureHash || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(sign(params), 'hex'), Buffer.from(query.vnp_SecureHash, 'hex'));
}
function timestamp(date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace(/[-T:]/g, '');
}
function createPayment(order, ip, now = new Date()) {
  const cfg = config();
  if (!Number.isSafeInteger(order.totalAmount * 100) || order.totalAmount <= 0) throw httpError(400, 'Số tiền thanh toán không hợp lệ');
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const txnRef = order.vnpTxnRef || order.orderCode;
  const params = {
    vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: cfg.VNP_TMN_CODE,
    vnp_Amount: String(order.totalAmount * 100), vnp_CurrCode: 'VND', vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`, vnp_OrderType: 'other',
    vnp_Locale: 'vn', vnp_ReturnUrl: cfg.VNP_RETURN_URL,
    vnp_IpAddr: (ip || '127.0.0.1').replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1'),
    vnp_CreateDate: timestamp(now), vnp_ExpireDate: timestamp(expiresAt),
  };
  return { txnRef, expiresAt, paymentUrl: `${cfg.VNP_URL}?${serialize(params)}&vnp_SecureHash=${sign(params)}` };
}
module.exports = { config, serialize, sign, verify, timestamp, createPayment };
