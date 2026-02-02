const express = require('express');
const router = express.Router();
const virtualHubController = require('../controllers/virtualHubController');

// Get all virtual hubs
router.get('/', virtualHubController.getAllVirtualHubs);

// Get single virtual hub
router.get('/:id', virtualHubController.getVirtualHubById);

// Create new virtual hub
router.post('/', virtualHubController.createVirtualHub);

// Update virtual hub
router.put('/:id', virtualHubController.updateVirtualHub);

// Delete virtual hub
router.delete('/:id', virtualHubController.deleteVirtualHub);

module.exports = router;
