const { Schema, model } = require('mongoose');
module.exports = model('Category', new Schema(
  { _id: String, name: { type: String, required: true, trim: true }, description: { type: String, default: '' }, group: { type: String, default: 'Sách' } },
  { collection: 'categories', timestamps: true, versionKey: false }
));
