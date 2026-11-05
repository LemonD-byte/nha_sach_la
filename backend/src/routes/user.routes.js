const r = require('express').Router();
const c = require('../controllers/user.controller');
const { auth, requireRole } = require('../middleware/auth');

r.use(auth, requireRole('admin'));
r.get('/', c.list);
r.post('/', c.create);
r.put('/:id', c.update);
module.exports = r;
