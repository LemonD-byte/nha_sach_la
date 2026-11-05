exports.notFound = (_req, res) => res.status(404).json({ message: 'Không tìm thấy đường dẫn' });
// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Lỗi máy chủ';
  if (err.code === 11000) { status = 409; message = 'Dữ liệu bị trùng (ví dụ email đã tồn tại)'; }
  if (err.name === 'ValidationError') status = 400;
  if (status === 500) console.error(err);
  res.status(status).json({ message });
};
