const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const driverController = require('../controllers/driverController');
const requestController = require('../controllers/requestController');
const ewbController = require('../controllers/ewbController');
const packagesController = require('../controllers/packagesController');

// Dashboard
router.get('/dashboard/stats', dashboardController.getStats);
router.get('/dashboard/activity', dashboardController.getActivity);
router.get('/dashboard/live-tracking', dashboardController.getLiveTracking); // Original for Mobile
router.get('/dashboard/live-tracking-web', dashboardController.getLiveTrackingWeb); // New for Web
router.get('/dashboard/recent-absorptions', dashboardController.getRecentAbsorptions);

// Drivers
router.get('/drivers', driverController.getAllDrivers);
router.get('/drivers/:id', driverController.getDriverById);
router.post('/drivers', driverController.createDriver);
router.put('/drivers/:id', driverController.updateDriver);
router.delete('/drivers/:id', driverController.deleteDriver);

// Absorption Requests
router.get('/absorption-requests', requestController.getAllRequests);
router.patch('/absorption-requests/:id/status', requestController.updateRequestStatus);
router.get('/absorption-requests/:id/recommendations', requestController.getRecommendedDrivers);

// E-Way Bills
router.get('/eway-bills', ewbController.getAllBills);
router.post('/eway-bills', ewbController.createBill);
router.put('/eway-bills/:id', ewbController.updateBill);
router.delete('/eway-bills/:id', ewbController.deleteBill);
router.get('/eway-bills/stats', ewbController.getStats);

// Packages
router.get('/packages/history', packagesController.getHistory); // Original for Mobile
router.get('/packages/history-web', packagesController.getHistoryWeb); // New for Web

module.exports = router;
