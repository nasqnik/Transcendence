# Notification Service API

All paths are prefixed with `/api/notification/`. Auth via `Authorization: Bearer <JWT>`.  
Interactive docs: `/api/notification/docs/`.

Roles: **kid** and **parent** (decided by the JWT).

## Notifications

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/notifications/` | kid / parent | List all unread notifications for the logged-in user. |
| GET | `/notifications/unread-count/` | kid / parent | Get the count of unread notifications. Used for badge display. |
| PATCH | `/notifications/{notification_id}/read/` | kid / parent | Mark a specific notification as read. |

**GET `/notifications/` response**

```json
[
  {
    "id": "<uuid>",
    "notification_type": "task_confirmed",
    "message": "Your task was confirmed!",
    "is_read": false,
    "created_at": "2026-06-24T06:30:36.349631Z"
  }
]
```

**GET `/notifications/unread-count/` response**

```json
{ "unread_count": 3 }
```

**PATCH `/notifications/{notification_id}/read/` response**

```json
{ "id": "<uuid>", "is_read": true }
```

Returns `404` if the notification does not belong to the authenticated user.

**`notification_type` values**

| Value | Meaning |
| --- | --- |
| `task_confirmed` | A parent confirmed the kid's task completion. |
| `task_rejected` | A parent rejected the kid's task completion. |
| `task_submitted` | A kid submitted a task for review (parent receives this). |
| `level_up` | The kid levelled up in the gamification system. |

## Internal (Service-to-Service)

> These endpoints are **not** for frontend or kid/parent use. They are called by other backend services using `X-Internal-Token`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/internal/notify/` | X-Internal-Token | Create a notification for a kid or parent. |

**POST `/internal/notify/` body**

```json
{
  "recipient_id": "<uuid>",
  "notification_type": "task_confirmed",
  "message": "Your task was confirmed!"
}
```

- `recipient_id` is the user ID of the kid or parent to notify.
- `notification_type` must be one of the values listed above.

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/` | Health check. |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |