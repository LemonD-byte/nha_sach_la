const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { httpError, asyncHandler, nextSeq } = require('../utils/helpers');
const { ensureCart } = require('./auth.controller');

exports.list = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.$or = [{ fullName: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }];
  res.json(await User.find(filter).sort({ createdAt: -1 }));
});

// Admin tạo tài khoản nhân viên / khách hàng
exports.create = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone = '', address = '', role = 'staff' } = req.body;
  if (!fullName || !email || !password) throw httpError(400, 'Thiếu họ tên, email hoặc mật khẩu');
  const id = role === 'customer' ? String(await nextSeq('userCode', 1000003)) : `${role === 'admin' ? 'ad' : 'stf'}${await nextSeq(role + 'Code', 1002)}`;
  const user = await User.create({ _id: id, fullName, email, phone, address, role, passwordHash: await bcrypt.hash(password, 10) });
  if (role === 'customer') await ensureCart(user._id);
  res.status(201).json(user);
});

exports.update = asyncHandler(async (req, res) => {
  const { fullName, phone, address, role, status } = req.body;
  if (req.params.id === req.user._id && (role || status)) throw httpError(400, 'Không thể tự đổi vai trò hoặc khóa chính mình');
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { fullName, phone, address, role, status } }, { new: true, omitUndefined: true, runValidators: true });
  if (!user) throw httpError(404, 'Không tìm thấy người dùng');
  res.json(user);
});
