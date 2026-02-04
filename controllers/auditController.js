const path = require('path');

/**
 * POST /api/audits/box-damage
 * Accepts multipart form-data:
 * - boxId (string)
 * - damagePercent (string/number)
 * - similarityA (string/number)
 * - similarityB (string/number)
 * - notes (optional)
 * - viewA (file)
 * - viewB (file)
 *
 * Policy is enforced client-side; backend just ingests + notifies admins.
 */
const createBoxDamageAudit = async (req, res) => {
  try {
    const { boxId, damagePercent, similarityA, similarityB, notes } = req.body || {};

    if (!boxId) {
      return res.status(400).json({ success: false, message: 'boxId is required' });
    }

    const viewA = req.files && req.files.viewA ? req.files.viewA[0] : null;
    const viewB = req.files && req.files.viewB ? req.files.viewB[0] : null;

    if (!viewA || !viewB) {
      return res.status(400).json({
        success: false,
        message: 'Both viewA and viewB images are required',
      });
    }

    const audit = {
      boxId: String(boxId),
      damagePercent: Number(damagePercent),
      similarityA: Number(similarityA),
      similarityB: Number(similarityB),
      notes: notes ? String(notes) : null,
      images: {
        viewA: {
          filename: viewA.filename,
          path: viewA.path,
          mimeType: viewA.mimetype,
          size: viewA.size,
        },
        viewB: {
          filename: viewB.filename,
          path: viewB.path,
          mimeType: viewB.mimetype,
          size: viewB.size,
        },
      },
      receivedAt: new Date().toISOString(),
    };

    // Notify admins via Socket.IO (if any admin dashboard is connected).
    // Server-level emitter is made available via app.set('io', io)
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('admin:boxDamageAudit', {
          boxId: audit.boxId,
          damagePercent: audit.damagePercent,
          similarityA: audit.similarityA,
          similarityB: audit.similarityB,
          receivedAt: audit.receivedAt,
          imagePaths: {
            viewA: path.relative(process.cwd(), viewA.path),
            viewB: path.relative(process.cwd(), viewB.path),
          },
        });
      }
    } catch (_) {
      // Best-effort notification only.
    }

    return res.status(201).json({
      success: true,
      message: 'Box damage audit received',
      data: audit,
    });
  } catch (error) {
    console.error('createBoxDamageAudit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to receive audit' });
  }
};

module.exports = {
  createBoxDamageAudit,
};
