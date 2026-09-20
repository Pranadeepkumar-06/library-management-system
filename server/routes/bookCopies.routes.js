const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { bookCopyValidator, bookCopyUpdateValidator } = require('../validators/bookCopy.validator');
const copies = require('../controllers/bookCopy.controller');

const router = express.Router();
router.use(protect, authorize('ADMIN', 'LIBRARIAN'));

router.get('/', paginationQuery, validate, copies.listCopies);
router.post('/', bookCopyValidator, validate, copies.createCopy);
router.get('/:id', objectIdParam(), validate, copies.getCopy);
router.put('/:id', objectIdParam(), bookCopyUpdateValidator, validate, copies.updateCopy);
router.delete('/:id', objectIdParam(), validate, copies.deleteCopy);

module.exports = router;
