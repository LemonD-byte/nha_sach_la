const r = require('express').Router();
const { overview } = require('../controllers/stats.controller');
const { auth, requireRole } = require('../middleware/auth');
r.get('/', auth, requireRole('admin', 'staff'), overview);
module.exports = r;
