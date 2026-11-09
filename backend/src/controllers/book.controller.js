const Book = require('../models/Book');
const Category = require('../models/Category');
const Order = require('../models/Order');
const { httpError, asyncHandler, nextSeq } = require('../utils/helpers');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FIELDS = ['title', 'author', 'price', 'stock', 'description', 'imageUrl', 'categoryId', 'isActive'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// Các khoảng giá dùng cho bộ lọc (min <= giá < max)
const PRICE_RANGES = [[0, 50000], [50000, 100000], [100000, 200000], [200000, 500000], [500000, null]];
const vnd = (n) => n.toLocaleString('vi-VN') + ' ₫';
const rangeLabel = ([a, b]) => (a === 0 ? `Dưới ${vnd(b)}` : b === null ? `Từ ${vnd(a)} trở lên` : `${vnd(a)} - ${vnd(b)}`);
const priceCond = ([a, b]) => ({ price: { $gte: a, ...(b !== null && { $lt: b }) } });
const csv = (v) => (v ? String(v).split(',').filter(Boolean) : []);

/** Dựng điều kiện lọc từ query; `skip` bỏ qua 1 nhóm lọc (để đếm số lượng cho chính nhóm đó) */
async function buildFilter(qs, user, skip = []) {
  const q = {};
  const staff = ['admin', 'staff'].includes(user?.role);
  if (!(staff && qs.includeInactive === 'true')) q.isActive = true;
  if (qs.search) q.$or = [{ title: new RegExp(esc(qs.search), 'i') }, { author: new RegExp(esc(qs.search), 'i') }];
  if (!skip.includes('category')) {
    if (qs.categoryId) q.categoryId = qs.categoryId;
    else if (qs.group) q.categoryId = { $in: (await Category.find({ group: qs.group })).map((c) => c._id) };
  }
  if (!skip.includes('authors') && csv(qs.authors).length) q.author = { $in: csv(qs.authors) };
  if (!skip.includes('price')) {
    const conds = csv(qs.prices).map((r) => { const [a, b] = r.split('-'); return priceCond([+a, b ? +b : null]); });
    if (conds.length) q.$and = [{ $or: conds }];
  }
  if (qs.inStock === 'true') q.stock = { $gt: 0 };
  if (qs.minRating) q.ratingAvg = { $gte: +qs.minRating };
  return q;
}

// GET /api/books?search=&group=&categoryId=&authors=a,b&prices=0-50000,50000-100000&inStock=true&minRating=4&sort=&page=&limit=
exports.list = asyncHandler(async (req, res) => {
  const { sort = 'newest', page = 1, limit = 12 } = req.query;
  const q = await buildFilter(req.query, req.user);
  const sorts = { newest: { createdAt: -1 }, 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, rating: { ratingAvg: -1, ratingCount: -1 }, name: { title: 1 } };
  const p = Math.max(1, +page), l = Math.min(60, Math.max(1, +limit));
  const [items, total] = await Promise.all([
    Book.find(q).sort(sorts[sort] || sorts.newest).skip((p - 1) * l).limit(l),
    Book.countDocuments(q),
  ]);
  res.json({ items, total, page: p, pages: Math.ceil(total / l) });
});

// GET /api/books/facets — số lượng sản phẩm cho từng giá trị lọc (mỗi nhóm tính theo các bộ lọc còn lại)
exports.facets = asyncHandler(async (req, res) => {
  const [authorQ, catQ, priceQ] = await Promise.all([
    buildFilter(req.query, req.user, ['authors']),
    buildFilter(req.query, req.user, ['category']),
    buildFilter(req.query, req.user, ['price']),
  ]);
  const [authors, categories, prices] = await Promise.all([
    Book.aggregate([{ $match: authorQ }, { $group: { _id: '$author', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Book.aggregate([{ $match: catQ }, { $group: { _id: '$categoryId', count: { $sum: 1 } } }]),
    Promise.all(PRICE_RANGES.map(async (r) => ({
      key: `${r[0]}-${r[1] ?? ''}`, label: rangeLabel(r), count: await Book.countDocuments({ $and: [priceQ, priceCond(r)] }),
    }))),
  ]);
  res.json({
    authors: authors.map((a) => ({ value: a._id, count: a.count })),
    categories: Object.fromEntries(categories.map((c) => [c._id, c.count])),
    prices,
  });
});

exports.get = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book || (!book.isActive && !['admin', 'staff'].includes(req.user?.role))) throw httpError(404, 'Không tìm thấy sản phẩm');
  res.json(book);
});

// GET /api/books/:id/related — tối đa 5 cuốn đang bán: ưu tiên cùng danh mục, thiếu thì bổ sung cùng tác giả
exports.related = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book || (!book.isActive && !['admin', 'staff'].includes(req.user?.role))) throw httpError(404, 'Không tìm thấy sản phẩm');
  const LIMIT = 5;
  const base = { isActive: true, _id: { $ne: book._id } };
  const sameCat = await Book.find({ ...base, categoryId: book.categoryId })
    .sort({ ratingAvg: -1, ratingCount: -1, createdAt: -1 }).limit(LIMIT);
  let items = sameCat;
  if (items.length < LIMIT && book.author && book.author !== 'Đang cập nhật') {
    const more = await Book.find({ ...base, author: book.author, _id: { $nin: [book._id, ...items.map((b) => b._id)] } })
      .sort({ ratingAvg: -1, ratingCount: -1, createdAt: -1 }).limit(LIMIT - items.length);
    items = items.concat(more);
  }
  res.json(items);
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (!data.title || data.price === undefined || !data.categoryId) throw httpError(400, 'Thiếu tên, giá hoặc danh mục');
  if (!(await Category.exists({ _id: data.categoryId }))) throw httpError(400, 'Danh mục không tồn tại');
  res.status(201).json(await Book.create({ _id: `SP${await nextSeq('bookCode', 1019)}`, ...data }));
});

exports.update = asyncHandler(async (req, res) => {
  const book = await Book.findByIdAndUpdate(req.params.id, { $set: pick(req.body) }, { new: true, runValidators: true });
  if (!book) throw httpError(404, 'Không tìm thấy sản phẩm');
  res.json(book);
});

// Sản phẩm đã từng được đặt hàng thì chỉ ẩn (isActive=false) để giữ lịch sử đơn hàng
exports.remove = asyncHandler(async (req, res) => {
  if (await Order.exists({ 'items.bookId': req.params.id })) {
    await Book.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.json({ message: 'Sản phẩm đã có trong đơn hàng nên được chuyển sang trạng thái ẩn' });
  }
  await Book.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xóa sản phẩm' });
});
