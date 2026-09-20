const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const dash = require('../controllers/dashboard.controller');

const router = express.Router();
router.use(protect);

router.get('/admin', authorize('ADMIN'), dash.adminDashboard);
router.get('/librarian', authorize('ADMIN', 'LIBRARIAN'), dash.librarianDashboard);
router.get('/member', dash.memberDashboard);
router.get('/me', (req, res, next) => {
  if (req.user.role === 'ADMIN') return dash.adminDashboard(req, res, next);
  if (req.user.role === 'LIBRARIAN') return dash.librarianDashboard(req, res, next);
  return dash.memberDashboard(req, res, next);
});

module.exports = router;
