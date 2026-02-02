const express = require('express');
const router = express.Router();
const absorptionController = require('../controllers/absorptionController');
const { authenticateToken } = require('../middleware/auth');

// All absorption routes require authentication
router.use(authenticateToken);

router.get('/map-data', absorptionController.getMapData);
router.get('/active', absorptionController.getActiveAbsorptions);

module.exports = router;
