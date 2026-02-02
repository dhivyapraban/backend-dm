const express = require('express');
const router = express.Router();
const synergyController = require('../controllers/synergyController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Phase 2: Dispatcher Orchestration
router.post('/dispatcher-accept', synergyController.dispatcherAcceptSynergy);

// Phase 3: QR Generation & Verification
router.post('/generate-qr', synergyController.generateQRCode);
router.post('/verify-qr', synergyController.verifyQR);

// Phase 4: Handover Completion
router.post('/complete', synergyController.completeHandover);

// Legacy endpoints (backward compatibility)
router.post('/search', synergyController.searchSynergy);
router.post('/accept', synergyController.acceptSynergy);
router.post('/handshake', synergyController.handleHandshake);

module.exports = router;
