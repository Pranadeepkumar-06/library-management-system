const Notification = require('../models/Notification.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');
const User = require('../models/User.model');

const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const sort = parseSort(req, ['createdAt']);
  const filter = { user: req.user._id };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.isRead === 'true') filter.isRead = true;
  if (req.query.isRead === 'false') filter.isRead = false;
  const [total, unread, items] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  res.set('X-Unread-Count', String(unread));
  return ApiResponse.paginated(res, { message: 'Notifications fetched', data: items, page, limit, total });
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
  return ApiResponse.success(res, { message: 'Unread count', data: { unread: count } });
});

const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  if (!n.isRead) {
    n.isRead = true;
    n.readAt = new Date();
    await n.save();
  }
  return ApiResponse.success(res, { message: 'Marked read', data: { notification: n } });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
  return ApiResponse.success(res, { message: 'All marked read', data: null });
});

const clearAll = asyncHandler(async (req, res) => {
  const r = await Notification.deleteMany({ user: req.user._id });
  return ApiResponse.success(res, { message: `Cleared ${r.deletedCount} notification(s)`, data: { cleared: r.deletedCount } });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  await n.deleteOne();
  return ApiResponse.success(res, { message: 'Deleted', data: null });
});

// POST /api/notifications/broadcast (ADMIN): {title,message,type?,role?,userId?}
const broadcast = asyncHandler(async (req, res) => {
  const { title, message, type = 'SYSTEM', role, userId } = req.body;
  if (!title || !message) throw ApiError.badRequest('title and message required', 'VALIDATION_ERROR');
  let targets = [];
  if (userId) {
    const u = await User.findById(userId);
    if (!u) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    targets = [u._id];
  } else if (role) {
    targets = (await User.find({ role, status: 'ACTIVE' }).select('_id')).map((u) => u._id);
  } else {
    targets = (await User.find({ status: 'ACTIVE' }).select('_id')).map((u) => u._id);
  }
  if (!targets.length) return ApiResponse.success(res, { message: 'No recipients', data: { sent: 0 } });
  const docs = targets.map((uid) => ({ user: uid, type, title: String(title).slice(0, 150), message: String(message).slice(0, 2000) }));
  // insert in batches
  let sent = 0;
  for (let i = 0; i < docs.length; i += 500) {
    await Notification.insertMany(docs.slice(i, i + 500), { ordered: false });
    sent += Math.min(500, docs.length - i);
  }
  await logAudit({ req, action: 'NOTIFICATION_SENT', entityType: 'Notification', description: `Broadcast "${title}" to ${sent}` });
  return ApiResponse.success(res, { statusCode: 201, message: `Sent to ${sent} user(s)`, data: { sent } });
});

module.exports = { listNotifications, unreadCount, markRead, markAllRead, clearAll, deleteNotification, broadcast };
