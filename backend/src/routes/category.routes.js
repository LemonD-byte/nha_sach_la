const r = require('express').Router();
const c = require('../controllers/category.controller');
const { auth, requireRole } = require('../middleware/auth');

r.get('/', c.list);
r.post('/', auth, requireRole('admin'), c.create);
r.put('/:id', auth, requireRole('admin'), c.update);
r.delete('/:id', auth, requireRole('admin'), c.remove);
module.exports = r;
