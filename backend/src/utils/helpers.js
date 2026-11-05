const Counter = require('../models/Counter');

const httpError = (status, message) => Object.assign(new Error(message), { status });
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Lấy số thứ tự kế tiếp từ collection counters. `seed` là giá trị đã dùng nếu counter chưa tồn tại. */
async function nextSeq(id, seed = 0) {
  const found = await Counter.findOneAndUpdate({ _id: id }, { $inc: { seq: 1 } }, { new: true });
  if (found) return found.seq;
  try {
    return (await Counter.create({ _id: id, seq: seed + 1 })).seq;
  } catch (e) {
    return nextSeq(id, seed); // race condition: counter vừa được tạo bởi request khác
  }
}
const pad = (n, len = 4) => String(n).padStart(len, '0');

module.exports = { httpError, asyncHandler, nextSeq, pad };
