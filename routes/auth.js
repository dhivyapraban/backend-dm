const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
// Authentication routes (no leading slash needed)
router.post('/register', authController.sendOTP);
router.post('/login', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/refresh-token', authController.refreshToken);


module.exports = router;
