const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Advanced route creation with driver relay logic
router.post('/create-and-assign', requireRole('DISPATCHER'), routeController.createAndAssignRoute);

// Triggered by Dispatcher
router.post('/allocate', requireRole('DISPATCHER'), routeController.allocateRoutes);

module.exports = router;
