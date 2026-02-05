const axios = require('axios');

const HF_MODEL = 'openai/clip-vit-base-patch32';
const HF_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

function getHfToken() {
  return (
    process.env.HF_API_TOKEN ||
    process.env.HUGGINGFACE_API_TOKEN ||
    process.env.HF_TOKEN ||
    null
  );
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return 0;
  }

  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < n; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }

  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return dot / denom;
}

function normalizeEmbeddingResponse(data) {
  // HF Inference API can return:
  // - [float, float, ...]
  // - [[float, ...]]
  // - { error: "..." }
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) return data[0];
    return data;
  }
  return null;
}

async function embedImageWithHF({ buffer, mimeType }) {
  const token = getHfToken();
  if (!token) {
    const err = new Error('HF_API_TOKEN is not set');
    err.statusCode = 500;
    throw err;
  }

  try {
    const res = await axios.post(HF_URL, buffer, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType || 'application/octet-stream',
        Accept: 'application/json',
      },
      timeout: 60_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    if (res.status >= 400) {
      const message =
        (res.data && res.data.error) ||
        (typeof res.data === 'string' ? res.data : null) ||
        `Hugging Face error (${res.status})`;

      const err = new Error(message);
      err.statusCode = res.status;
      err.provider = 'huggingface';
      throw err;
    }

    const emb = normalizeEmbeddingResponse(res.data);
    if (!emb) {
      const err = new Error('Unexpected embedding response from Hugging Face');
      err.statusCode = 502;
      throw err;
    }

    return emb;
  } catch (e) {
    // Axios network errors
    if (e && e.code === 'ECONNABORTED') {
      const err = new Error('Hugging Face request timed out');
      err.statusCode = 504;
      throw err;
    }
    throw e;
  }
}

function buildPolicyResult({ simA, simB }) {
  const minSim = Math.min(simA, simB);
  const finalSim = clamp01(minSim);

  const damagePercent = clamp01(1 - finalSim) * 100;

  // Confidence = agreement between the two views (simple, explainable).
  const agreement = clamp01(1 - Math.min(1, Math.abs(simA - simB) / 0.20));
  const confidence = clamp01(0.5 + 0.5 * agreement);

  const severe = damagePercent > 35;

  let label;
  if (damagePercent < 15) label = 'Intact';
  else if (damagePercent < 30) label = 'Minor damage';
  else if (damagePercent < 35) label = 'Moderate damage';
  else label = 'Severe damage';

  const weakerView = simA <= simB ? 'View A' : 'View B';
  const weakerSim = simA <= simB ? simA : simB;

  const reason = `${label} (min similarity ${finalSim.toFixed(2)}). ${weakerView} deviates most (${weakerSim.toFixed(2)}).`;

  return {
    severe_damage: severe,
    damage_percent: Number(damagePercent.toFixed(1)),
    confidence: Number(confidence.toFixed(2)),
    reason,
    escalated_to_admin: severe,
    similarity: {
      view_a: Number(simA.toFixed(4)),
      view_b: Number(simB.toFixed(4)),
      fused_min: Number(finalSim.toFixed(4)),
    },
  };
}

async function auditBoxDamageWithClip({ refA, refB, curA, curB }) {
  // Free tier can rate-limit; embed in two small batches.
  const [refAEmb, curAEmb] = await Promise.all([
    embedImageWithHF({ buffer: refA.buffer, mimeType: refA.mimeType }),
    embedImageWithHF({ buffer: curA.buffer, mimeType: curA.mimeType }),
  ]);

  const [refBEmb, curBEmb] = await Promise.all([
    embedImageWithHF({ buffer: refB.buffer, mimeType: refB.mimeType }),
    embedImageWithHF({ buffer: curB.buffer, mimeType: curB.mimeType }),
  ]);

  const simA = cosineSimilarity(refAEmb, curAEmb);
  const simB = cosineSimilarity(refBEmb, curBEmb);

  return buildPolicyResult({ simA, simB });
}

module.exports = {
  auditBoxDamageWithClip,
  cosineSimilarity,
};
