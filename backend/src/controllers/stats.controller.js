const Order = require('../models/Order');
const Book = require('../models/Book');
const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');

const TZ = 'Asia/Ho_Chi_Minh';
const VN_OFFSET = 7 * 3600 * 1000; // UTC+7

exports.overview = asyncHandler(async (_req, res) => {
  // Mốc thời gian theo giờ Việt Nam (tháng hiện tại và năm hiện tại)
  const vnNow = new Date(Date.now() + VN_OFFSET);
  const year = vnNow.getUTCFullYear();
  const month = vnNow.getUTCMonth(); // 0-11
  const monthStart = new Date(Date.UTC(year, month, 1) - VN_OFFSET);
  const monthEnd = new Date(Date.UTC(year, month + 1, 1) - VN_OFFSET);
  const yearStart = new Date(Date.UTC(year, 0, 1) - VN_OFFSET);
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1) - VN_OFFSET);

  const [byStatus, monthlyAgg, topBooks, customers, books, lowStock] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

    // Doanh thu đã thu theo từng tháng trong năm nay (tính theo ngày thanh toán, nếu không có thì ngày đặt)
    Order.aggregate([
      { $match: { paymentStatus: 'paid', status: { $ne: 'cancelled' } } },
      { $addFields: { revDate: { $ifNull: ['$paidAt', '$createdAt'] } } },
      { $match: { revDate: { $gte: yearStart, $lt: yearEnd } } },
      {
        $group: {
          _id: { $month: { date: '$revDate', timezone: TZ } },
          total: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
    ]),

    // Sản phẩm bán chạy nhất trong tháng hiện tại
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: monthStart, $lt: monthEnd } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.bookId',
          title: { $first: '$items.title' },
          sold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 5 },
    ]),

    User.countDocuments({ role: 'customer' }),
    Book.countDocuments({ isActive: true }),
    Book.find({ isActive: true, stock: { $lte: 10 } }).sort({ stock: 1 }).limit(8).select('title stock'),
  ]);

  // Luôn trả đủ 12 tháng (tháng chưa có đơn = 0)
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyAgg.find((m) => m._id === i + 1);
    return { month: i + 1, revenue: found?.total || 0, orders: found?.orders || 0 };
  });

  res.json({
    orders: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    year,
    month: month + 1,
    revenue: monthlyRevenue[month].revenue, // doanh thu tháng hiện tại
    monthlyRevenue,
    topBooks,
    customers,
    books,
    lowStock,
  });
});