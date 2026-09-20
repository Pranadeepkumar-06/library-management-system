const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { body } = require('express-validator');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const notifications = require('../controllers/notification.controller');

const router = express.Router();
router.use(protect);

router.get('/', paginationQuery, validate, notifications.listNotifications);
router.get('/unread-count', notifications.unreadCount);
router.patch('/read-all', notifications.markAllRead);
router.patch('/:id/read', objectIdParam(), validate, notifications.markRead);
router.delete('/', notifications.clearAll);
router.delete('/:id', objectIdParam(), validate, notifications.deleteNotification);
router.post(
  '/broadcast',
  authorize('ADMIN'),
  [
    body('title').trim().notEmpty().isLength({ max: 150 }),
    body('message').trim().notEmpty().isLength({ max: 2000 }),
    body('type').optional().isIn(['BOOK_AVAILABLE', 'BOOK_DUE', 'BOOK_OVERDUE', 'RESERVATION', 'FINE', 'SYSTEM']),
    body('role').optional().isIn(['ADMIN', 'LIBRARIAN', 'MEMBER']),
  ],
  validate,
  notifications.broadcast
);

module.exports = router;
