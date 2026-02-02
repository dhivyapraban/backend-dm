const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public/Shared routes (Dispatcher/Admin/Driver)
router.post('/create', deliveryController.createDelivery);

// Authenticate all routes
router.use(authenticateToken);

// Driver-only routes
router.use(requireRole('DRIVER'));

router.get('/assigned', deliveryController.getAssignedDeliveries);
router.post('/:id/accept', deliveryController.acceptDelivery);
router.post('/:id/reject', deliveryController.rejectDelivery);
router.post('/:id/start', deliveryController.startDelivery);
router.post('/:id/pickup', deliveryController.pickupCargo);
router.post('/:id/complete', deliveryController.completeDelivery);
router.post('/:id/upload-photos', deliveryController.uploadPhotos);

module.exports = router;
