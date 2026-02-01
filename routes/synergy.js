const express = require('express');
const router = express.Router();
const synergyController = require('../controllers/synergyController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/search', synergyController.searchSynergy);
router.post('/accept', synergyController.acceptSynergy);


module.exports = router;
