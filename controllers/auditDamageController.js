const fs = require('fs');
const path = require('path');

const { validateBoxImage } = require('../utils/imageValidation');
const { auditBoxDamageWithClip } = require('../services/hfClipAuditService');

function nowIso() {
  return new Date().toISOString();
}

async function appendJsonl(filePath, obj) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.appendFile(filePath, `${JSON.stringify(obj)}\n`, 'utf8');
}

function pickFile(req, field) {
  const f = req.files && req.files[field] ? req.files[field][0] : null;
  if (!f) return null;
  return {
    field,
    originalName: f.originalname,
    mimeType: f.mimetype,
    size: f.size,
    buffer: f.buffer,
  };
}

/**
 * POST /audit-damage
 * multipart/form-data
 * - ref_view_A, ref_view_B, cur_view_A, cur_view_B (files)
 * - box_id (optional)
 * - timestamp (optional)
 */
async function auditDamage(req, res) {
  const requestId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const receivedAt = nowIso();

  try {
    const boxId = req.body && req.body.box_id ? String(req.body.box_id) : null;
    const clientTimestamp = req.body && req.body.timestamp ? String(req.body.timestamp) : null;

    const refA = pickFile(req, 'ref_view_A');
    const refB = pickFile(req, 'ref_view_B');
    const curA = pickFile(req, 'cur_view_A');
    const curB = pickFile(req, 'cur_view_B');

    const missing = [];
    if (!refA) missing.push('ref_view_A');
    if (!refB) missing.push('ref_view_B');
    if (!curA) missing.push('cur_view_A');
    if (!curB) missing.push('cur_view_B');

    if (missing.length) {
      return res.status(400).json({
        error: 'missing_images',
        message: `Missing required images: ${missing.join(', ')}`,
      });
    }

    // 1) Server-side image validation BEFORE HF embedding.
    const images = [refA, refB, curA, curB];
    const validations = {};

    for (const img of images) {
      const v = await validateBoxImage(img.buffer);
      validations[img.field] = v;
      if (!v.ok) {
        return res.status(400).json({
          error: 'image_validation_failed',
          field: img.field,
          reason: v.reason,
          metrics: v.metrics,
        });
      }
    }

    // 2) CLIP embeddings + cosine similarity (policy-based decision).
    const clip = await auditBoxDamageWithClip({
      refA,
      refB,
      curA,
      curB,
    });

    // 3) Result (already policy-based and explainable).
    const result = {
      severe_damage: clip.severe_damage === true,
      damage_percent: Number(clip.damage_percent) || 0,
      confidence: Number(clip.confidence) || 0,
      reason: typeof clip.reason === 'string' ? clip.reason : '',
      escalated_to_admin: clip.escalated_to_admin === true,
    };

    const auditLog = {
      request_id: requestId,
      received_at: receivedAt,
      box_id: boxId,
      client_timestamp: clientTimestamp,
      validation: validations,
      clip_raw: clip,
      result,
    };

    // 4) Log
    try {
      const logPath = path.join(process.cwd(), 'logs', 'audit-damage.jsonl');
      await appendJsonl(logPath, auditLog);
    } catch (_) {
      // Best-effort logging.
    }

    // 5) Admin notification hook
    if (result.severe_damage) {
      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('admin:auditDamage', {
            request_id: requestId,
            box_id: boxId,
            damage_percent: result.damage_percent,
            confidence: result.confidence,
            reason: result.reason,
            received_at: receivedAt,
          });
        }
      } catch (_) {
        // Best-effort.
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('auditDamage error:', err);
    const status =
      (err && err.statusCode != null ? Number(err.statusCode) : null) ||
      (err && err.status != null ? Number(err.status) : null) ||
      (err && err.response && err.response.status != null
        ? Number(err.response.status)
        : null) ||
      500;
    return res.status(status).json({
      error: 'audit_failed',
      message: err && err.message ? String(err.message) : 'Audit failed',
      request_id: requestId,
    });
  }
}

module.exports = {
  auditDamage,
};
