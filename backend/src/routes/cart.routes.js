const r = require('express').Router();
const c = require('../controllers/cart.controller');
const { auth, requireRole } = require('../middleware/auth');

r.use(auth, requireRole('customer'));
r.get('/', c.get);
r.post('/items', c.addItem);
r.put('/items/:bookId', c.setQuantity);
r.delete('/items/:bookId', c.removeItem);
r.delete('/', c.clear);
module.exports = r;
