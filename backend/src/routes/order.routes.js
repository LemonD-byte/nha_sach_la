const r = require('express').Router();
const c = require('../controllers/order.controller');
const { auth, requireRole } = require('../middleware/auth');

r.get('/vnpay_return', c.vnpayReturn);
r.get('/vnpay_ipn', c.vnpayIpn);
r.use(auth);
r.post('/create_payment_url', requireRole('customer'), c.createPaymentUrl);
r.post('/my/:code/retry-payment', requireRole('customer'), c.retryPayment);
// Khách hàng
r.post('/', requireRole('customer'), c.create);
r.get('/my', requireRole('customer'), c.mine);
r.get('/my/:code', requireRole('customer'), c.mineOne);
r.patch('/my/:code/cancel', requireRole('customer'), c.cancelMine);
// Nhân viên / admin
const staff = requireRole('admin', 'staff');
r.get('/', staff, c.list);
r.get('/:code', staff, c.get);
r.patch('/:code/status', staff, c.updateStatus);
r.patch('/:code/delivery-failed', staff, c.deliveryFailed);
r.patch('/:code/pay', staff, c.markPaid);
module.exports = r;
