const { Schema, model } = require('mongoose');

const schema = new Schema(
  {
    _id: String,
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'customer'], default: 'customer' },
    status: { type: String, enum: ['active', 'locked'], default: 'active' },
    address: { type: String, default: '' },
  },
  { collection: 'users', timestamps: true, versionKey: false }
);
schema.set('toJSON', { transform: (_d, ret) => { delete ret.passwordHash; return ret; } });
module.exports = model('User', schema);
