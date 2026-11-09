// Nạp dữ liệu mẫu (danh mục + sách) để test. AN TOÀN: chỉ thêm bản ghi chưa có (theo _id), không ghi đè dữ liệu sẵn có.
// Ngoài ra bật isActive:true cho sách đang thiếu trường này.
// Chạy: npm run seed-sample
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Book = require('../models/Book');

const cats = [
  ['A0001', 'Văn học', 'Sách'], ['A0002', 'Kinh tế', 'Sách'], ['A0003', 'Thiếu nhi', 'Sách'], ['A0004', 'Công nghệ', 'Sách'],
  ['B0001', 'Vở - Giấy', 'Dụng cụ học tập'], ['B0002', 'Bút - Máy tính', 'Dụng cụ học tập'],
  ['C0001', 'Xếp hình', 'Đồ chơi'], ['C0002', 'Cờ', 'Đồ chơi'],
];
// [id, title, author, price, stock, categoryId]
const books = [
  ['SP1001', 'Dế Mèn phiêu lưu ký', 'Tô Hoài', 65000, 40, 'A0001'],
  ['SP1002', 'Truyện ngắn Tô Hoài chọn lọc', 'Tô Hoài', 72000, 25, 'A0001'],
  ['SP1003', 'Tôi thấy hoa vàng trên cỏ xanh', 'Nguyễn Nhật Ánh', 89000, 60, 'A0001'],
  ['SP1004', 'Cho tôi xin một vé đi tuổi thơ', 'Nguyễn Nhật Ánh', 79000, 50, 'A0001'],
  ['SP1005', 'Nhà giả kim', 'Paulo Coelho', 79000, 35, 'A0001'],
  ['SP1006', 'Cha giàu cha nghèo', 'Robert Kiyosaki', 120000, 30, 'A0002'],
  ['SP1007', 'Đắc nhân tâm', 'Dale Carnegie', 86000, 45, 'A0002'],
  ['SP1008', 'Doraemon tập 1', 'Fujiko F. Fujio', 22000, 80, 'A0003'],
  ['SP1009', 'Clean Code', 'Robert C. Martin', 350000, 12, 'A0004'],
  ['SP1010', 'Lập trình Python cơ bản', 'Nhiều tác giả', 150000, 20, 'A0004'],
  ['SP1011', 'Vở kẻ ngang 96 trang', 'Hồng Hà', 12000, 200, 'B0001'],
  ['SP1012', 'Vở ô ly 200 trang', 'Hồng Hà', 28000, 150, 'B0001'],
  ['SP1013', 'Bút bi Thiên Long TL-027', 'Thiên Long', 5000, 300, 'B0002'],
  ['SP1014', 'Máy tính Casio FX-580VN X', 'Casio', 650000, 15, 'B0002'],
  ['SP1015', 'Bộ xếp hình 500 mảnh', 'Lego Việt', 250000, 10, 'C0001'],
  ['SP1016', 'Cờ vua nam châm', 'Đang cập nhật', 95000, 0, 'C0002'],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nhasach');
  const c = await Category.bulkWrite(cats.map(([_id, name, group]) => ({
    updateOne: { filter: { _id }, update: { $setOnInsert: { _id, name, group, description: '' } }, upsert: true },
  })));
  const b = await Book.bulkWrite(books.map(([_id, title, author, price, stock, categoryId]) => ({
    updateOne: { filter: { _id }, update: { $setOnInsert: { _id, title, author, price, stock, categoryId, description: `${title} - ${author}.`, isActive: true } }, upsert: true },
  })));
  const fix = await Book.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
  console.log(`Danh mục thêm mới: ${c.upsertedCount} · Sách thêm mới: ${b.upsertedCount} · Sách được bật isActive: ${fix.modifiedCount}`);
  await mongoose.disconnect();
})();
