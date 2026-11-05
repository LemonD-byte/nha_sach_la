const { Schema, model } = require('mongoose');
const n0 = { type: Number, default: 0 };

module.exports = model('Book', new Schema(
  {
    _id: String,
    title: { type: String, required: true, trim: true },
    author: { type: String, default: 'Đang cập nhật' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    categoryId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
    ratingAvg: n0,
    ratingCount: n0,
    ratingBreakdown: { 1: n0, 2: n0, 3: n0, 4: n0, 5: n0 },
  },
  { collection: 'books', timestamps: true, versionKey: false }
));
