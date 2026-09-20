const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { fineValidator, payValidator } = require('../validators/fine.validator');
const fines = require('../controllers/fine.controller');

const router = express.Router();
router.use(protect);

router.get('/', paginationQuery, validate, fines.listFines);
router.get('/:id', objectIdParam(), validate, fines.getFine);
router.post('/', authorize('ADMIN', 'LIBRARIAN'), fineValidator, validate, fines.createFine);
router.patch('/:id/pay', authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), payValidator, validate, fines.payFine);
router.patch('/:id/waive', authorize('ADMIN'), objectIdParam(), payValidator, validate, fines.waiveFine);

module.exports = router;
