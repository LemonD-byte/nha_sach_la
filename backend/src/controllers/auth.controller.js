const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { signToken } = require('../middleware/auth');
const { httpError, asyncHandler, nextSeq } = require('../utils/helpers');

/** Mỗi khách hàng có đúng 1 giỏ hàng (GHxxxx) */
exports.ensureCart = async (userId) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ _id: `GH${await nextSeq('cartCode', 1004)}`, userId, items: [] });
  return cart;
};

exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone = '', address = '' } = req.body;
  if (!fullName || !email || !password) throw httpError(400, 'Vui lòng nhập họ tên, email và mật khẩu');
  if (password.length < 6) throw httpError(400, 'Mật khẩu tối thiểu 6 ký tự');
  const user = await User.create({
    _id: String(await nextSeq('userCode', 1000003)),
    fullName, email, phone, address, role: 'customer',
    passwordHash: await bcrypt.hash(password, 10),
  });
  await exports.ensureCart(user._id);
  res.status(201).json({ token: signToken(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email = '', password = '' } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw httpError(401, 'Email hoặc mật khẩu không đúng');
  if (user.status !== 'active') throw httpError(403, 'Tài khoản đã bị khóa');
  res.json({ token: signToken(user), user });
});

exports.me = (req, res) => res.json(req.user);

exports.updateMe = asyncHandler(async (req, res) => {
  const { fullName, phone, address } = req.body;
  Object.assign(req.user, { ...(fullName && { fullName }), ...(phone !== undefined && { phone }), ...(address !== undefined && { address }) });
  await req.user.save();
  res.json(req.user);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) throw httpError(400, 'Mật khẩu mới tối thiểu 6 ký tự');
  if (!(await bcrypt.compare(oldPassword || '', req.user.passwordHash))) throw httpError(400, 'Mật khẩu cũ không đúng');
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ message: 'Đã đổi mật khẩu' });
});
