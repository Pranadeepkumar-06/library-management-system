const mongoose = require('mongoose');
const Fine = require('../models/Fine.model');
const User = require('../models/User.model');
const Loan = require('../models/Loan.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');

const populate = [
  { path: 'member', select: 'firstName lastName email username membershipId' },
  { path: 'loan', select: 'status dueDate book bookCopy' },
];

const listFines = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const sort = parseSort(req, ['createdAt', 'amount', 'status']);
  const filter = {};
  if (req.user.role === 'MEMBER') {
    filter.member = req.user._id;
  } else if (req.query.member && mongoose.Types.ObjectId.isValid(req.query.member)) {
    filter.member = req.query.member;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.reason) filter.reason = req.query.reason;
  const [total, items] = await Promise.all([
    Fine.countDocuments(filter),
    Fine.find(filter).populate(populate).sort(sort).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Fines fetched', data: items, page, limit, total });
});

const getFine = asyncHandler(async (req, res) => {
  const fine = await Fine.findById(req.params.id).populate(populate);
  if (!fine) throw ApiError.notFound('Fine not found', 'FINE_NOT_FOUND');
  if (req.user.role === 'MEMBER' && fine.member._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Cannot view others fines', 'FORBIDDEN');
  }
  return ApiResponse.success(res, { message: 'Fine fetched', data: { fine } });
});

const createFine = asyncHandler(async (req, res) => {
  const { memberId, loanId, amount, reason = 'OTHER', dueDate, notes } = req.body;
  const member = await User.findById(memberId);
  if (!member) throw ApiError.notFound('Member not found', 'USER_NOT_FOUND');
  if (loanId) {
    const loan = await Loan.findById(loanId);
    if (!loan) throw ApiError.notFound('Loan not found', 'LOAN_NOT_FOUND');
    if (loan.member.toString() !== memberId) throw ApiError.badRequest('Loan does not belong to member', 'MISMATCH');
  }
  const fine = await Fine.create({ member: memberId, loan: loanId || undefined, amount, reason, dueDate, notes });
  await logAudit({ req, action: 'FINE_CREATED', entityType: 'Fine', entityId: fine._id, description: `${reason} $${amount} for ${member.email}` });
  return ApiResponse.success(res, { statusCode: 201, message: 'Fine created', data: { fine } });
});

const payFine = asyncHandler(async (req, res) => {
  const fine = await Fine.findById(req.params.id);
  if (!fine) throw ApiError.notFound('Fine not found', 'FINE_NOT_FOUND');
  if (fine.status !== 'PENDING') throw ApiError.badRequest(`Fine is ${fine.status.toLowerCase()}`, 'NOT_PENDING');
  fine.status = 'PAID';
  fine.paidDate = new Date();
  fine.paidBy = req.user._id;
  if (req.body.paymentMethod) fine.paymentMethod = req.body.paymentMethod;
  if (req.body.notes) fine.notes = req.body.notes;
  await fine.save();
  await logAudit({ req, action: 'FINE_PAID', entityType: 'Fine', entityId: fine._id, description: `Paid $${fine.amount}` });
  return ApiResponse.success(res, { message: 'Fine marked paid', data: { fine } });
});

const waiveFine = asyncHandler(async (req, res) => {
  const fine = await Fine.findById(req.params.id);
  if (!fine) throw ApiError.notFound('Fine not found', 'FINE_NOT_FOUND');
  if (fine.status !== 'PENDING') throw ApiError.badRequest(`Fine is ${fine.status.toLowerCase()}`, 'NOT_PENDING');
  fine.status = 'WAIVED';
  if (req.body.notes) fine.notes = req.body.notes;
  await fine.save();
  await logAudit({ req, action: 'FINE_WAIVED', entityType: 'Fine', entityId: fine._id, description: `Waived $${fine.amount}` });
  return ApiResponse.success(res, { message: 'Fine waived', data: { fine } });
});

module.exports = { listFines, getFine, createFine, payFine, waiveFine };
