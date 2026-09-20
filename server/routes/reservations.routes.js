const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { objectIdParam, paginationQuery } = require('../validators/common.validator');
const { reservationValidator } = require('../validators/reservation.validator');
const reservations = require('../controllers/reservation.controller');

const router = express.Router();
router.use(protect);

router.get('/', paginationQuery, validate, reservations.listReservations);
router.post('/', reservationValidator, validate, reservations.createReservation);
router.post('/:id/issue', authorize('ADMIN', 'LIBRARIAN'), objectIdParam(), validate, reservations.issueReservation);
router.delete('/:id', objectIdParam(), validate, reservations.cancelReservation);

module.exports = router;
