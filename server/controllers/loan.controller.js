const mongoose = require('mongoose');
const Loan = require('../models/Loan.model');
const Book = require('../models/Book.model');
const BookCopy = require('../models/BookCopy.model');
const User = require('../models/User.model');
const Fine = require('../models/Fine.model');
const Reservation = require('../models/Reservation.model');
const Notification = require('../models/Notification.model');
const LibrarySettings = require('../models/LibrarySettings.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');
const sendEmail = require('../utils/sendEmail');
const { issueLoan } = require('../services/loan.service');

const DAY = 864e5;

const pendingFineTotal = async (memberId, session = null) => {
  const q = Fine.aggregate([
    { $match: { member: new mongoose.Types.ObjectId(memberId), status: 'PENDING' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  if (session) q.session(session);
  const r = await q;
  return r.length ? r[0].total : 0;
};

const membershipValid = (user) => {
  if (user.role !== 'MEMBER') return true;
  if (!user.membershipExpiryDate) return true;
  return new Date(user.membershipExpiryDate) >= new Date();
};

const loanPopulate = [
  { path: 'member', select: 'firstName lastName email username membershipId' },
  { path: 'book', select: 'title isbn13 coverImage' },
  { path: 'bookCopy', select: 'accessionNumber barcode copyNumber status' },
  { path: 'issuedBy', select: 'firstName lastName username' },
  { path: 'returnedTo', select: 'firstName lastName username' },
];

// POST /api/loans/issue
const issueBook = asyncHandler(async (req, res) => {
  const { memberId, bookId, bookCopyId, notes } = req.body;

  // Members may only borrow for themselves
  if (req.user.role === 'MEMBER' && req.user._id.toString() !== memberId) {
    throw ApiError.forbidden('Members can only borrow for themselves', 'FORBIDDEN');
  }

  const { loan, book, member } = await issueLoan({ memberId, bookId, bookCopyId, notes, issuedBy: req.user._id });

  await logAudit({ req, action: 'BOOK_ISSUED', entityType: 'Loan', entityId: loan._id, description: `Issued ${book.title} to ${member.email}` });
  const populated = await Loan.findById(loan._id).populate(loanPopulate);
  return ApiResponse.success(res, { statusCode: 201, message: 'Book issued', data: { loan: populated } });
});

// POST /api/loans/:id/return
const returnBook = asyncHandler(async (req, res) => {
  const { condition = 'GOOD', notes } = req.body;
  const loan = await Loan.findById(req.params.id);
  if (!loan) throw ApiError.notFound('Loan not found', 'LOAN_NOT_FOUND');
  if (!['BORROWED', 'OVERDUE'].includes(loan.status)) {
    throw ApiError.badRequest(`Loan is ${loan.status.toLowerCase()}`, 'LOAN_NOT_ACTIVE');
  }

  const settings = await LibrarySettings.getSettings();
  const session = await mongoose.startSession();
  let fine = null;
  let heldFor = null;
  try {
    await session.withTransaction(async () => {
      const book = await Book.findById(loan.book).session(session);
      const copy = await BookCopy.findById(loan.bookCopy).session(session);
      if (!book || !copy) throw ApiError.notFound('Book or copy missing', 'NOT_FOUND');

      const now = new Date();
      const overdueDays = Math.max(0, Math.ceil((now - new Date(loan.dueDate)) / DAY));

      loan.returnedAt = now;
      loan.returnedTo = req.user._id;
      loan.status = 'RETURNED';
      if (notes) loan.notes = notes;
      await loan.save({ session });

      // Overdue fine (create or top-up existing pending late fine for this loan)
      if (overdueDays > 0 && condition !== 'LOST') {
        const amount = Math.min(overdueDays * settings.finePerDay, settings.maximumFine);
        if (amount > 0) {
          const existing = await Fine.findOne({ loan: loan._id, reason: 'LATE_RETURN', status: 'PENDING' }).session(session);
          if (existing) {
            existing.amount = amount;
            await existing.save({ session });
            fine = existing;
          } else {
            const created = await Fine.create([{
              member: loan.member, loan: loan._id, amount, reason: 'LATE_RETURN', status: 'PENDING',
              dueDate: new Date(now.getTime() + 14 * DAY),
              notes: `${overdueDays} day(s) overdue`,
            }], { session });
            fine = created[0];
          }
          await Notification.create([{
            user: loan.member, type: 'FINE',
            title: 'Overdue fine',
            message: `Overdue by ${overdueDays} day(s). Fine: $${amount.toFixed(2)}.`,
          }], { session });
        }
      }

      if (condition === 'LOST') {
        copy.status = 'LOST';
        copy.condition = 'LOST';
        await copy.save({ session });
        await Book.updateOne({ _id: book._id }, { $inc: { borrowedCopies: -1, lostCopies: 1 } }, { session });
        const price = book.price && book.price > 0 ? book.price : 50;
        const created = await Fine.create([{
          member: loan.member, loan: loan._id, amount: Math.min(price, settings.maximumFine || price),
          reason: 'LOST_BOOK', status: 'PENDING', notes: `Lost: ${copy.accessionNumber}`,
        }], { session });
        fine = created[0];
        loan.status = 'LOST';
        await loan.save({ session });
      } else if (condition === 'DAMAGED') {
        copy.status = 'DAMAGED';
        copy.condition = 'DAMAGED';
        await copy.save({ session });
        await Book.updateOne({ _id: book._id }, { $inc: { borrowedCopies: -1, damagedCopies: 1 } }, { session });
      } else {
        // Check reservation queue: hold for first reserver if any
        const next = await Reservation.find({ book: book._id, status: 'ACTIVE', expiryDate: { $gt: now } })
          .sort({ reservationDate: 1 }).limit(1).session(session);
        if (next.length) {
          heldFor = next[0];
          copy.status = 'RESERVED';
          await copy.save({ session });
          heldFor.bookCopy = copy._id; // link held copy to the reservation
          await heldFor.save({ session });
          await Book.updateOne({ _id: book._id }, { $inc: { borrowedCopies: -1, reservedCopies: 1 } }, { session });
          await Notification.create([{
            user: heldFor.member, type: 'BOOK_AVAILABLE',
            title: 'Reserved book available',
            message: `"${book.title}" is now available for pickup (reservation expires ${heldFor.expiryDate.toDateString()}).`,
          }], { session });
          const u = await User.findById(heldFor.member).session(session);
          if (u) await sendEmail({ to: u.email, subject: 'Reserved book available', text: `"${book.title}" is ready for pickup.` });
        } else {
          copy.status = 'AVAILABLE';
          await copy.save({ session });
          await Book.updateOne({ _id: book._id }, { $inc: { borrowedCopies: -1, availableCopies: 1 } }, { session });
        }
      }
    });
  } finally {
    await session.endSession();
  }

  await logAudit({ req, action: 'BOOK_RETURNED', entityType: 'Loan', entityId: loan._id, description: `Returned loan ${loan._id} (${condition})` });
  const populated = await Loan.findById(loan._id).populate(loanPopulate);
  return ApiResponse.success(res, { message: 'Book returned', data: { loan: populated, fine, heldForReservation: heldFor ? heldFor._id : null } });
});

// POST /api/loans/:id/renew
const renewLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id).populate('member');
  if (!loan) throw ApiError.notFound('Loan not found', 'LOAN_NOT_FOUND');
  if (req.user.role === 'MEMBER' && loan.member._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Cannot renew others loans', 'FORBIDDEN');
  }
  if (loan.status !== 'BORROWED') throw ApiError.badRequest(`Only borrowed loans can be renewed (is ${loan.status.toLowerCase()})`, 'LOAN_NOT_RENEWABLE');

  const settings = await LibrarySettings.getSettings();
  if (!settings.allowRenewals) throw ApiError.badRequest('Renewals disabled', 'RENEWALS_DISABLED');
  const maxAllowed = Math.min(loan.maxRenewals ?? 2, settings.maximumRenewals ?? 2);
  if ((loan.renewalCount || 0) >= maxAllowed) throw ApiError.badRequest('Max renewals reached', 'MAX_RENEWALS');

  if (loan.member.status !== 'ACTIVE') throw ApiError.badRequest('Member inactive', 'MEMBER_INACTIVE');
  if (!membershipValid(loan.member)) throw ApiError.badRequest('Membership expired', 'MEMBERSHIP_EXPIRED');
  const fineTotal = await pendingFineTotal(loan.member._id);
  if (fineTotal >= (settings.maximumFine ?? 100) && fineTotal > 0) {
    throw ApiError.badRequest('Blocking unpaid fines', 'BLOCKING_FINES');
  }
  const otherRes = await Reservation.countDocuments({ book: loan.book, status: 'ACTIVE', member: { $ne: loan.member._id } });
  if (otherRes > 0) throw ApiError.badRequest('Book reserved by another member', 'RESERVED_BY_OTHER');

  loan.dueDate = new Date(new Date(loan.dueDate).getTime() + settings.loanDurationDays * DAY);
  loan.renewalCount = (loan.renewalCount || 0) + 1;
  await loan.save();

  await Notification.create({
    user: loan.member._id, type: 'BOOK_DUE', title: 'Loan renewed',
    message: `New due date: ${loan.dueDate.toDateString()} (renewal ${loan.renewalCount}/${maxAllowed}).`,
  });
  await logAudit({ req, action: 'BOOK_RENEWED', entityType: 'Loan', entityId: loan._id, description: `Renewed to ${loan.dueDate.toISOString()}` });
  const populated = await Loan.findById(loan._id).populate(loanPopulate);
  return ApiResponse.success(res, { message: 'Loan renewed', data: { loan: populated } });
});

// POST /api/loans/:id/mark-lost (staff)
const markLost = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id);
  if (!loan) throw ApiError.notFound('Loan not found', 'LOAN_NOT_FOUND');
  if (!['BORROWED', 'OVERDUE'].includes(loan.status)) throw ApiError.badRequest('Only active loans', 'LOAN_NOT_ACTIVE');
  const settings = await LibrarySettings.getSettings();
  const session = await mongoose.startSession();
  let fine;
  try {
    await session.withTransaction(async () => {
      const book = await Book.findById(loan.book).session(session);
      const copy = await BookCopy.findById(loan.bookCopy).session(session);
      loan.status = 'LOST';
      if (req.body.notes) loan.notes = req.body.notes;
      await loan.save({ session });
      copy.status = 'LOST';
      copy.condition = 'LOST';
      await copy.save({ session });
      await Book.updateOne({ _id: book._id }, { $inc: { borrowedCopies: -1, lostCopies: 1 } }, { session });
      const price = book.price && book.price > 0 ? book.price : 50;
      const created = await Fine.create([{
        member: loan.member, loan: loan._id, amount: price, reason: 'LOST_BOOK', status: 'PENDING',
        notes: `Lost: ${copy.accessionNumber}`,
      }], { session });
      fine = created[0];
    });
  } finally {
    await session.endSession();
  }
  await logAudit({ req, action: 'BOOK_LOST', entityType: 'Loan', entityId: loan._id, description: 'Marked lost' });
  return ApiResponse.success(res, { message: 'Marked as lost', data: { fine } });
});

