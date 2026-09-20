const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { categoryValidator } = require('../validators/category.validator');
const cats = require('../controllers/category.controller');

const router = express.Router();

router.get('/', paginationQuery, validate, cats.listCategories);
router.get('/:id', objectIdParam(), validate, cats.getCategory);
router.post('/', protect, authorize('ADMIN', 'LIBRARIAN'), categoryValidator, validate, cats.createCategory);
router.put('/:id', protect, authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), categoryValidator, validate, cats.updateCategory);
router.delete('/:id', protect, authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), validate, cats.deleteCategory);

module.exports = router;
