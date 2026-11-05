const r = require('express').Router();
const c = require('../controllers/review.controller');
const { auth, requireRole } = require('../middleware/auth');

r.get('/my', auth, requireRole('customer'), c.mine);
r.post('/', auth, requireRole('customer'), c.create);
r.get('/', auth, requireRole('admin', 'staff'), c.list);
r.patch('/:id/reply', auth, requireRole('admin', 'staff'), c.reply);
r.patch('/:id/status', auth, requireRole('admin', 'staff'), c.setStatus);
module.exports = r;
