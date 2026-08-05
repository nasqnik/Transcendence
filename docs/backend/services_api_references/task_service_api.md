# Task Service API

All paths are prefixed with `/api/task/`. Auth via `Authorization: Bearer <JWT>`.
Interactive docs: `/api/task/docs/`.

Roles: **kid** and **parent** (decided by the JWT). A parent's token carries `kid_ids` (the kids they guard).

## Tasks

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/tasks/` | kid | List the kid's own active tasks. |
| POST | `/tasks/` | kid | Create a task. AI moderates text first, then scores categories / summary / `xp_reward`. |
| GET | `/tasks/{task_id}/` | kid | Get one of the kid's own tasks. |
| PATCH | `/tasks/{task_id}/` | kid | Edit a task (SSE + moderation when title/description change). |
| DELETE | `/tasks/{task_id}/` | kid | Soft-delete a task (`is_active=false`). Returns `204`. |

**POST `/tasks/` body**

```json
{ "title": "Read a book", "description": "Read 20 pages", "due_date": null }
```

**SSE flow (create / text edit):**
1. Content moderation (OpenRouter) — if unsafe: `error` with `code: "content_blocked"` (task not saved; warning in `message`).
2. If allowed: `moderation` → `{ "status": "allowed" }`.
3. Classification tokens: `token` events, then `done` with classification + task.

Response (and GET) include `id`, `xp_reward`, `ai_summary`, `ai_evaluated`, `category_rewards` (per-category points), and `review_mode`.

**`review_mode`** tells the UI how completing this task behaves:

| `review_mode` | Meaning | UI |
| --- | --- | --- |
| `always` | all shown categories -> completion will be pending | submit, no toggle |
| `never` | no shown categories -> auto-confirmed | submit, no toggle |
| `optional` | mixed -> kid decides | show a "send to parent?" toggle -> sets `send_for_review` |

Only send `send_for_review` when `review_mode === "optional"`; it is ignored otherwise.

## Completions

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/completions/` | kid / parent | Kid lists own; parent lists completions for their guarded kids. |
| POST | `/completions/` | kid | Submit a task as completed. |
| POST | `/completions/{completion_id}/review/` | parent | Confirm or reject a completion. 404 if not a guarded kid's. |

**POST `/completions/` body**

```json
{ "task": "<task_id>", "send_for_review": false }
```

List/create/review responses include nested task fields: `task_title`, `task_description`, `task_due_date`.

Resulting `status` depends on the kid's category visibility:
- all the task's categories shown to parent -> `pending`
- none shown -> `confirmed` (auto)
- mixed -> `pending` if `send_for_review` is true, else `confirmed`

**POST `/completions/{id}/review/` body**

```json
{ "status": "confirmed", "review_note": "Great job!" }
```

`status` must be `confirmed` or `rejected`.

**The `reward` field**

Confirming a completion can fill a category bar, which earns the kid coins. When
that happens the response to the confirming request carries the award so the UI
can animate it immediately:

```json
{
  "id": "247e...",
  "status": "confirmed",
  "reward": {
    "completion_id": "247e...",
    "coins_awarded": 50,
    "stat_level_ups": [{ "category": "health", "level": 3 }],
    "coins_total": 200,
    "overall_xp": 50,
    "main_level": 1
  }
}
```

`reward` is `null` whenever the request did not award anything — on list
responses, on submissions that go to `pending`, on confirmations that only
partly filled a bar, and if gamification-service was unreachable. A kid whose
task is confirmed later by a parent picks the award up from
`GET /api/gamification/rewards/pending/` instead, since the review response goes
to the parent.

## Settings

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/settings/categories/` | kid | Read which categories are shown to the parent. |
| PUT | `/settings/categories/` | kid | Update visibility (partial allowed). |

**Body / response**

```json
{ "show_health": true, "show_learning": true, "show_responsibility": true, "show_creativity": true }
```

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/` | Health check. |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |
