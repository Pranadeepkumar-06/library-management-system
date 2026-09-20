const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    bookCopy: { type: mongoose.Schema.Types.ObjectId, ref: 'BookCopy', required: true, index: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true, index: true },
    returnedAt: { type: Date },
    returnedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['BORROWED', 'RETURNED', 'OVERDUE', 'LOST'], default: 'BORROWED', index: true },
    renewalCount: { type: Number, default: 0, min: 0 },
    maxRenewals: { type: Number, default: 2, min: 0 },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

loanSchema.index({ member: 1, status: 1 });
loanSchema.index({ status: 1, dueDate: 1 });
loanSchema.index({ bookCopy: 1, status: 1 });

module.exports = mongoose.model('Loan', loanSchema);
