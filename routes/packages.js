const express = require('express');
const router = express.Router();
const packagesController = require('../controllers/packagesController');
const { authenticateToken } = require('../middleware/auth');

// All package routes require authentication
router.use(authenticateToken);

router.get('/history', packagesController.getHistory);

module.exports = router;
