const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { upload, pushToCloudinary } = require('../middleware/upload');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { authorValidator, authorUpdateValidator } = require('../validators/author.validator');
const authors = require('../controllers/author.controller');

const router = express.Router();

router.get('/', paginationQuery, validate, authors.listAuthors);
router.get('/:id', objectIdParam(), validate, authors.getAuthor);
router.post('/', protect, authorize('ADMIN', 'LIBRARIAN'), upload.single('photo'), pushToCloudinary, authorValidator, validate, authors.createAuthor);
router.put('/:id', protect, authorize('ADMIN', 'LIBRARIAN'), upload.single('photo'), pushToCloudinary, objectIdParam(), authorUpdateValidator, validate, authors.updateAuthor);
router.delete('/:id', protect, authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), validate, authors.deleteAuthor);

module.exports = router;
