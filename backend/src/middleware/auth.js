const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { httpError, asyncHandler } = require('../utils/helpers');

const secret = () => process.env.JWT_SECRET || 'dev_secret';
exports.signToken = (user) => jwt.sign({ id: user._id, role: user.role }, secret(), { expiresIn: process.env.JWT_EXPIRES || '7d' });

async function loadUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, secret());
    const user = await User.findById(id);
    return user && user.status === 'active' ? user : null;
  } catch { return null; }
}

/** Bắt buộc đăng nhập */
exports.auth = asyncHandler(async (req, _res, next) => {
  req.user = await loadUser(req);
  if (!req.user) throw httpError(401, 'Vui lòng đăng nhập');
  next();
});
/** Đăng nhập không bắt buộc */
exports.optionalAuth = asyncHandler(async (req, _res, next) => { req.user = await loadUser(req); next(); });
/** Giới hạn theo vai trò: requireRole('admin','staff') */
exports.requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(httpError(403, 'Bạn không có quyền thực hiện thao tác này'));
