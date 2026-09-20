const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const audit = require('../controllers/auditLog.controller');

const router = express.Router();
router.use(protect, authorize('ADMIN'));

router.get('/', paginationQuery, validate, audit.listAuditLogs);
router.get('/:id', objectIdParam(), validate, audit.getAuditLog);

module.exports = router;
