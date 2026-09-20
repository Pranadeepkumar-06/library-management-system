const mongoose = require('mongoose');
const Book = require('../models/Book.model');
const Author = require('../models/Author.model');
const Category = require('../models/Category.model');
const Publisher = require('../models/Publisher.model');
const BookCopy = require('../models/BookCopy.model');
const Loan = require('../models/Loan.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');

const bookPopulate = [
  { path: 'authors', select: 'firstName lastName fullName' },
  { path: 'publisher', select: 'name' },
  { path: 'categories', select: 'name' },
];

const buildBookFilter = (q) => {
  const filter = {};
  if (q.search) {
    const s = String(q.search).slice(0, 100);
    const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const or = [{ title: rx }, { subtitle: rx }, { tags: rx }, { isbn10: rx }, { isbn13: rx }];
    // Search authors by name -> resolve ids is expensive; use text fallback via $or on populated? Keep regex on title family.
    filter.$or = or;
  }
  if (q.title) filter.title = new RegExp(String(q.title).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (q.author && mongoose.Types.ObjectId.isValid(q.author)) filter.authors = q.author;
  if (q.category && mongoose.Types.ObjectId.isValid(q.category)) filter.categories = q.category;
  if (q.publisher && mongoose.Types.ObjectId.isValid(q.publisher)) filter.publisher = q.publisher;
  if (q.language) filter.language = new RegExp(`^${String(q.language).slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (q.format) filter.bookFormat = q.format;
  if (q.status) filter.status = q.status;
  if (q.isbn) {
    const rx = new RegExp(String(q.isbn).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ isbn10: rx }, { isbn13: rx }];
  }
  if (q.year) {
    const y = parseInt(q.year, 10);
    if (!Number.isNaN(y)) {
      filter.publicationDate = { $gte: new Date(`${y}-01-01`), $lt: new Date(`${y + 1}-01-01`) };
    }
  }
  if (q.available === 'true' || q.available === true) {
    filter.status = 'AVAILABLE';
    filter.availableCopies = { $gt: 0 };
  }
  return filter;
};

const listBooks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 12 });
  const sort = parseSort(req, ['createdAt', 'title', 'publicationDate', 'availableCopies']);
  const filter = buildBookFilter(req.query);
  const [total, items] = await Promise.all([
    Book.countDocuments(filter),
    Book.find(filter).populate(bookPopulate).sort(sort).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Books fetched', data: items, page, limit, total });
});

const getBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).populate(bookPopulate);
  if (!book) throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  return ApiResponse.success(res, { message: 'Book fetched', data: { book } });
});

const getBookCopies = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  const copies = await BookCopy.find({ book: book._id }).sort({ copyNumber: 1 });
  // Hide procurement fields from members/anonymous
  const isStaff = req.user && ['ADMIN', 'LIBRARIAN'].includes(req.user.role);
  const data = isStaff ? copies : copies.map((c) => {
    const o = c.toObject();
    delete o.purchasePrice;
    delete o.supplier;
    return o;
  });
  return ApiResponse.success(res, { message: 'Copies fetched', data: { book: book.title, copies: data } });
});

const assertRefs = async (authors, publisher, categories) => {
  if (authors && authors.length) {
    const count = await Author.countDocuments({ _id: { $in: authors } });
    if (count !== authors.length) throw ApiError.badRequest('One or more authors not found', 'AUTHOR_NOT_FOUND');
  }
  if (publisher) {
    const p = await Publisher.findById(publisher);
    if (!p) throw ApiError.badRequest('Publisher not found', 'PUBLISHER_NOT_FOUND');
  }
  if (categories && categories.length) {
    const count = await Category.countDocuments({ _id: { $in: categories } });
    if (count !== categories.length) throw ApiError.badRequest('One or more categories not found', 'CATEGORY_NOT_FOUND');
  }
};

const createBook = asyncHandler(async (req, res) => {
  const { authors = [], publisher, categories = [] } = req.body;
  await assertRefs(authors, publisher || null, categories);

  const data = { ...req.body };
  if (req.fileUrl) data.coverImage = req.fileUrl;
  // Counters start at zero; physical copies managed via BookCopy endpoints.
  data.totalCopies = 0;
  data.availableCopies = 0;
  data.borrowedCopies = 0;
  data.reservedCopies = 0;
  data.damagedCopies = 0;
  data.lostCopies = 0;
  data.createdBy = req.user._id;

  try {
    const book = await Book.create(data);
    await logAudit({ req, action: 'BOOK_CREATED', entityType: 'Book', entityId: book._id, description: `Book: ${book.title}` });
    const populated = await Book.findById(book._id).populate(bookPopulate);
    return ApiResponse.success(res, { statusCode: 201, message: 'Book created', data: { book: populated } });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('ISBN already exists', 'ISBN_EXISTS');
    throw e;
  }
});

const updateBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');

  const { authors, publisher, categories } = req.body;
  if (authors || publisher || categories) {
    await assertRefs(authors || book.authors, publisher !== undefined ? publisher || null : book.publisher, categories || book.categories);
  }
  const counterFields = ['totalCopies', 'availableCopies', 'borrowedCopies', 'reservedCopies', 'damagedCopies', 'lostCopies'];
  for (const f of counterFields) delete req.body[f]; // counters only change via copy/loan transactions

  Object.assign(book, req.body);
  if (req.fileUrl) book.coverImage = req.fileUrl;
  book.updatedBy = req.user._id;
  try {
    await book.save();
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('ISBN already exists', 'ISBN_EXISTS');
    throw e;
  }
  await logAudit({ req, action: 'BOOK_UPDATED', entityType: 'Book', entityId: book._id, description: `Book: ${book.title}` });
  const populated = await Book.findById(book._id).populate(bookPopulate);
  return ApiResponse.success(res, { message: 'Book updated', data: { book: populated } });
});

const deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound('Book not found', 'BOOK_NOT_FOUND');
  const [copyCount, loanCount] = await Promise.all([
    BookCopy.countDocuments({ book: book._id }),
    Loan.countDocuments({ book: book._id }),
  ]);
  if (copyCount > 0 || loanCount > 0) {
    throw ApiError.badRequest('Book has copies/loan history; set status ARCHIVED instead', 'BOOK_HAS_HISTORY');
  }
  await book.deleteOne();
  await logAudit({ req, action: 'BOOK_DELETED', entityType: 'Book', entityId: book._id, description: `Deleted ${book.title}` });
  return ApiResponse.success(res, { message: 'Book deleted', data: null });
});

module.exports = { listBooks, getBook, getBookCopies, createBook, updateBook, deleteBook };
