const Order = require('../models/Order');
const Book = require('../models/Book');
const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');

exports.overview = asyncHandler(async (_req, res) => {
  const [byStatus, revenue, topBooks, customers, books, lowStock] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { paymentStatus: 'paid', status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } }, { $unwind: '$items' },
      { $group: { _id: '$items.bookId', title: { $first: '$items.title' }, sold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { sold: -1 } }, { $limit: 5 },
    ]),
    User.countDocuments({ role: 'customer' }),
    Book.countDocuments({ isActive: true }),
    Book.find({ isActive: true, stock: { $lte: 10 } }).sort({ stock: 1 }).limit(8).select('title stock'),
  ]);
  res.json({
    orders: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    revenue: revenue[0]?.total || 0, topBooks, customers, books, lowStock,
  });
});
