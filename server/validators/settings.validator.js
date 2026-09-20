const { body } = require('express-validator');

// Blank ('') numeric input means "leave unchanged" (controller drops it);
// without this, express-validator 422s before the controller ever runs.
const num = (field, check) => body(field).customSanitizer((v) => {
  if (v === '' || v === undefined || v === null) return undefined;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return v;
}).optional().custom(check);

const settingsValidator = [
  body('libraryName').optional().trim().isLength({ max: 120 }),
  body('libraryCode').optional().trim().isLength({ max: 30 }),
  body('address').optional().trim().isLength({ max: 250 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
  num('maxBooksPerMember', (v) => { if (!Number.isInteger(v) || v < 1 || v > 50) throw new Error('1-50'); return true; }),
  num('loanDurationDays', (v) => { if (!Number.isInteger(v) || v < 1 || v > 120) throw new Error('1-120'); return true; }),
  num('maximumRenewals', (v) => { if (!Number.isInteger(v) || v < 0 || v > 10) throw new Error('0-10'); return true; }),
  num('finePerDay', (v) => { if (typeof v !== 'number' || v < 0) throw new Error('>= 0'); return true; }),
  num('maximumFine', (v) => { if (typeof v !== 'number' || v < 0) throw new Error('>= 0'); return true; }),
  num('reservationDurationDays', (v) => { if (!Number.isInteger(v) || v < 1 || v > 60) throw new Error('1-60'); return true; }),
  num('membershipDurationDays', (v) => { if (!Number.isInteger(v) || v < 1) throw new Error('>= 1'); return true; }),
  body('allowReservations').optional().isBoolean().toBoolean(),
  body('allowRenewals').optional().isBoolean().toBoolean(),
];

module.exports = { settingsValidator };
