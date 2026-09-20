const User = require('../models/User.model');
const Book = require('../models/Book.model');
const BookCopy = require('../models/BookCopy.model');
const Loan = require('../models/Loan.model');
const Fine = require('../models/Fine.model');
const Reservation = require('../models/Reservation.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const sumFines = async (match) => {
  const r = await Fine.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
  return r.length ? { total: r[0].total, count: r[0].count } : { total: 0, count: 0 };
};

const adminDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers, totalMembers, totalLibrarians,
    totalBooks, totalCopies, availableCopies, borrowedCopies,
    overdueCount, activeReservations,
    pendingFines, totalFinesAgg,
    recentBooks, recentLoans, recentReturns,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'MEMBER' }),
    User.countDocuments({ role: 'LIBRARIAN' }),
    Book.countDocuments({}),
    BookCopy.countDocuments({}),
    BookCopy.countDocuments({ status: 'AVAILABLE' }),
    BookCopy.countDocuments({ status: 'BORROWED' }),
    Loan.countDocuments({ status: 'OVERDUE' }),
    Reservation.countDocuments({ status: 'ACTIVE' }),
    sumFines({ status: 'PENDING' }),
    sumFines({ status: 'PAID' }),
    Book.find({}).sort({ createdAt: -1 }).limit(5).populate('authors', 'fullName'),
    Loan.find({}).sort({ createdAt: -1 }).limit(5).populate('member', 'firstName lastName email').populate('book', 'title'),
    Loan.find({ status: 'RETURNED' }).sort({ updatedAt: -1 }).limit(5).populate('member', 'firstName lastName').populate('book', 'title'),
  ]);
  return ApiResponse.success(res, {
    message: 'Admin dashboard',
    data: {
      users: { total: totalUsers, members: totalMembers, librarians: totalLibrarians },
      books: { total: totalBooks, copies: totalCopies, available: availableCopies, borrowed: borrowedCopies },
      loans: { overdue: overdueCount },
      fines: { pending: pendingFines, collected: totalFinesAgg },
      reservations: { active: activeReservations },
      recent: { books: recentBooks, issued: recentLoans, returned: recentReturns },
    },
  });
});

const librarianDashboard = asyncHandler(async (req, res) => {
  const [totalBooks, available, borrowed, overdue, activeLoans, activeReservations, totalMembers] = await Promise.all([
    Book.countDocuments({}),
    BookCopy.countDocuments({ status: 'AVAILABLE' }),
    BookCopy.countDocuments({ status: 'BORROWED' }),
    Loan.countDocuments({ status: 'OVERDUE' }),
    Loan.countDocuments({ status: { $in: ['BORROWED', 'OVERDUE'] } }),
    Reservation.countDocuments({ status: 'ACTIVE' }),
    User.countDocuments({ role: 'MEMBER', status: 'ACTIVE' }),
  ]);
  const dueSoon = await Loan.find({ status: 'BORROWED', dueDate: { $lte: new Date(Date.now() + 3 * 864e5) } })
    .sort({ dueDate: 1 }).limit(10).populate('member', 'firstName lastName email').populate('book', 'title');
  return ApiResponse.success(res, {
    message: 'Librarian dashboard',
    data: {
      books: { total: totalBooks, available, borrowed },
      loans: { active: activeLoans, overdue, dueSoon },
      reservations: { active: activeReservations },
      members: { total: totalMembers },
    },
  });
});

const memberDashboard = asyncHandler(async (req, res) => {
  const memberId = req.user._id;
  const [borrowed, overdue, reservations, historyCount, pendingAgg, recent] = await Promise.all([
    Loan.find({ member: memberId, status: 'BORROWED' }).populate('book', 'title coverImage').populate('bookCopy', 'accessionNumber').sort({ dueDate: 1 }),
    Loan.find({ member: memberId, status: 'OVERDUE' }).populate('book', 'title').sort({ dueDate: 1 }),
    Reservation.find({ member: memberId, status: 'ACTIVE' }).populate('book', 'title coverImage').sort({ reservationDate: 1 }),
    Loan.countDocuments({ member: memberId }),
    sumFines({ member: memberId, status: 'PENDING' }),
    Loan.find({ member: memberId }).sort({ createdAt: -1 }).limit(5).populate('book', 'title'),
  ]);
  return ApiResponse.success(res, {
    message: 'Member dashboard',
    data: { borrowed, overdue, reservations, historyCount, fines: pendingAgg, recent },
  });
});

module.exports = { adminDashboard, librarianDashboard, memberDashboard };
