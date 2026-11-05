const mongoose = require('mongoose');

module.exports = async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nhasach');
    console.log('✔ Đã kết nối MongoDB:', mongoose.connection.name);
  } catch (err) {
    console.error('✘ Không kết nối được MongoDB:', err.message);
    process.exit(1);
  }
};
