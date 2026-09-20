const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { upload, pushToCloudinary } = require('../middleware/upload');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { bookValidator, bookUpdateValidator } = require('../validators/book.validator');
const books = require('../controllers/book.controller');

const router = express.Router();

router.get('/', optionalAuth, paginationQuery, validate, books.listBooks);
router.get('/:id/copies', optionalAuth, objectIdParam(), validate, books.getBookCopies);
router.get('/:id', optionalAuth, objectIdParam(), validate, books.getBook);
router.post('/', protect, authorize('ADMIN', 'LIBRARIAN'), upload.single('coverImage'), pushToCloudinary, bookValidator, validate, books.createBook);
router.put('/:id', protect, authorize('ADMIN', 'LIBRARIAN'), upload.single('coverImage'), pushToCloudinary, objectIdParam(), bookUpdateValidator, validate, books.updateBook);
router.delete('/:id', protect, authorize('ADMIN'), objectIdParam(), validate, books.deleteBook);

module.exports = router;
