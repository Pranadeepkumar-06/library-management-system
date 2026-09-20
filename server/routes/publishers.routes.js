const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { publisherValidator } = require('../validators/publisher.validator');
const pubs = require('../controllers/publisher.controller');

const router = express.Router();

router.get('/', paginationQuery, validate, pubs.listPublishers);
router.get('/:id', objectIdParam(), validate, pubs.getPublisher);
router.post('/', protect, authorize('ADMIN', 'LIBRARIAN'), publisherValidator, validate, pubs.createPublisher);
router.put('/:id', protect, authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), publisherValidator, validate, pubs.updatePublisher);
router.delete('/:id', protect, authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), validate, pubs.deletePublisher);

module.exports = router;
