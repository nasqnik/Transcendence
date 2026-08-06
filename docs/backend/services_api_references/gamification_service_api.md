# Gamification Service API

All paths are prefixed with `/api/gamification/`. Public endpoints use `Authorization: Bearer <JWT>`.  
Interactive docs: `/api/gamification/docs/`.

Roles: **kid** and **parent** (decided by the JWT). Internal endpoints use `X-Internal-Token`.

## Kid profile

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/profile/` | kid | Get the kid's main level, overall XP, and coin balance. |

**GET `/profile/` response**

```json
{
  "main_level": 2,
  "overall_xp": 45,
  "coins": 50
}
```

Profile is created automatically on first read if it does not exist yet.

## Kid stats

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/stats/` | kid | List per-category level and XP progress for the logged-in kid. |

**GET `/stats/` response**

```json
[
  {
    "category": "learning",
    "level": 1,
    "xp_percent": 35
  },
  {
    "category": "health",
    "level": 0,
    "xp_percent": 20
  }
]
```

**`category` values**

| Value | Meaning |
| --- | --- |
| `health` | Health-related tasks. |
| `learning` | Learning-related tasks. |
| `responsibility` | Responsibility-related tasks. |
| `creativity` | Creativity-related tasks. |

`xp_percent` is progress toward the next category level (0–100).  
`level` is the current category level for that kid.

## Rewards (coin popup)

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/rewards/pending/` | kid | Coin awards the client has not shown yet, oldest first. |
| POST | `/rewards/seen/` | kid | Acknowledge rewards so they stop being returned. |

A kid earns coins the moment a category bar fills. That can happen while the kid
is not looking at the app — a parent may confirm a task hours later. This feed
lets the client replay those awards and play the coin animation on next open.

**GET `/rewards/pending/` response**

```json
[
  {
    "completion_id": "9f1c...",
    "coins_awarded": 50,
    "stat_level_ups": [{ "category": "health", "level": 3 }],
    "coins_total": 200,
    "overall_xp": 50,
    "main_level": 1
  }
]
```

`coins_awarded` and `stat_level_ups` are the delta to animate; `coins_total`,
`overall_xp`, and `main_level` are the resulting totals to display afterwards.
Completions that earned no coins never appear here.

**POST `/rewards/seen/` body**

```json
{ "completion_ids": ["9f1c..."] }
```

Omit `completion_ids` to acknowledge everything pending. Responds with
`{"marked_seen": 1}`.

The same reward object is returned inline by task-service on `POST
/api/task/completions/` (as the `reward` field) when a task auto-confirms, so
the common case needs no extra request — this feed is the catch-up path.

## Parent read

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/kids/{kid_id}/stats/` | parent | List per-category stats for a guarded kid. |

Same response shape as GET `/stats/`.

Returns `403` if `kid_id` is not in the parent's `kid_ids` JWT claim.

## Internal (service-to-service)

> These endpoints are **not** for frontend or kid/parent use. They are called by other backend services using `X-Internal-Token`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/internal/completions/` | X-Internal-Token | Apply XP from a confirmed task completion. |
| POST | `/internal/coins/deduct/` | X-Internal-Token | Deduct coins from a kid profile (shop purchase). |
| GET | `/internal/kids/progress/?ids=<uuid>,<uuid>` | X-Internal-Token | Batch overall XP + per-category stats for friends enrichment. |

**GET `/internal/kids/progress/` response**

```json
[
  {
    "kid_id": "<uuid>",
    "main_level": 2,
    "overall_xp": 150,
    "stats": [
      { "category": "health", "level": 1, "xp_percent": 40 },
      { "category": "learning", "level": 2, "xp_percent": 10 }
    ]
  }
]
```

Kids without a profile row still appear with `main_level`/`overall_xp` of `0` and empty `stats`.

**POST `/internal/completions/` body**

```json
{
  "completion_id": "<uuid>",
  "kid_id": "<uuid>",
  "category_points": [
    { "category": "learning", "points": 6 },
    { "category": "health", "points": 0 }
  ]
}
```

- Called by task-service when a completion is confirmed.
- Idempotent on `completion_id` — a duplicate call awards nothing a second time
  and replies with what the original call awarded.
- Returns `200` with the reward summary (same shape as `/rewards/pending/`
  entries), which task-service passes straight back to the kid.

**POST `/internal/coins/deduct/` body**

```json
{
  "kid_id": "<uuid>",
  "amount": 50,
  "reason": "catalog_purchase"
}
```

**Success response**

```json
{
  "success": true,
  "remaining_coins": 150
}
```

**Insufficient coins response**

```json
{
  "success": false,
  "reason": "insufficient_coins"
}
```

Called by catalog-service on avatar purchase. Uses row locking to prevent double-spend.

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/` | Health check. |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |

## Notes for frontend

- Coin balance lives here — catalog-service deducts coins internally on purchase; the kid UI should read `/profile/` for the current balance.
- New profiles start with `STARTER_COINS` (default **50**) so kids can buy something before grinding.
- Category stats start empty until the kid completes confirmed tasks (task-service pushes completions internally).
- A single completion can award points to **multiple** categories (`category_points` is a list).
- Completing a category bar awards coins **and** overall XP; main level increases when `overall_xp` crosses the configured threshold but grants no coins of its own.
- After a main level-up, gamification-service notifies the kid via notification-service (`level_up`).
- Economy defaults: category bar **50**, **50** overall XP and **50** coins per stat level, main level at **100** XP.
