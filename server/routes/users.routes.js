const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { createUserValidator, updateUserValidator, statusValidator } = require('../validators/user.validator');
const users = require('../controllers/user.controller');

const router = express.Router();
router.use(protect);

router.get('/', authorize('ADMIN', 'LIBRARIAN'), paginationQuery, validate, users.listUsers);
router.post('/', authorize('ADMIN', 'LIBRARIAN'), createUserValidator, validate, users.createUser);
router.get('/:id', objectIdParam(), validate, users.getUser);
router.put('/:id', authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), updateUserValidator, validate, users.updateUser);
router.delete('/:id', authorize('ADMIN'), objectIdParam(), validate, users.deleteUser);
router.patch('/:id/status', authorize('ADMIN'), objectIdParam(), statusValidator, validate, users.updateStatus);

module.exports = router;
