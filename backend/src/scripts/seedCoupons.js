require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const Counter = require('../models/Counter');

const day = 24 * 60 * 60 * 1000;
const now = Date.now();
const samples = [
  { _id: 'CP0001', code: 'WELCOME10', description: 'Giảm 10% cho đơn từ 100.000₫ (tối đa 30.000₫)', discountType: 'percent', discountValue: 10, maxDiscount: 30000, minOrderAmount: 100000, usageLimit: 0, perUserLimit: 1, startsAt: new Date(now), expiresAt: new Date(now + 365 * day), isPublic: true },
  { _id: 'CP0002', code: 'GIAM20K', description: 'Giảm 20.000₫ cho đơn từ 150.000₫', discountType: 'fixed', discountValue: 20000, maxDiscount: 0, minOrderAmount: 150000, usageLimit: 500, perUserLimit: 3, startsAt: new Date(now), expiresAt: new Date(now + 180 * day), isPublic: true },
  { _id: 'CP0003', code: 'FREESHIP30', description: 'Giảm 30.000₫ phí vận chuyển cho đơn từ 300.000₫', discountType: 'fixed', discountValue: 30000, maxDiscount: 0, minOrderAmount: 300000, usageLimit: 200, perUserLimit: 2, startsAt: new Date(now), expiresAt: new Date(now + 90 * day), isPublic: true },
  { _id: 'CP0004', code: 'VIP15', description: 'Mã riêng: giảm 15% (tối đa 100.000₫)', discountType: 'percent', discountValue: 15, maxDiscount: 100000, minOrderAmount: 0, usageLimit: 50, perUserLimit: 1, startsAt: null, expiresAt: new Date(now + 60 * day), isPublic: false },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nhasach');
  await Coupon.createCollection().catch(() => {});
  await Coupon.syncIndexes();
  const r = await Coupon.bulkWrite(samples.map((c) => ({
    updateOne: { filter: { $or: [{ _id: c._id }, { code: c.code }] }, update: { $setOnInsert: { usedCount: 0, isActive: true, ...c } }, upsert: true },
  })));
  // Đồng bộ counter để mã tạo từ trang admin không bị trùng _id
  const max = (await Coupon.find({ _id: /^CP\d+$/ }).select('_id')).reduce((m, c) => Math.max(m, Number(c._id.slice(2))), 0);
  await Counter.updateOne({ _id: 'couponCode' }, { $max: { seq: max } }, { upsert: true });
  console.log(`Thêm mới: ${r.upsertedCount} · Tổng số mã: ${await Coupon.countDocuments()} · counter = ${max}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });