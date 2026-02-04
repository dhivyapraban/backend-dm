const express = require('express');
const multer = require('multer');

const { auditDamage } = require('../controllers/auditDamageController');

const router = express.Router();

// In-memory multipart storage (we need buffers to validate + send to OpenAI)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB per image
    files: 6,
  },
});

const fields = upload.fields([
  { name: 'ref_view_A', maxCount: 1 },
  { name: 'ref_view_B', maxCount: 1 },
  { name: 'cur_view_A', maxCount: 1 },
  { name: 'cur_view_B', maxCount: 1 },
]);

// Matches requested path exactly.
router.post('/audit-damage', fields, auditDamage);

// Convenience alias under /api for existing client conventions.
router.post('/api/audit-damage', fields, auditDamage);

module.exports = router;
