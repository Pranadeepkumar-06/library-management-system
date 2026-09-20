const Author = require('../models/Author.model');
const Book = require('../models/Book.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');

const listAuthors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const sort = parseSort(req, ['createdAt', 'fullName', 'firstName']);
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { firstName: rx }, { lastName: rx }];
  }
  const [total, items] = await Promise.all([Author.countDocuments(filter), Author.find(filter).sort(sort).skip(skip).limit(limit)]);
  return ApiResponse.paginated(res, { message: 'Authors fetched', data: items, page, limit, total });
});

const getAuthor = asyncHandler(async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) throw ApiError.notFound('Author not found', 'AUTHOR_NOT_FOUND');
  const bookCount = await Book.countDocuments({ authors: author._id });
  return ApiResponse.success(res, { message: 'Author fetched', data: { author, bookCount } });
});

const createAuthor = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.fileUrl) data.photo = req.fileUrl;
  const author = await Author.create(data);
  await logAudit({ req, action: 'AUTHOR_CREATED', entityType: 'Author', entityId: author._id, description: `Author: ${author.fullName}` });
  return ApiResponse.success(res, { statusCode: 201, message: 'Author created', data: { author } });
});

const updateAuthor = asyncHandler(async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) throw ApiError.notFound('Author not found', 'AUTHOR_NOT_FOUND');
  Object.assign(author, req.body);
  if (req.fileUrl) author.photo = req.fileUrl;
  await author.save();
  await logAudit({ req, action: 'AUTHOR_UPDATED', entityType: 'Author', entityId: author._id, description: `Author: ${author.fullName}` });
  return ApiResponse.success(res, { message: 'Author updated', data: { author } });
});

const deleteAuthor = asyncHandler(async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) throw ApiError.notFound('Author not found', 'AUTHOR_NOT_FOUND');
  const inUse = await Book.countDocuments({ authors: author._id });
  if (inUse > 0) throw ApiError.badRequest(`Author has ${inUse} book(s); remove from books first`, 'AUTHOR_IN_USE');
  await author.deleteOne();
  await logAudit({ req, action: 'AUTHOR_DELETED', entityType: 'Author', entityId: author._id, description: `Deleted ${author.fullName}` });
  return ApiResponse.success(res, { message: 'Author deleted', data: null });
});

module.exports = { listAuthors, getAuthor, createAuthor, updateAuthor, deleteAuthor };
