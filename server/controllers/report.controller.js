const mongoose = require('mongoose');
const Loan = require('../models/Loan.model');
const Fine = require('../models/Fine.model');
const Book = require('../models/Book.model');
const BookCopy = require('../models/BookCopy.model');
const User = require('../models/User.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const dateFilter = (req, field = 'issuedAt') => {
  const match = {};
  if (req.query.from || req.query.to) {
    match[field] = {};
    if (req.query.from) match[field].$gte = new Date(req.query.from);
    if (req.query.to) match[field].$lte = new Date(req.query.to);
  }
  return match;
};
const limitOf = (req, def = 10) => Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || def));

const mostBorrowed = asyncHandler(async (req, res) => {
  const data = await Loan.aggregate([
    { $match: { ...dateFilter(req) } },
    { $group: { _id: '$book', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitOf(req) },
    { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { $project: { _id: 0, bookId: '$_id', title: '$book.title', isbn13: '$book.isbn13', count: 1 } },
  ]);
  return ApiResponse.success(res, { message: 'Most borrowed books', data });
});

const leastBorrowed = asyncHandler(async (req, res) => {
  const data = await Loan.aggregate([
    { $match: { ...dateFilter(req) } },
    { $group: { _id: '$book', count: { $sum: 1 } } },
    { $sort: { count: 1 } },
    { $limit: limitOf(req) },
    { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
    { $unwind: '$book' },
    { $project: { _id: 0, bookId: '$_id', title: '$book.title', count: 1 } },
  ]);
  return ApiResponse.success(res, { message: 'Least borrowed books', data });
});

const mostActiveMembers = asyncHandler(async (req, res) => {
  const data = await Loan.aggregate([
    { $match: { ...dateFilter(req) } },
    { $group: { _id: '$member', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitOf(req) },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 0, memberId: '$_id', name: { $concat: ['$user.firstName', ' ', '$user.lastName'] }, email: '$user.email', count: 1 } },
  ]);
  return ApiResponse.success(res, { message: 'Most active members', data });
});

const overdueReport = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10) || 20);
  const [total, items] = await Promise.all([
    Loan.countDocuments({ status: 'OVERDUE' }),
    Loan.find({ status: 'OVERDUE' }).populate('member', 'firstName lastName email').populate('book', 'title').sort({ dueDate: 1 }).skip(skip).limit(Math.min(100, parseInt(limit, 10) || 20)),
  ]);
  return ApiResponse.paginated(res, { message: 'Overdue report', data: items, page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20, total });
});

const finesReport = asyncHandler(async (req, res) => {
  const match = {};
  if (req.query.from || req.query.to) {
    match.issuedDate = {};
    if (req.query.from) match.issuedDate.$gte = new Date(req.query.from);
    if (req.query.to) match.issuedDate.$lte = new Date(req.query.to);
  }
  const [byStatus, total] = await Promise.all([
    Fine.aggregate([{ $match: match }, { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Fine.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);
  return ApiResponse.success(res, { message: 'Fine report', data: { byStatus, total: total[0] || { total: 0, count: 0 } } });
});

const booksBy = (field, lookup) => asyncHandler(async (req, res) => {
  const data = await Book.aggregate([
    { $unwind: `$${field}` },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $lookup: { from: lookup.from, localField: '_id', foreignField: '_id', as: 'ref' } },
    { $unwind: { path: '$ref', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, id: '$_id', name: lookup.name, count: 1 } },
    { $sort: { count: -1 } },
  ]);
  return ApiResponse.success(res, { message: `Books by ${field}`, data });
});

const monthlyStats = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const borrowing = await Loan.aggregate([
    { $match: { issuedAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) } } },
    { $group: { _id: { $month: '$issuedAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const returns = await Loan.aggregate([
    { $match: { returnedAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) } } },
    { $group: { _id: { $month: '$returnedAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const newMembers = await User.aggregate([
    { $match: { role: 'MEMBER', createdAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) } } },
    { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return ApiResponse.success(res, { message: `Monthly stats ${year}`, data: { borrowing, returns, newMembers } });
});

const lostDamaged = asyncHandler(async (req, res) => {
  const [copies, books] = await Promise.all([
    BookCopy.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Book.aggregate([{ $group: { _id: null, lost: { $sum: '$lostCopies' }, damaged: { $sum: '$damagedCopies' }, total: { $sum: '$totalCopies' } } }]),
  ]);
  return ApiResponse.success(res, { message: 'Lost/damaged report', data: { copies, books: books[0] || {} } });
});

module.exports = {
  mostBorrowed, leastBorrowed, mostActiveMembers, overdueReport, finesReport,
  booksByCategory: booksBy('categories', { from: 'categories', name: '$ref.name' }),
  booksByLanguage: asyncHandler(async (req, res) => {
    const data = await Book.aggregate([{ $group: { _id: '$language', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    return ApiResponse.success(res, { message: 'Books by language', data });
  }),
  booksByAuthor: asyncHandler(async (req, res) => {
    const data = await Book.aggregate([
      { $unwind: '$authors' },
      { $group: { _id: '$authors', count: { $sum: 1 } } },
      { $lookup: { from: 'authors', localField: '_id', foreignField: '_id', as: 'ref' } },
      { $unwind: '$ref' },
      { $project: { _id: 0, id: '$_id', name: '$ref.fullName', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: limitOf(req) },
    ]);
    return ApiResponse.success(res, { message: 'Books by author', data });
  }),
  monthlyStats, lostDamaged,
};
