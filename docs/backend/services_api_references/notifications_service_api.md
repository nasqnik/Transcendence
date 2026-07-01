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

## WebSocket (Real-time Notifications)

Connect via Websocket to receive notifications in real-time without polling.

**URL:**

wss://<localhost>/ws/notifications/?token=<JWT_ACCESS_TOKEN>

**Auth:** Pass the JWT access token as a query parameter `token=` -WebSocket connections cannot send HTTP headers, so the token goes in the URL.

**Connection example (browser):**
```javascript
const token = "<KID_OR_PARENT_ACCESS_TOKEN>";
const ws = new WebSocket(`wss://localhost/ws/notifications/?token=${token}`);

ws.onopen = () => console.log("Connected");
ws.onmessage = (e) => console.log("Notification:", JSON.parse(e.data));
ws.onerror = (e) => console.log("❌ Error:", e);
ws.onclose = (e) => console.log("Disconnected:", e.code);
```

**Message shape (received from server):**
```json
{
  "id": "<uuid>",
  "notification_type": "task_confirmed",
  "message": "Your task was confirmed. Great job.",
  "is_read": false,
  "created_at": "2026-06-28T07:26:39.386603+00:00"
}
```

**Behaviour:**
- Server sends a message instantly when a new notification is created for the connected user
- Connection stays open until the client disconnects or the token expires
- Disconnection is handled gracefully — reconnect by opening a new WebSocket connection
- Both kids and parents can connect — each user only receives their own notifications

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/` | Health check. |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |