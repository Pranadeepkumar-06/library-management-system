const AuditLog = require('../models/AuditLog.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');
const mongoose = require('mongoose');

const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 25 });
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.userId && mongoose.Types.ObjectId.isValid(req.query.userId)) filter.user = req.query.userId;
  if (req.query.search) {
    filter.description = new RegExp(String(req.query.search).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  if (req.query.from || req.query.to) {
    filter.timestamp = {};
    if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
    if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
  }
  const [total, items] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter).populate('user', 'firstName lastName email role').sort({ timestamp: -1 }).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Audit logs fetched', data: items, page, limit, total });
});

const getAuditLog = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id).populate('user', 'firstName lastName email role');
  if (!log) return res.status(404).json({ success: false, message: 'Audit log not found', error: 'NOT_FOUND' });
  return ApiResponse.success(res, { message: 'Audit log fetched', data: { log } });
});

module.exports = { listAuditLogs, getAuditLog };
