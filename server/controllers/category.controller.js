const Category = require('../models/Category.model');
const Book = require('../models/Book.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, parseSort } = require('../utils/pagination');
const logAudit = require('../middleware/audit');

const listCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req, { limit: 50 });
  const sort = parseSort(req, ['name', 'createdAt']);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.name = new RegExp(String(req.query.search).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [total, items] = await Promise.all([
    Category.countDocuments(filter),
    Category.find(filter).populate('parentCategory', 'name').sort(sort).skip(skip).limit(limit),
  ]);
  return ApiResponse.paginated(res, { message: 'Categories fetched', data: items, page, limit, total });
});

const getCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id).populate('parentCategory', 'name');
  if (!cat) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  return ApiResponse.success(res, { message: 'Category fetched', data: { category: cat } });
});

const createCategory = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.parentCategory === '' || payload.parentCategory === null) delete payload.parentCategory;
  try {
    const cat = await Category.create(payload);
    await logAudit({ req, action: 'CATEGORY_CREATED', entityType: 'Category', entityId: cat._id, description: `Category: ${cat.name}` });
    return ApiResponse.success(res, { statusCode: 201, message: 'Category created', data: { category: cat } });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Category name already exists', 'CATEGORY_EXISTS');
    throw e;
  }
});

const updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  if (req.body.parentCategory && req.body.parentCategory === cat._id.toString()) {
    throw ApiError.badRequest('Category cannot be its own parent', 'INVALID_PARENT');
  }
  Object.assign(cat, req.body);
  if (cat.parentCategory === '') cat.parentCategory = null;
  try {
    await cat.save();
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Category name already exists', 'CATEGORY_EXISTS');
    throw e;
  }
  await logAudit({ req, action: 'CATEGORY_UPDATED', entityType: 'Category', entityId: cat._id, description: `Category: ${cat.name}` });
  return ApiResponse.success(res, { message: 'Category updated', data: { category: cat } });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  const [childCount, bookCount] = await Promise.all([
    Category.countDocuments({ parentCategory: cat._id }),
    Book.countDocuments({ categories: cat._id }),
  ]);
  if (childCount > 0) throw ApiError.badRequest('Category has sub-categories', 'CATEGORY_IN_USE');
  if (bookCount > 0) throw ApiError.badRequest(`Category used by ${bookCount} book(s)`, 'CATEGORY_IN_USE');
  await cat.deleteOne();
  await logAudit({ req, action: 'CATEGORY_DELETED', entityType: 'Category', entityId: cat._id, description: `Deleted ${cat.name}` });
  return ApiResponse.success(res, { message: 'Category deleted', data: null });
});

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
