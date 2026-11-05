const { Schema, model } = require('mongoose');

module.exports = model('Order', new Schema(
  {
    _id: String,
    orderCode: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    handledBy: { type: String, default: null },
    items: [{ _id: false, bookId: String, title: String, price: Number, quantity: Number }],
    shippingInfo: { receiverName: String, phone: String, address: String },
    paymentMethod: { type: String, enum: ['COD', 'BANK'], default: 'COD' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    codAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'], default: 'pending' },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    deliveryAttempts: { type: Number, default: 0 },
    statusHistory: [{ _id: false, status: String, at: { type: Date, default: Date.now }, by: { type: String, default: null }, note: { type: String, default: '' } }],
  },
  { collection: 'orders', timestamps: true }
));
