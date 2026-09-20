const mongoose = require('mongoose');
const Reservation = require('../models/Reservation.model');
const Book = require('../models/Book.model');
const BookCopy = require('../models/BookCopy.model');
const Loan = require('../models/Loan.model');
const LibrarySettings = require('../models/LibrarySettings.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');
const { issueLoan } = require('../services/loan.service');

const DAY = 864e5;
const populate = [
  { path: 'member', select: 'firstName lastName email username membershipId' },
  { path: 'book', select: 'title isbn13 availableCopies status' },
  { path: 'bookCopy', select: 'accessionNumber barcode copyNumber status' },
  { path: 'fulfilledLoan', select: 'status dueDate' },
];

const createReservation = asyncHandler(async (req, res) => {
  const settings = await LibrarySettings.getSettings();
  if (!settings.allowReservations) throw ApiError.badRequest('Reservations disabled', 'RESERVATIONS_DISABLED');

  // Member id: staff may pass memberId, members always self
  const memberId = req.user.role === 'MEMBER' ? req.user._id.toString() : (req.body.memberId || req.user._id.toString());
  const { bookId } = req.body;
  if (!bookId) throw ApiError.badRequest('bookId required', 'BOOK_REQUIRED');

  const book = await Book.findById(bookId);
  if (!book) throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');

  const User = require('../models/User.model');
  const memberUser = await User.findById(memberId);
  if (!memberUser) throw ApiError.notFound('Member not found', 'USER_NOT_FOUND');
  if (memberUser.status !== 'ACTIVE') throw ApiError.badRequest('Member inactive', 'MEMBER_INACTIVE');

  // Cannot reserve if already actively borrowing same book
  const borrowing = await Loan.countDocuments({ member: memberId, book: bookId, status: { $in: ['BORROWED', 'OVERDUE'] } });
  if (borrowing > 0) throw ApiError.badRequest('Already borrowing this book', 'ALREADY_BORROWED');

  const activeCount = await Reservation.countDocuments({ member: memberId, status: 'ACTIVE' });
  if (activeCount >= 5) throw ApiError.badRequest('Too many active reservations (max 5)', 'LIMIT_REACHED');

  const position = (await Reservation.countDocuments({ book: bookId, status: 'ACTIVE' })) + 1;
  const now = new Date();
  try {
    const r = await Reservation.create({
      member: memberId, book: bookId,
      reservationDate: now,
      expiryDate: new Date(now.getTime() + settings.reservationDurationDays * DAY),
      status: 'ACTIVE', queuePosition: position,
    });
    await logAudit({ req, action: 'RESERVATION_CREATED', entityType: 'Reservation', entityId: r._id, description: `Reserved ${book.title} (#${position})` });
    const populated = await Reservation.findById(r._id).populate(populate);
    return ApiResponse.success(res, { statusCode: 201, message: `Reserved (queue #${position})`, data: { reservation: populated } });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Already reserved this book', 'ALREADY_RESERVED');
    throw e;
  }
});

const listReservations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const sort = parseSort(req, ['reservationDate', 'createdAt']);
  const filter = {};
  if (req.user.role === 'MEMBER') {
    filter.member = req.user._id;
  } else {
    if (req.query.member && mongoose.Types.ObjectId.isValid(req.query.member)) filter.member = req.query.member;
  }
  if (req.query.book && mongoose.Types.ObjectId.isValid(req.query.book)) filter.book = req.query.book;
  if (req.query.status) filter.status = req.query.status;
  const [total, items] = await Promise.all([
    Reservation.countDocuments(filter),
    Reservation.find(filter).populate(populate).sort(sort).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Reservations fetched', data: items, page, limit, total });
});

const cancelReservation = asyncHandler(async (req, res) => {
  const r = await Reservation.findById(req.params.id);
  if (!r) throw ApiError.notFound('Reservation not found', 'RESERVATION_NOT_FOUND');
  if (req.user.role === 'MEMBER' && r.member.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Cannot cancel others reservations', 'FORBIDDEN');
  }
  if (r.status !== 'ACTIVE') throw ApiError.badRequest(`Already ${r.status.toLowerCase()}`, 'NOT_ACTIVE');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      r.status = 'CANCELLED';
      // Release the copy held for this reservation, if any
      if (r.bookCopy) {
        const held = await BookCopy.findById(r.bookCopy).session(session);
        if (held && held.status === 'RESERVED') {
          held.status = 'AVAILABLE';
          await held.save({ session });
          await Book.updateOne({ _id: r.book }, { $inc: { reservedCopies: -1, availableCopies: 1 } }, { session });
        }
        r.bookCopy = undefined;
      }
      await r.save({ session });
    });
  } finally {
    await session.endSession();
  }
  await logAudit({ req, action: 'RESERVATION_CANCELLED', entityType: 'Reservation', entityId: r._id, description: 'Cancelled' });
  return ApiResponse.success(res, { message: 'Reservation cancelled', data: null });
});

// POST /api/reservations/:id/issue (staff one-click: issue to this reservation's member)
const issueReservation = asyncHandler(async (req, res) => {
  const r = await Reservation.findById(req.params.id);
  if (!r) throw ApiError.notFound('Reservation not found', 'RESERVATION_NOT_FOUND');
  if (r.status !== 'ACTIVE') throw ApiError.badRequest(`Reservation is ${r.status.toLowerCase()}`, 'NOT_ACTIVE');
  if (r.expiryDate < new Date()) throw ApiError.badRequest('Reservation expired', 'RESERVATION_EXPIRED');

  const { loan, book } = await issueLoan({
    memberId: r.member, bookId: r.book, notes: `Issued via reservation ${r._id}`, issuedBy: req.user._id,
  });

  await logAudit({ req, action: 'BOOK_ISSUED', entityType: 'Loan', entityId: loan._id, description: `Issued ${book.title} via reservation ${r._id}` });
  const Loan = require('../models/Loan.model');
  const populated = await Loan.findById(loan._id)
    .populate('member', 'firstName lastName email')
    .populate('book', 'title')
    .populate('bookCopy', 'accessionNumber');
  return ApiResponse.success(res, { statusCode: 201, message: 'Book issued to reserver', data: { loan: populated } });
});

module.exports = { createReservation, listReservations, cancelReservation, issueReservation };
