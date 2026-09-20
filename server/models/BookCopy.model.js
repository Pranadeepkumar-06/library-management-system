const mongoose = require('mongoose');

const bookCopySchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    accessionNumber: { type: String, required: true, unique: true, trim: true, index: true },
    barcode: { type: String, required: true, unique: true, trim: true, index: true },
    copyNumber: { type: Number, required: true, min: 1 },
    condition: {
      type: String,
      enum: ['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'LOST'],
      default: 'GOOD',
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'BORROWED', 'RESERVED', 'LOST', 'DAMAGED', 'MAINTENANCE'],
      default: 'AVAILABLE',
      index: true,
    },
    shelfLocation: { type: String, trim: true, maxlength: 50 },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number, min: 0 },
    supplier: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true }
);

bookCopySchema.index({ book: 1, status: 1 });
bookCopySchema.index({ book: 1, copyNumber: 1 }, { unique: true });

module.exports = mongoose.model('BookCopy', bookCopySchema);
