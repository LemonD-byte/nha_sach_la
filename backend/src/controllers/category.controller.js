const Category = require('../models/Category');
const Book = require('../models/Book');
const { httpError, asyncHandler } = require('../utils/helpers');

const PREFIX = { 'Sách': 'A', 'Dụng cụ học tập': 'B', 'Đồ chơi': 'C' };

async function newId(group) {
  const letter = PREFIX[group] || 'D';
  const last = await Category.findOne({ _id: new RegExp(`^${letter}\\d+$`) }).sort({ _id: -1 });
  return `${letter}${last ? Number(last._id.slice(1)) + 1 : 1000}`;
}

exports.list = asyncHandler(async (_req, res) => res.json(await Category.find().sort({ _id: 1 })));

exports.create = asyncHandler(async (req, res) => {
  const { name, description = '', group = 'Sách' } = req.body;
  if (!name) throw httpError(400, 'Thiếu tên danh mục');
  res.status(201).json(await Category.create({ _id: await newId(group), name, description, group }));
});

exports.update = asyncHandler(async (req, res) => {
  const { name, description, group } = req.body;
  const cat = await Category.findByIdAndUpdate(req.params.id, { $set: { name, description, group } }, { new: true, omitUndefined: true });
  if (!cat) throw httpError(404, 'Không tìm thấy danh mục');
  res.json(cat);
});

exports.remove = asyncHandler(async (req, res) => {
  if (await Book.exists({ categoryId: req.params.id })) throw httpError(409, 'Danh mục còn sản phẩm, không thể xóa');
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Đã xóa danh mục' });
});
