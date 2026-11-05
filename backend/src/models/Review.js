const { Schema, model } = require('mongoose');
module.exports = model('Review', new Schema(
  {
    _id: String,
    bookId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    orderCode: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
    reply: { type: String, default: null },
  },
  { collection: 'reviews', timestamps: true, versionKey: false }
));
