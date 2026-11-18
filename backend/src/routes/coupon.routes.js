const r = require('express').Router();
const c = require('../controllers/coupon.controller');
const { auth, requireRole } = require('../middleware/auth');

r.use(auth);
// Khách hàng (đặt trước /:id)
r.get('/available', requireRole('customer'), c.available);
r.post('/validate', requireRole('customer'), c.validate);
// Admin
r.get('/', requireRole('admin'), c.list);
r.post('/', requireRole('admin'), c.create);
r.put('/:id', requireRole('admin'), c.update);
r.delete('/:id', requireRole('admin'), c.remove);
module.exports = r;