const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    reservationDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    queuePosition: { type: Number, min: 1 },
    fulfilledAt: { type: Date },
    // Copy held for this reservation (set on return when queue head is notified)
    bookCopy: { type: mongoose.Schema.Types.ObjectId, ref: 'BookCopy' },
    // Loan created when this reservation is fulfilled via issue
    fulfilledLoan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
  },
  { timestamps: true }
);

// One active reservation per member per book
reservationSchema.index(
  { member: 1, book: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);
reservationSchema.index({ book: 1, status: 1, reservationDate: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
