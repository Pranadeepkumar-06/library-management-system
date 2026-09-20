const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { issueValidator, returnValidator, markLostValidator } = require('../validators/loan.validator');
const loans = require('../controllers/loan.controller');

const router = express.Router();
router.use(protect);

router.get('/', paginationQuery, validate, loans.listLoans);
router.get('/overdue', authorize('ADMIN', 'LIBRARIAN'), paginationQuery, validate, loans.overdueLoans);
router.get('/member/:memberId', objectIdParam('memberId'), paginationQuery, validate, loans.memberLoans);
router.get('/:id', objectIdParam(), validate, loans.getLoan);

router.post('/issue', authorize('ADMIN', 'LIBRARIAN', 'MEMBER'), issueValidator, validate, loans.issueBook);
router.post('/:id/return', authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), returnValidator, validate, loans.returnBook);
router.post('/:id/renew', authorize('ADMIN', 'LIBRARIAN', 'MEMBER'), objectIdParam(), validate, loans.renewLoan);
router.post('/:id/mark-lost', authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), markLostValidator, validate, loans.markLost);

module.exports = router;
