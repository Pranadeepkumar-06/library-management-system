const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', index: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: ['LATE_RETURN', 'LOST_BOOK', 'DAMAGED_BOOK', 'OTHER'], default: 'LATE_RETURN', index: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'WAIVED'], default: 'PENDING', index: true },
    issuedDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    paidDate: { type: Date },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentMethod: { type: String, trim: true, maxlength: 50 },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

fineSchema.index({ member: 1, status: 1 });

module.exports = mongoose.model('Fine', fineSchema);
