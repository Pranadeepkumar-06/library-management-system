const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['BOOK_AVAILABLE', 'BOOK_DUE', 'BOOK_OVERDUE', 'RESERVATION', 'FINE', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
