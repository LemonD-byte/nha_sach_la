const { Schema, model } = require('mongoose');
// Mỗi khách hàng có đúng 1 danh sách yêu thích (YTxxxx), làm giống Cart
module.exports = model('Wishlist', new Schema(
  {
    _id: String,
    userId: { type: String, required: true, unique: true },
    bookIds: [{ type: String }],
  },
  { collection: 'wishlists', timestamps: { createdAt: false, updatedAt: true }, versionKey: false }
));
