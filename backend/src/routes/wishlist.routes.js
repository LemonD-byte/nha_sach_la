const r = require('express').Router();
const c = require('../controllers/wishlist.controller');
const { auth, requireRole } = require('../middleware/auth');

r.use(auth, requireRole('customer'));
r.get('/', c.get);
r.post('/:bookId', c.add);
r.delete('/:bookId', c.remove);
module.exports = r;
