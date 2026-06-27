# Analytics Service API

All paths are prefixed with `/api/analytics/`. Auth via `Authorization: Bearer <JWT>`.  
Interactive docs: `/api/analytics/docs/`.

Roles: **parent** (decided by the JWT). A parent's token carries `kid_ids` (the kids they guard).

## Dashboard

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/kids/{kid_id}/dashboard/` | parent | Get analytics dashboard for a guarded kid. |

**GET `/kids/{kid_id}/dashboard/` response**

```json
{
  "category_breakdown": [
    { "category": "Chores", "total_points": 120 }
  ],
  "daily_trend": [
    { "date": "2026-06-24", "points": 60 }
  ],
  "completion_rates": {
    "total": 10,
    "confirmed": 7,
    "rejected": 1,
    "pending": 2,
    "rate": 70.0
  }
}
```

- `category_breakdown` — XP points earned per task category, sorted alphabetically.
- `daily_trend` — total XP earned per day, sorted by date.
- `completion_rates` — overall task completion stats fetched from the task service. `rate` is the confirmation percentage (0–100).

Returns `404` if `kid_id` does not belong to the authenticated parent.

## Internal (Service-to-Service)

> These endpoints are **not** for frontend or kid/parent use. They are called by other backend services using `X-Internal-Token`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/internal/activity/` | X-Internal-Token | Ingest a completion event from the gamification service. |

**POST `/internal/activity/` body**

```json
{
  "completion_id": "<uuid>",
  "kid_id": "<uuid>",
  "payload": [
    { "category": "Chores", "points": 30 }
  ]
}
```

- Idempotent on `completion_id` — duplicate calls return `204` without creating a new record.
- `payload` is the raw category/points breakdown from the gamification service.

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/` | Health check. |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |
