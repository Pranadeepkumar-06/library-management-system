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

// Core issue flow with all business checks + transaction.
// Throws ApiError on any rule violation.
// Returns { loan, book, member, copy, reservation }.
const issueLoan = async ({ memberId, bookId, bookCopyId, notes, issuedBy }) => {
  const settings = await LibrarySettings.getSettings();
  const member = await User.findById(memberId);
  if (!member) throw ApiError.notFound('Member not found', 'USER_NOT_FOUND');
  if (member.status !== 'ACTIVE') throw ApiError.badRequest(`Member is ${member.status.toLowerCase()}`, 'MEMBER_INACTIVE');
  if (!membershipValid(member)) throw ApiError.badRequest('Membership expired', 'MEMBERSHIP_EXPIRED');

  const fineTotal = await pendingFineTotal(memberId);
  if (fineTotal >= (settings.maximumFine ?? 100) && fineTotal > 0) {
    throw ApiError.badRequest(`Blocking unpaid fines: $${fineTotal.toFixed(2)}`, 'BLOCKING_FINES');
  }

  const activeCount = await Loan.countDocuments({ member: memberId, status: { $in: ['BORROWED', 'OVERDUE'] } });
  if (activeCount >= settings.maxBooksPerMember) {
    throw ApiError.badRequest(`Borrowing limit reached (${settings.maxBooksPerMember})`, 'LIMIT_REACHED');
  }

  const book = await Book.findById(bookId);
  if (!book) throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  if (book.status !== 'AVAILABLE') throw ApiError.badRequest('Book is not available', 'BOOK_UNAVAILABLE');

  // Reservation queue: only first in queue may borrow
  const queue = await Reservation.find({ book: bookId, status: 'ACTIVE' }).sort({ reservationDate: 1 }).limit(5);
  const firstInQueue = queue.length ? queue[0] : null;
  if (firstInQueue && firstInQueue.member.toString() !== memberId.toString()) {
    throw ApiError.badRequest('Book is reserved; first in queue has priority', 'RESERVED_BY_OTHER');
  }
  const ownReservation = firstInQueue && firstInQueue.member.toString() === memberId.toString() ? firstInQueue : null;

  const session = await mongoose.startSession();
  let loan;
  let copy;
  let fulfilled = null;
  try {
    await session.withTransaction(async () => {
      // Pick copy: linked held copy first, then any RESERVED (reserver), else AVAILABLE
      if (bookCopyId) {
        copy = await BookCopy.findOne({ _id: bookCopyId, book: bookId }).session(session);
        if (!copy) throw ApiError.notFound('Copy not found for this book', 'COPY_NOT_FOUND');
        const okForReserver = ownReservation && copy.status === 'RESERVED';
        if (copy.status !== 'AVAILABLE' && !okForReserver) {
          throw ApiError.badRequest(`Copy is ${copy.status.toLowerCase()}`, 'COPY_UNAVAILABLE');
        }
      } else if (ownReservation && ownReservation.bookCopy) {
        copy = await BookCopy.findOne({ _id: ownReservation.bookCopy, book: bookId }).session(session);
        if (!copy || !['RESERVED', 'AVAILABLE'].includes(copy.status)) {
          copy = await BookCopy.findOne({ book: bookId, status: 'RESERVED' }).sort({ copyNumber: 1 }).session(session)
            || await BookCopy.findOne({ book: bookId, status: 'AVAILABLE' }).sort({ copyNumber: 1 }).session(session);
        }
      } else if (ownReservation) {
        copy = await BookCopy.findOne({ book: bookId, status: 'RESERVED' }).sort({ copyNumber: 1 }).session(session)
          || await BookCopy.findOne({ book: bookId, status: 'AVAILABLE' }).sort({ copyNumber: 1 }).session(session);
      } else {
        copy = await BookCopy.findOne({ book: bookId, status: 'AVAILABLE' }).sort({ copyNumber: 1 }).session(session);
      }
      if (!copy) throw ApiError.badRequest('No available copies', 'NO_COPIES');

      const wasReserved = copy.status === 'RESERVED';
      const now = new Date();
      const dueDate = new Date(now.getTime() + settings.loanDurationDays * DAY);

      const created = await Loan.create([{
        member: memberId, book: bookId, bookCopy: copy._id,
        issuedBy, issuedAt: now, dueDate,
        status: 'BORROWED', renewalCount: 0, maxRenewals: settings.maximumRenewals, notes,
      }], { session });
      loan = created[0];

      copy.status = 'BORROWED';
      await copy.save({ session });

      const inc = { borrowedCopies: 1 };
      if (wasReserved) inc.reservedCopies = -1;
      else inc.availableCopies = -1;
      await Book.updateOne({ _id: bookId }, { $inc: inc }, { session });

      if (ownReservation) {
        ownReservation.status = 'FULFILLED';
        ownReservation.fulfilledAt = now;
        ownReservation.fulfilledLoan = loan._id;
        ownReservation.bookCopy = copy._id;
        await ownReservation.save({ session });
        fulfilled = ownReservation;
      }

      await Notification.create([{
        user: memberId, type: 'BOOK_DUE',
        title: 'Book issued',
        message: `"${book.title}" (${copy.accessionNumber}) is due on ${dueDate.toDateString()}.`,
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  return { loan, book, member, copy, reservation: fulfilled };
};

module.exports = { issueLoan, pendingFineTotal, membershipValid, DAY };
