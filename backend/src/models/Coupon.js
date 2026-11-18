const { Schema, model } = require('mongoose');

const schema = new Schema(
  {
    _id: String, // CP0001, CP0002...
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    maxDiscount: { type: Number, default: 0, min: 0 },     // trần giảm khi giảm theo %, 0 = không giới hạn
    minOrderAmount: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: 0, min: 0 },      // tổng lượt, 0 = không giới hạn
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 0 },    // lượt/khách, 0 = không giới hạn
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    isPublic: { type: Boolean, default: true },            // true: hiện trong chuông và trang đặt hàng
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: null },
  },
  { collection: 'coupons', timestamps: true, versionKey: false }
);
schema.index({ isActive: 1, expiresAt: 1 });
module.exports = model('Coupon', schema);