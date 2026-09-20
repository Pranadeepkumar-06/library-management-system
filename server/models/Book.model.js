const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title required'], trim: true, maxlength: 250, index: true },
    subtitle: { type: String, trim: true, maxlength: 250 },
    isbn10: { type: String, trim: true, sparse: true, unique: true, match: [/^[\dX-]{9,13}$/, 'Invalid ISBN-10'] },
    isbn13: { type: String, trim: true, sparse: true, unique: true, match: [/^[\d-]{12,17}$/, 'Invalid ISBN-13'] },
    description: { type: String, maxlength: 10000 },
    authors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true }],
    publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'Publisher', index: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true }],
    language: { type: String, trim: true, default: 'English', index: true },
    publicationDate: { type: Date },
    edition: { type: String, trim: true, maxlength: 50 },
    pages: { type: Number, min: 1 },
    coverImage: { type: String, default: '' },
    bookFormat: { type: String, enum: ['HARDCOVER', 'PAPERBACK', 'EBOOK', 'AUDIOBOOK'], default: 'PAPERBACK' },
    shelfLocation: { type: String, trim: true, maxlength: 50 },
    rackNumber: { type: String, trim: true, maxlength: 50 },

    totalCopies: { type: Number, default: 0, min: 0 },
    availableCopies: { type: Number, default: 0, min: 0 },
    borrowedCopies: { type: Number, default: 0, min: 0 },
    reservedCopies: { type: Number, default: 0, min: 0 },
    damagedCopies: { type: Number, default: 0, min: 0 },
    lostCopies: { type: Number, default: 0, min: 0 },

    price: { type: Number, min: 0 },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    status: { type: String, enum: ['AVAILABLE', 'UNAVAILABLE', 'ARCHIVED'], default: 'AVAILABLE', index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', subtitle: 'text', description: 'text', tags: 'text' });

bookSchema.pre('validate', function (next) {
  const sum =
    (this.availableCopies || 0) +
    (this.borrowedCopies || 0) +
    (this.reservedCopies || 0) +
    (this.damagedCopies || 0) +
    (this.lostCopies || 0);
  if (sum > (this.totalCopies || 0)) {
    return next(new Error(`Copy counters (${sum}) exceed totalCopies (${this.totalCopies})`));
  }
  next();
});

module.exports = mongoose.model('Book', bookSchema);
