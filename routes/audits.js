const express = require('express');
const router = express.Router();

const auditController = require('../controllers/auditController');

// Multipart upload
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadRoot = path.join(__dirname, '..', 'uploads', 'audits');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const boxId = (req.body && req.body.boxId) ? String(req.body.boxId) : 'unknown';
    const dir = path.join(uploadRoot, `${Date.now()}_${boxId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB per image
  },
});

// Severe audit ingest endpoint (policy-based; no ML training)
router.post(
  '/box-damage',
  upload.fields([
    { name: 'viewA', maxCount: 1 },
    { name: 'viewB', maxCount: 1 },
  ]),
  auditController.createBoxDamageAudit,
);

module.exports = router;
