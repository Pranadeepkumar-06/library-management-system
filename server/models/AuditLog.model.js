const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true, maxlength: 60 },
    entityType: { type: String, maxlength: 40, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, maxlength: 2000 },
    ipAddress: { type: String, maxlength: 60 },
    userAgent: { type: String, maxlength: 500 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
