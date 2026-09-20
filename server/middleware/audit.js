const AuditLog = require('../models/AuditLog.model');

// Fire-and-forget audit writer. Never throws.
const logAudit = async ({ req, user, action, entityType, entityId, description }) => {
  try {
    await AuditLog.create({
      user: user || (req && req.user ? req.user._id : undefined),
      action,
      entityType,
      entityId,
      description,
      ipAddress: req ? (req.ip || req.headers['x-forwarded-for'] || '') : '',
      userAgent: req ? (req.headers['user-agent'] || '') : '',
    });
  } catch (e) {
    // swallow - audit must never break main flow
  }
};

module.exports = logAudit;
