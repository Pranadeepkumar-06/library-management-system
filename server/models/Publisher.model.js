const mongoose = require('mongoose');

const publisherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
    description: { type: String, maxlength: 2000 },
    website: { type: String, trim: true, maxlength: 200 },
    email: { type: String, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    phone: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 200 },
    country: { type: String, trim: true, maxlength: 80 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Publisher', publisherSchema);
