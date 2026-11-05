const { Schema, model } = require('mongoose');
module.exports = model('Cart', new Schema(
  {
    _id: String,
    userId: { type: String, required: true, unique: true },
    items: [{ _id: false, bookId: String, quantity: { type: Number, min: 1, default: 1 } }],
  },
  { collection: 'carts', timestamps: { createdAt: false, updatedAt: true }, versionKey: false }
));
