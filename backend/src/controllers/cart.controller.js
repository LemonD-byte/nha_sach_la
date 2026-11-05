const Book = require('../models/Book');
const { ensureCart } = require('./auth.controller');
const { httpError, asyncHandler } = require('../utils/helpers');

async function view(cart) {
  const books = await Book.find({ _id: { $in: cart.items.map((i) => i.bookId) } });
  const map = new Map(books.map((b) => [b._id, b]));
  const items = cart.items
    .filter((i) => map.has(i.bookId))
    .map((i) => ({ bookId: i.bookId, quantity: i.quantity, book: map.get(i.bookId) }));
  const total = items.reduce((s, i) => s + i.book.price * i.quantity, 0);
  return { _id: cart._id, items, total, count: items.reduce((s, i) => s + i.quantity, 0) };
}

exports.get = asyncHandler(async (req, res) => res.json(await view(await ensureCart(req.user._id))));

exports.addItem = asyncHandler(async (req, res) => {
  const { bookId, quantity = 1 } = req.body;
  const book = await Book.findOne({ _id: bookId, isActive: true });
  if (!book) throw httpError(404, 'Sản phẩm không tồn tại');
  const cart = await ensureCart(req.user._id);
  const line = cart.items.find((i) => i.bookId === bookId);
  const qty = (line?.quantity || 0) + Math.max(1, +quantity);
  if (qty > book.stock) throw httpError(409, `Chỉ còn ${book.stock} sản phẩm trong kho`);
  line ? (line.quantity = qty) : cart.items.push({ bookId, quantity: qty });
  await cart.save();
  res.json(await view(cart));
});

exports.setQuantity = asyncHandler(async (req, res) => {
  const qty = Math.max(1, +req.body.quantity || 1);
  const book = await Book.findById(req.params.bookId);
  if (book && qty > book.stock) throw httpError(409, `Chỉ còn ${book.stock} sản phẩm trong kho`);
  const cart = await ensureCart(req.user._id);
  const line = cart.items.find((i) => i.bookId === req.params.bookId);
  if (!line) throw httpError(404, 'Sản phẩm không có trong giỏ');
  line.quantity = qty;
  await cart.save();
  res.json(await view(cart));
});

exports.removeItem = asyncHandler(async (req, res) => {
  const cart = await ensureCart(req.user._id);
  cart.items = cart.items.filter((i) => i.bookId !== req.params.bookId);
  await cart.save();
  res.json(await view(cart));
});

exports.clear = asyncHandler(async (req, res) => {
  const cart = await ensureCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json(await view(cart));
});
