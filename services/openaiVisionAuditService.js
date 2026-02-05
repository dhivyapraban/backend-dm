const OpenAI = require('openai');

const RESPONSE_SCHEMA = {
  name: 'box_damage_audit',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      severe_damage: { type: 'boolean' },
      damage_percent: { type: 'number' },
      confidence: { type: 'number' },
      reason: { type: 'string' },
    },
    required: ['severe_damage', 'damage_percent', 'confidence', 'reason'],
  },
};

function toDataUrl(buffer, mimeType) {
  const b64 = Buffer.from(buffer).toString('base64');
  const mime = mimeType && String(mimeType).includes('/') ? String(mimeType) : 'image/jpeg';
  return `data:${mime};base64,${b64}`;
}

function buildSystemPrompt() {
  return [
    'You are a logistics visual inspection system for cuboid cardboard boxes.',
    '',
    'Task:',
    '- Compare TWO reference images (intact) with TWO current images (handover) of the SAME box.',
    '- Each view is a diagonal corner view of a cuboid box (approx 45° corner), so two perpendicular faces and the corner edge should be visible.',
    '',
    'Severe damage definition (STRUCTURAL):',
    '- crushed/collapsed corners',
    '- collapsed/creased edges that change the box geometry',
    '- punctures/holes/tears that compromise structure',
    '- major deformation, caving-in, bulging that indicates structural damage',
    '',
    'Non-severe (IGNORE):',
    '- dirt, dust, labels, tape, marker',
    '- small scuffs, superficial scratches, minor cosmetic creases',
    '',
    'Capture variation:',
    '- Humans may vary angle, distance, lighting, background.',
    '- Tolerate small perspective differences; focus on geometry changes and structural damage.',
    '',
    'Output rules:',
    '- Return JSON ONLY matching the required schema.',
    '- damage_percent is 0..100 (0 = intact, 100 = completely destroyed).',
    '- confidence is 0..1.',
    '- reason is a short, specific explanation (max ~25 words).',
  ].join('\n');
}

async function auditBoxDamageWithOpenAI({
  refA,
  refB,
  curA,
  curB,
  model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-2024-08-06',
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not set');
    err.statusCode = 500;
    throw err;
  }

  const client = new OpenAI({ apiKey });

  const system = buildSystemPrompt();

  const userText = [
    'Compare reference vs current images for the same cuboid box.',
    '',
    'Pairs:',
    '- View A: reference A vs current A',
    '- View B: reference B vs current B',
    '',
    'Decide if there is SEVERE STRUCTURAL DAMAGE.',
    'Be strict: only structural damage counts as severe.',
  ].join('\n');

  // OpenAI Responses API, vision via input_image.
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: system }],
      },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: userText },
          { type: 'input_text', text: 'REFERENCE VIEW A:' },
          { type: 'input_image', image_url: toDataUrl(refA.buffer, refA.mimeType) },
          { type: 'input_text', text: 'CURRENT VIEW A:' },
          { type: 'input_image', image_url: toDataUrl(curA.buffer, curA.mimeType) },
          { type: 'input_text', text: 'REFERENCE VIEW B:' },
          { type: 'input_image', image_url: toDataUrl(refB.buffer, refB.mimeType) },
          { type: 'input_text', text: 'CURRENT VIEW B:' },
          { type: 'input_image', image_url: toDataUrl(curB.buffer, curB.mimeType) },
        ],
      },
    ],
    // Structured Outputs (Responses API): moved from `response_format` to `text.format`.
    text: {
      format: {
        type: 'json_schema',
        name: RESPONSE_SCHEMA.name,
        strict: true,
        schema: RESPONSE_SCHEMA.schema,
      },
    },
    temperature: 0.2,
  });

  const text = response.output_text;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const err = new Error(`LLM returned non-JSON output: ${text.slice(0, 200)}`);
    err.statusCode = 502;
    throw err;
  }

  return parsed;
}

module.exports = {
  auditBoxDamageWithOpenAI,
};
