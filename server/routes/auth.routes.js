const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
const { registerValidator, loginValidator, forgotValidator, resetValidator, changePasswordValidator } = require('../validators/auth.validator');
const auth = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', registerLimiter, registerValidator, validate, auth.register);
router.post('/login', loginLimiter, loginValidator, validate, auth.login);
router.post('/logout', auth.logout);
router.post('/refresh', auth.refresh);
router.post('/forgot-password', forgotValidator, validate, auth.forgotPassword);
router.post('/reset-password', resetValidator, validate, auth.resetPassword);
router.post('/verify-email', auth.verifyEmail);

router.get('/me', protect, auth.me);
router.post('/change-password', protect, changePasswordValidator, validate, auth.changePassword);
router.post('/resend-verification', protect, auth.resendVerification);

module.exports = router;