const listLoans = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const sort = parseSort(req, ['createdAt', 'dueDate', 'status']);
  const filter = {};
  if (req.user.role === 'MEMBER') {
    filter.member = req.user._id;
  } else if (req.query.member && mongoose.Types.ObjectId.isValid(req.query.member)) {
    filter.member = req.query.member;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.book && mongoose.Types.ObjectId.isValid(req.query.book)) filter.book = req.query.book;
  if (req.query.overdue === 'true') filter.status = 'OVERDUE';
  const [total, items] = await Promise.all([
    Loan.countDocuments(filter),
    Loan.find(filter).populate(loanPopulate).sort(sort).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Loans fetched', data: items, page, limit, total });
});

const memberLoans = asyncHandler(async (req, res) => {
  if (req.user.role === 'MEMBER' && req.user._id.toString() !== req.params.memberId) {
    throw ApiError.forbidden('Cannot view others loans', 'FORBIDDEN');
  }
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const filter = { member: req.params.memberId };
  if (req.query.status) filter.status = req.query.status;
  const [total, items] = await Promise.all([
    Loan.countDocuments(filter),
    Loan.find(filter).populate(loanPopulate).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Member loans fetched', data: items, page, limit, total });
});

const overdueLoans = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const [total, items] = await Promise.all([
    Loan.countDocuments({ status: 'OVERDUE' }),
    Loan.find({ status: 'OVERDUE' }).populate(loanPopulate).sort({ dueDate: 1 }).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Overdue loans fetched', data: items, page, limit, total });
});

const getLoan = asyncHandler(async (req, res) => {
  const loan = await Loan.findById(req.params.id).populate(loanPopulate);
  if (!loan) throw ApiError.notFound('Loan not found', 'LOAN_NOT_FOUND');
  if (req.user.role === 'MEMBER' && loan.member._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('Cannot view others loans', 'FORBIDDEN');
  }
  return ApiResponse.success(res, { message: 'Loan fetched', data: { loan } });
});

module.exports = { issueBook, returnBook, renewLoan, markLost, listLoans, memberLoans, overdueLoans, getLoan };
