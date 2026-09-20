const Publisher = require('../models/Publisher.model');
const Book = require('../models/Book.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');

const listPublishers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 20 });
  const sort = parseSort(req, ['name', 'createdAt']);
  const filter = {};
  if (req.query.search) filter.name = new RegExp(String(req.query.search).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [total, items] = await Promise.all([Publisher.countDocuments(filter), Publisher.find(filter).sort(sort).skip(skip).limit(limit)]);
  return ApiResponse.paginated(res, { message: 'Publishers fetched', data: items, page, limit, total });
});

const getPublisher = asyncHandler(async (req, res) => {
  const pub = await Publisher.findById(req.params.id);
  if (!pub) throw ApiError.notFound('Publisher not found', 'PUBLISHER_NOT_FOUND');
  return ApiResponse.success(res, { message: 'Publisher fetched', data: { publisher: pub } });
});

const createPublisher = asyncHandler(async (req, res) => {
  try {
    const pub = await Publisher.create(req.body);
    await logAudit({ req, action: 'PUBLISHER_CREATED', entityType: 'Publisher', entityId: pub._id, description: `Publisher: ${pub.name}` });
    return ApiResponse.success(res, { statusCode: 201, message: 'Publisher created', data: { publisher: pub } });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Publisher name already exists', 'PUBLISHER_EXISTS');
    throw e;
  }
});

const updatePublisher = asyncHandler(async (req, res) => {
  const pub = await Publisher.findById(req.params.id);
  if (!pub) throw ApiError.notFound('Publisher not found', 'PUBLISHER_NOT_FOUND');
  Object.assign(pub, req.body);
  try {
    await pub.save();
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Publisher name already exists', 'PUBLISHER_EXISTS');
    throw e;
  }
  await logAudit({ req, action: 'PUBLISHER_UPDATED', entityType: 'Publisher', entityId: pub._id, description: `Publisher: ${pub.name}` });
  return ApiResponse.success(res, { message: 'Publisher updated', data: { publisher: pub } });
});

const deletePublisher = asyncHandler(async (req, res) => {
  const pub = await Publisher.findById(req.params.id);
  if (!pub) throw ApiError.notFound('Publisher not found', 'PUBLISHER_NOT_FOUND');
  const inUse = await Book.countDocuments({ publisher: pub._id });
  if (inUse > 0) throw ApiError.badRequest(`Publisher used by ${inUse} book(s)`, 'PUBLISHER_IN_USE');
  await pub.deleteOne();
  await logAudit({ req, action: 'PUBLISHER_DELETED', entityType: 'Publisher', entityId: pub._id, description: `Deleted ${pub.name}` });
  return ApiResponse.success(res, { message: 'Publisher deleted', data: null });
});

module.exports = { listPublishers, getPublisher, createPublisher, updatePublisher, deletePublisher };
