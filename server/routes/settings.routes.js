const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { settingsValidator } = require('../validators/settings.validator');
const settings = require('../controllers/settings.controller');

const router = express.Router();

router.get('/', optionalAuth, settings.getSettings);
router.put('/', protect, authorize('ADMIN'), settingsValidator, validate, settings.updateSettings);

module.exports = router;
