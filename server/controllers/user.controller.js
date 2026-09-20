const User = require('../models/User.model');
const Loan = require('../models/Loan.model');
const LibrarySettings = require('../models/LibrarySettings.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const sort = parseSort(req, ['createdAt', 'firstName', 'email', 'role', 'lastLogin']);
  const { role, status, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(String(search).trim().slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { username: rx }, { email: rx }, { membershipId: rx }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort(sort).skip(skip).limit(limit),
  ]);
  const data = users.map((u) => u.toSafeJSON());
  return ApiResponse.paginated(res, { message: 'Users fetched', data, page, limit, total });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  // Members can only view themselves; staff can view anyone
  if (req.user.role === 'MEMBER' && req.user._id.toString() !== user._id.toString()) {
    throw ApiError.forbidden('Insufficient permissions', 'FORBIDDEN');
  }
  return ApiResponse.success(res, { message: 'User fetched', data: { user: user.toSafeJSON() } });
});

const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, password, role = 'MEMBER', phone, address, city, state, country } = req.body;

  // Librarians can only create members
  if (req.user.role === 'LIBRARIAN' && role !== 'MEMBER') {
    throw ApiError.forbidden('Librarians can only create members', 'FORBIDDEN');
  }
  const existing = await User.findOne({ $or: [{ email: String(email).toLowerCase() }, { username: String(username).toLowerCase() }] });
  if (existing) {
    if (existing.email === String(email).toLowerCase()) throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
    throw ApiError.conflict('Username already taken', 'USERNAME_EXISTS');
  }
  const settings = await LibrarySettings.getSettings();
  const now = new Date();
  const user = new User({
    firstName, lastName, username: String(username).toLowerCase(), email: String(email).toLowerCase(),
    password, role, phone, address, city, state, country, status: 'ACTIVE',
    membershipStartDate: role === 'MEMBER' ? now : undefined,
    membershipExpiryDate: role === 'MEMBER' ? new Date(now.getTime() + (settings.membershipDurationDays || 365) * 864e5) : undefined,
  });
  await user.save();
  await logAudit({ req, action: 'USER_CREATED', entityType: 'User', entityId: user._id, description: `Created ${role}: ${user.email}` });
  return ApiResponse.success(res, { statusCode: 201, message: 'User created', data: { user: user.toSafeJSON() } });
});

const updateUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

  if (req.user.role === 'LIBRARIAN') {
    if (target.role !== 'MEMBER') throw ApiError.forbidden('Librarians can only edit members', 'FORBIDDEN');
    if (req.body.role && req.body.role !== 'MEMBER') throw ApiError.forbidden('Cannot change role', 'FORBIDDEN');
    if (req.body.status) throw ApiError.forbidden('Cannot change status', 'FORBIDDEN');
  }
  if (req.body.email && req.body.email.toLowerCase() !== target.email) {
    const dup = await User.findOne({ email: req.body.email.toLowerCase() });
    if (dup) throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
  }
  if (req.body.username && req.body.username.toLowerCase() !== target.username) {
    const dup = await User.findOne({ username: req.body.username.toLowerCase() });
    if (dup) throw ApiError.conflict('Username already taken', 'USERNAME_EXISTS');
  }
  const oldRole = target.role;
  const allowed = ['firstName', 'lastName', 'email', 'username', 'phone', 'address', 'city', 'state', 'country', 'postalCode', 'dateOfBirth', 'profileImage', 'password'];
  if (req.user.role === 'ADMIN') allowed.push('role', 'status');
  for (const key of allowed) {
    if (req.body[key] !== undefined) target[key] = req.body[key];
  }
  await target.save();
  const desc = oldRole !== target.role ? `Role ${oldRole} -> ${target.role} for ${target.email}` : `Updated user ${target.email}`;
  await logAudit({ req, action: oldRole !== target.role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED', entityType: 'User', entityId: target._id, description: desc });
  return ApiResponse.success(res, { message: 'User updated', data: { user: target.toSafeJSON() } });
});

const deleteUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  if (target._id.toString() === req.user._id.toString()) throw ApiError.badRequest('Cannot delete yourself', 'SELF_DELETE');
  const activeLoans = await Loan.countDocuments({ member: target._id, status: { $in: ['BORROWED', 'OVERDUE'] } });
  if (activeLoans > 0) throw ApiError.badRequest('User has active loans; deactivate instead', 'HAS_ACTIVE_LOANS');
  const anyLoans = await Loan.countDocuments({ $or: [{ member: target._id }, { issuedBy: target._id }] });
  if (anyLoans > 0) throw ApiError.badRequest('User has loan history; deactivate instead of delete', 'HAS_HISTORY');
  await target.deleteOne();
  await logAudit({ req, action: 'USER_DELETED', entityType: 'User', entityId: target._id, description: `Deleted ${target.email}` });
  return ApiResponse.success(res, { message: 'User deleted', data: null });
});

const updateStatus = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  if (target._id.toString() === req.user._id.toString()) throw ApiError.badRequest('Cannot change own status', 'SELF_STATUS');
  target.status = req.body.status;
  await target.save({ validateBeforeSave: false });
  await logAudit({ req, action: 'USER_STATUS_CHANGED', entityType: 'User', entityId: target._id, description: `Status -> ${target.status} for ${target.email}` });
  return ApiResponse.success(res, { message: 'Status updated', data: { user: target.toSafeJSON() } });
});

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, updateStatus };
