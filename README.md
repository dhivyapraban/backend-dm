# Backend-DM
# Backend-DM

Express + Socket.IO backend for the ECOLOGY prototype.

## Damage Audit (Vision LLM)

This project includes a cloud-based cuboid box damage audit endpoint powered by an OpenAI vision model (no on-device ML, no training, no fine-tuning).

### Endpoint

`POST /audit-damage` (also available as `POST /api/audit-damage`)

**Request:** `multipart/form-data`
- Images (required):
	- `ref_view_A` (file)
	- `ref_view_B` (file)
	- `cur_view_A` (file)
	- `cur_view_B` (file)
- Metadata (optional):
	- `box_id` (string)
	- `timestamp` (string)

**Server-side validation (before LLM):**
- blur rejection (Laplacian variance)
- occupancy rejection (box edges must cover ≥ 60% of frame)
- corner/edge visibility rejection (perpendicular edge energy must be present)

**Response:** JSON
```json
{
	"severe_damage": true,
	"damage_percent": 72.5,
	"confidence": 0.86,
	"reason": "Corner is crushed and edge is structurally collapsed compared to reference.",
	"escalated_to_admin": true
}
```

**Policy enforcement:**
- `damage_percent > 35` ⇒ escalated (`escalated_to_admin: true`) and `severe_damage: true`.

### Environment

Add to your `.env`:
- `OPENAI_API_KEY=...`
- `OPENAI_VISION_MODEL=gpt-4o` (optional, defaults to `gpt-4o`)

### Example (curl)

```bash
curl -X POST http://localhost:3000/audit-damage \
	-F "box_id=BOX-123" \
	-F "timestamp=2026-02-05T10:15:00Z" \
	-F "ref_view_A=@refA.jpg" \
	-F "ref_view_B=@refB.jpg" \
	-F "cur_view_A=@curA.jpg" \
	-F "cur_view_B=@curB.jpg"
```

### Admin notification

When escalated, the server emits Socket.IO event `admin:auditDamage` with the result payload.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
