const Book = require('../models/Book');
const Wishlist = require('../models/Wishlist');
const { httpError, asyncHandler, nextSeq, pad } = require('../utils/helpers');

async function ensureWishlist(userId) {
  let w = await Wishlist.findOne({ userId });
  if (!w) {
    try {
      w = await Wishlist.create({ _id: `YT${pad(await nextSeq('wishlistCode', 0))}`, userId, bookIds: [] });
    } catch (e) {
      if (e.code === 11000) w = await Wishlist.findOne({ userId }); // 2 request tạo cùng lúc
      else throw e;
    }
  }
  return w;
}

/** Sách ẩn (isActive:false) hoặc đã xóa không hiện; giữ thứ tự mới thích ở đầu */
async function view(w) {
  const books = await Book.find({ _id: { $in: w.bookIds }, isActive: true });
  const map = new Map(books.map((b) => [b._id, b]));
  const items = [...w.bookIds].reverse().filter((id) => map.has(id)).map((id) => ({ bookId: id, book: map.get(id) }));
  return { _id: w._id, items, ids: items.map((i) => i.bookId), count: items.length };
}

// GET /api/wishlist
exports.get = asyncHandler(async (req, res) => res.json(await view(await ensureWishlist(req.user._id))));

// POST /api/wishlist/:bookId — thêm (không trùng: $addToSet)
exports.add = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  if (!(await Book.exists({ _id: bookId, isActive: true }))) throw httpError(404, 'Sản phẩm không tồn tại');
  const w = await ensureWishlist(req.user._id);
  await Wishlist.updateOne({ _id: w._id }, { $addToSet: { bookIds: bookId } });
  res.json(await view(await Wishlist.findById(w._id)));
});

// DELETE /api/wishlist/:bookId — bỏ thích (không lỗi nếu chưa có)
exports.remove = asyncHandler(async (req, res) => {
  const w = await ensureWishlist(req.user._id);
  await Wishlist.updateOne({ _id: w._id }, { $pull: { bookIds: req.params.bookId } });
  res.json(await view(await Wishlist.findById(w._id)));
});
