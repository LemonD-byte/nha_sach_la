require('dotenv').config();
const { config } = require('../utils/vnpay');

try {
  const settings = config();
  console.log('Cấu hình VNPAY: đã điền đủ và URL hợp lệ (chưa xác minh thông tin merchant với VNPAY).');
  console.log(`Backend port: ${process.env.PORT || 5000}`);
  console.log(`Return URL: ${settings.VNP_RETURN_URL}`);
  console.log(`Frontend: ${settings.CLIENT_URL}`);
  if (new URL(settings.VNP_RETURN_URL).port !== String(process.env.PORT || 5000)) {
    console.warn('Lưu ý: cổng Return URL khác cổng backend. Kiểm tra nếu không dùng reverse proxy.');
  }
} catch (error) {
  console.error(error.message);
  for (const key of ['VNP_TMN_CODE', 'VNP_HASH_SECRET', 'VNP_URL', 'VNP_RETURN_URL', 'CLIENT_URL']) {
    console.log(`${key}: ${process.env[key]?.trim() ? 'đã điền' : 'còn thiếu'}`);
  }
  console.log('Đăng ký thông tin sandbox: https://sandbox.vnpayment.vn/devreg/');
  process.exitCode = 1;
}
