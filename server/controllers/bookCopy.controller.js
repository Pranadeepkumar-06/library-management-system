const mongoose = require('mongoose');
const crypto = require('crypto');
const Book = require('../models/Book.model');
const BookCopy = require('../models/BookCopy.model');
const Loan = require('../models/Loan.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');

// Map copy status -> book counter field (MAINTENANCE has no bucket)
const statusToCounter = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'availableCopies';
    case 'BORROWED': return 'borrowedCopies';
    case 'RESERVED': return 'reservedCopies';
    case 'DAMAGED': return 'damagedCopies';
    case 'LOST': return 'lostCopies';
    default: return null; // MAINTENANCE
  }
};

const listCopies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const sort = parseSort(req, ['createdAt', 'copyNumber', 'status']);
  const filter = {};
  if (req.query.book && mongoose.Types.ObjectId.isValid(req.query.book)) filter.book = req.query.book;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ accessionNumber: rx }, { barcode: rx }];
  }
  const [total, items] = await Promise.all([
    BookCopy.countDocuments(filter),
    BookCopy.find(filter).populate('book', 'title isbn13').sort(sort).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Copies fetched', data: items, page, limit, total });
});

const getCopy = asyncHandler(async (req, res) => {
  const copy = await BookCopy.findById(req.params.id).populate('book', 'title isbn13');
  if (!copy) throw ApiError.notFound('Copy not found', 'COPY_NOT_FOUND');
  return ApiResponse.success(res, { message: 'Copy fetched', data: { copy } });
});

const initials = (title) => {
  const words = String(title || 'BK').toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const code = words.slice(0, 2).map((w) => w.slice(0, 2)).join('') || 'BK';
  return code.slice(0, 4);
};

const createCopy = asyncHandler(async (req, res) => {
  const { book: bookId, accessionNumber, barcode, copyNumber, condition = 'GOOD', status = 'AVAILABLE', shelfLocation, purchaseDate, purchasePrice, supplier } = req.body;
  const book = await Book.findById(bookId);
  if (!book) throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  if (['BORROWED', 'RESERVED'].includes(status)) {
    throw ApiError.badRequest('Copies must be created as AVAILABLE (loans/reservations set other states)', 'INVALID_STATUS');
  }

  const session = await mongoose.startSession();
  let copy;
  try {
    await session.withTransaction(async () => {
      const count = await BookCopy.countDocuments({ book: book._id }).session(session);
      const nextNum = copyNumber || count + 1;
      const dupNum = await BookCopy.findOne({ book: book._id, copyNumber: nextNum }).session(session);
      if (dupNum) throw ApiError.conflict(`Copy number ${nextNum} already exists for this book`, 'COPY_EXISTS');
      const prefix = initials(book.title);
      const acc = accessionNumber || `${prefix}-${String(nextNum).padStart(3, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const bar = barcode || `${acc}-BC`;

      const created = await BookCopy.create([{
        book: book._id, accessionNumber: acc, barcode: bar, copyNumber: nextNum,
        condition, status, shelfLocation, purchaseDate, purchasePrice, supplier,
      }], { session });
      copy = created[0];

      const counter = statusToCounter(status);
      const inc = { totalCopies: 1 };
      if (counter) inc[counter] = 1;
      await Book.updateOne({ _id: book._id }, { $inc: inc }, { session });
    });
  } finally {
    await session.endSession();
  }

  await logAudit({ req, action: 'BOOK_COPY_CREATED', entityType: 'BookCopy', entityId: copy._id, description: `Copy ${copy.accessionNumber} for ${book.title}` });
  const populated = await BookCopy.findById(copy._id).populate('book', 'title');
  return ApiResponse.success(res, { statusCode: 201, message: 'Copy created', data: { copy: populated } });
});

const updateCopy = asyncHandler(async (req, res) => {
  const copy = await BookCopy.findById(req.params.id);
  if (!copy) throw ApiError.notFound('Copy not found', 'COPY_NOT_FOUND');
  if (req.body.book && req.body.book !== copy.book.toString()) {
    throw ApiError.badRequest('Cannot move a copy to another book', 'IMMUTABLE_BOOK');
  }
  if (copy.status === 'BORROWED' && req.body.status && req.body.status !== 'BORROWED') {
    throw ApiError.badRequest('Borrowed copies change state only via return flow', 'COPY_BORROWED');
  }
  if (req.body.status === 'BORROWED' || req.body.status === 'RESERVED') {
    throw ApiError.badRequest('Use loan/reservation flows to set BORROWED/RESERVED', 'INVALID_STATUS');
  }

  const oldStatus = copy.status;
  const newStatus = req.body.status || oldStatus;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      Object.assign(copy, req.body);
      await copy.save({ session });
      if (newStatus !== oldStatus) {
        const dec = statusToCounter(oldStatus);
        const inc = statusToCounter(newStatus);
        const update = {};
        if (dec) update[`$inc`] = { ...(update.$inc || {}), [dec]: -1 };
        if (inc) update.$inc = { ...(update.$inc || {}), [inc]: 1 };
        if (Object.keys(update).length) await Book.updateOne({ _id: copy.book }, update, { session });
      }
    });
  } finally {
    await session.endSession();
  }

  await logAudit({ req, action: 'BOOK_COPY_UPDATED', entityType: 'BookCopy', entityId: copy._id, description: `Copy ${copy.accessionNumber}: ${oldStatus} -> ${newStatus}` });
  const populated = await BookCopy.findById(copy._id).populate('book', 'title');
  return ApiResponse.success(res, { message: 'Copy updated', data: { copy: populated } });
});

const deleteCopy = asyncHandler(async (req, res) => {
  const copy = await BookCopy.findById(req.params.id);
  if (!copy) throw ApiError.notFound('Copy not found', 'COPY_NOT_FOUND');
  if (['BORROWED', 'RESERVED'].includes(copy.status)) {
    throw ApiError.badRequest(`Cannot delete a ${copy.status.toLowerCase()} copy`, 'COPY_IN_USE');
  }
  const activeLoan = await Loan.countDocuments({ bookCopy: copy._id, status: { $in: ['BORROWED', 'OVERDUE'] } });
  if (activeLoan > 0) throw ApiError.badRequest('Copy has an active loan', 'COPY_IN_USE');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await BookCopy.deleteOne({ _id: copy._id }).session(session);
      const dec = statusToCounter(copy.status);
      const inc = { totalCopies: -1 };
      if (dec) inc[dec] = -1;
      await Book.updateOne({ _id: copy.book }, { $inc: inc }, { session });
    });
  } finally {
    await session.endSession();
  }
  await logAudit({ req, action: 'BOOK_COPY_DELETED', entityType: 'BookCopy', entityId: copy._id, description: `Deleted ${copy.accessionNumber}` });
  return ApiResponse.success(res, { message: 'Copy deleted', data: null });
});

module.exports = { listCopies, getCopy, createCopy, updateCopy, deleteCopy };
