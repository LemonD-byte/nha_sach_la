const r = require('express').Router();
const c = require('../controllers/book.controller');
const rv = require('../controllers/review.controller');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');

r.get('/', optionalAuth, c.list);
r.get('/facets', optionalAuth, c.facets); // phải đặt trước '/:id'
r.get('/:id/related', optionalAuth, c.related); // sản phẩm liên quan
r.get('/:id', optionalAuth, c.get);
r.get('/:bookId/reviews', rv.byBook);
r.post('/', auth, requireRole('admin', 'staff'), c.create);
r.put('/:id', auth, requireRole('admin', 'staff'), c.update);
r.delete('/:id', auth, requireRole('admin'), c.remove);
module.exports = r;
