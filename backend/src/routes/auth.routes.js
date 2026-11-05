const r = require('express').Router();
const c = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');

r.post('/register', c.register);
r.post('/login', c.login);
r.get('/me', auth, c.me);
r.put('/me', auth, c.updateMe);
r.put('/password', auth, c.changePassword);
module.exports = r;
