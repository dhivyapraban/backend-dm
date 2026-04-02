const sharp = require('sharp');

function clamp01(x) {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function variance(values) {
  if (!values.length) return 0;
  let mean = 0;
  for (const v of values) mean += v;
  mean /= values.length;
  let acc = 0;
  for (const v of values) {
    const d = v - mean;
    acc += d * d;
  }
  return acc / values.length;
}

async function decodeGrayscaleRaw(buffer, targetMaxSide = 256) {
  const img = sharp(buffer, { failOn: 'none' });
  const meta = await img.metadata();
  if (!meta || !meta.width || !meta.height) {
    throw new Error('Unable to read image metadata');
  }

  const scale = Math.min(1, targetMaxSide / Math.max(meta.width, meta.height));
  const w = Math.max(1, Math.round(meta.width * scale));
  const h = Math.max(1, Math.round(meta.height * scale));

  const { data, info } = await img
    .rotate() // respect EXIF orientation
    .resize(w, h, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height };
}

function laplacianVariance(gray, width, height) {
  // 4-neighbor Laplacian
  const laps = [];
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    const rowUp = (y - 1) * width;
    const rowDown = (y + 1) * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      const c = gray[i];
      const lap = -4 * c + gray[rowUp + x] + gray[rowDown + x] + gray[i - 1] + gray[i + 1];
      laps.push(lap);
    }
  }
  return variance(laps);
}

function sobelEdges(gray, width, height) {
  const mag = new Float32Array(width * height);
  let energyX = 0;
  let energyY = 0;

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;

      const a00 = gray[(y - 1) * width + (x - 1)];
      const a01 = gray[(y - 1) * width + x];
      const a02 = gray[(y - 1) * width + (x + 1)];
      const a10 = gray[y * width + (x - 1)];
      const a12 = gray[y * width + (x + 1)];
      const a20 = gray[(y + 1) * width + (x - 1)];
      const a21 = gray[(y + 1) * width + x];
      const a22 = gray[(y + 1) * width + (x + 1)];

      const gx = -a00 + a02 - 2 * a10 + 2 * a12 - a20 + a22;
      const gy = -a00 - 2 * a01 - a02 + a20 + 2 * a21 + a22;

      const m = Math.sqrt(gx * gx + gy * gy);
      mag[i] = m;

      energyX += Math.abs(gx);
      energyY += Math.abs(gy);
    }
  }

  return { mag, energyX, energyY };
}

function edgeBoundingBox(mag, width, height, thresh) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  let count = 0;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const v = mag[row + x];
      if (v > thresh) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (count === 0) {
    return { found: false, count: 0, occupancy: 0, bbox: null };
  }
  const bboxW = Math.max(1, maxX - minX + 1);
  const bboxH = Math.max(1, maxY - minY + 1);
  const occupancy = (bboxW * bboxH) / (width * height);
  return {
    found: true,
    count,
    occupancy,
    bbox: { minX, minY, maxX, maxY, bboxW, bboxH },
  };
}

/**
 * Lightweight server-side validation (no ML):
 * - blur via Laplacian variance
 * - box occupancy via edge bounding box area
 * - corner/edge visibility via perpendicular edge energy presence
 */
async function validateBoxImage(buffer, opts = {}) {
  const {
    minOccupancy = 0.60,
    // Laplacian variance thresholds are scene/device dependent; keep conservative.
    minLaplacianVar = 60,
    // Sobel magnitude threshold; computed on 0..255 grayscale.
    edgeThresh = 40,
    minPerpEnergyRatio = 0.20,
  } = opts;

  const { data, width, height } = await decodeGrayscaleRaw(buffer, 256);

  const lapVar = laplacianVariance(data, width, height);
  if (lapVar < minLaplacianVar) {
    return {
      ok: false,
      reason: 'Image is too blurry',
      metrics: { laplacianVariance: lapVar, width, height },
    };
  }

  const { mag, energyX, energyY } = sobelEdges(data, width, height);
  const bbox = edgeBoundingBox(mag, width, height, edgeThresh);
  if (!bbox.found || bbox.count < 250) {
    return {
      ok: false,
      reason: 'Box edges/corners are not clearly visible',
      metrics: {
        laplacianVariance: lapVar,
        edgePixelCount: bbox.count,
        width,
        height,
      },
    };
  }

  if (bbox.occupancy < minOccupancy) {
    return {
      ok: false,
      reason: `Box occupies less than ${Math.round(minOccupancy * 100)}% of the frame`,
      metrics: {
        laplacianVariance: lapVar,
        occupancy: bbox.occupancy,
        edgePixelCount: bbox.count,
        width,
        height,
      },
    };
  }

  const minE = Math.min(energyX, energyY);
  const maxE = Math.max(energyX, energyY) || 1;
  const perpRatio = clamp01(minE / maxE);

  if (perpRatio < minPerpEnergyRatio) {
    return {
      ok: false,
      reason: 'Obvious perpendicular box edges are not visible (bad angle)',
      metrics: {
        laplacianVariance: lapVar,
        occupancy: bbox.occupancy,
        edgePixelCount: bbox.count,
        perpEnergyRatio: perpRatio,
        width,
        height,
      },
    };
  }

  return {
    ok: true,
    reason: null,
    metrics: {
      laplacianVariance: lapVar,
      occupancy: bbox.occupancy,
      edgePixelCount: bbox.count,
      perpEnergyRatio: perpRatio,
      width,
      height,
    },
  };
}

module.exports = {
  validateBoxImage,
};
