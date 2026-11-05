// Đặt lại mật khẩu cho TẤT CẢ tài khoản trong DB về giá trị mới (mặc định 123456).
// Chạy: npm run reset-passwords   hoặc   node src/scripts/resetPasswords.js matkhaumoi
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  const pwd = process.argv[2] || '123456';
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nhasach');
  const r = await User.updateMany({}, { $set: { passwordHash: await bcrypt.hash(pwd, 10) } });
  console.log(`Đã đặt lại mật khẩu cho ${r.modifiedCount} tài khoản → "${pwd}"`);
  await mongoose.disconnect();
})();
