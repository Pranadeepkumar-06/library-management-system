const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { processOverdue } = require('../jobs/overdue.job');
const reports = require('../controllers/report.controller');

const router = express.Router();
router.use(protect, authorize('ADMIN', 'LIBRARIAN'));

router.post('/run-overdue', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const result = await processOverdue();
  return ApiResponse.success(res, { message: 'Overdue check complete', data: result });
}));

router.get('/most-borrowed', reports.mostBorrowed);
router.get('/least-borrowed', reports.leastBorrowed);
router.get('/most-active-members', reports.mostActiveMembers);
router.get('/overdue', reports.overdueReport);
router.get('/fines', reports.finesReport);
router.get('/by-category', reports.booksByCategory);
router.get('/by-language', reports.booksByLanguage);
router.get('/by-author', reports.booksByAuthor);
router.get('/monthly', reports.monthlyStats);
router.get('/lost-damaged', reports.lostDamaged);

module.exports = router;
