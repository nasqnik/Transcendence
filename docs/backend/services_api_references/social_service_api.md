# Social Service API

All paths are prefixed with `/api/social/`. Auth via `Authorization: Bearer <JWT>`.  
Interactive docs: `/api/social/docs/`.

Roles: **kid** only for friend endpoints (parents get `403`).

Local testing: `make seed-dev-friend` creates two separate parent+kid pairs (not friends) and prints JWTs.

## Friends

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/friends/requests/` | kid | Send a friend request. |
| GET | `/friends/requests/` | kid | List incoming pending requests. |
| POST | `/friends/requests/{id}/accept/` | kid | Accept a request (recipient only). |
| POST | `/friends/requests/{id}/decline/` | kid | Decline a request (recipient only). |
| GET | `/friends/` | kid | List accepted friends with online status. |
| DELETE | `/friends/{kid_id}/` | kid | Remove an accepted friendship. |

**POST `/friends/requests/` body**

```json
{ "to_kid_id": "<uuid>" }
```

**POST `/friends/requests/` response** (`201`)

```json
{
  "id": "<uuid>",
  "from_kid_id": "<uuid>",
  "to_kid_id": "<uuid>",
  "status": "pending",
  "created_at": "2026-07-18T12:00:00Z",
  "responded_at": null
}
```

Returns `400` if you friend yourself, or if a pending/accepted friendship already exists in either direction.

**GET `/friends/requests/` response**

```json
[
  {
    "id": "<uuid>",
    "from_kid_id": "<uuid>",
    "to_kid_id": "<uuid>",
    "status": "pending",
    "created_at": "2026-07-18T12:00:00Z",
    "responded_at": null
  }
]
```

**POST `/friends/requests/{id}/accept/` response**

```json
{
  "id": "<uuid>",
  "from_kid_id": "<uuid>",
  "to_kid_id": "<uuid>",
  "status": "accepted",
  "created_at": "2026-07-18T12:00:00Z",
  "responded_at": "2026-07-18T12:05:00Z"
}
```

Returns `404` if the request is missing, not pending, or not addressed to you.

**POST `/friends/requests/{id}/decline/` response**

Same shape as accept, with `"status": "declined"`.

**GET `/friends/` response**

```json
[
  {
    "kid_id": "<uuid>",
    "friendship_id": "<uuid>",
    "is_online": true,
    "friends_since": "2026-07-18T12:05:00Z"
  }
]
```

**DELETE `/friends/{kid_id}/`**

Returns `204` on success, `404` if no accepted friendship exists with that kid.

**`status` values**

| Value | Meaning |
| --- | --- |
| `pending` | Friend request waiting for the recipient. |
| `accepted` | Kids are friends. |
| `declined` | Recipient declined the request. |
| `blocked` | Reserved for later (not used in v1 flows). |

Friend request rules:
- Kids only (parents get 403).
- Cannot friend yourself.
- Cannot create a second pending/accepted edge in either direction.
- `to_kid_id` must be an **active** kid in auth-service (internal lookup). Unknown IDs return `400`.

## Presence (WebSocket)

Connect: `wss://localhost/ws/presence/?token=<kid access JWT>`.

On connect / disconnect the service:
1. Marks the kid online / offline in Redis (`presence:online`).
2. Notifies accepted friends over their presence channel groups.

`GET /friends/` reads that Redis set to fill `is_online`.

### Heartbeat

Clients should send a JSON ping about every **25–30 seconds**:

```json
{ "type": "ping" }
```

Server replies:

```json
{ "type": "pong" }
```

If no ping is received for about **90 seconds**, the server closes the socket and marks the kid offline.

**Event payloads**

```json
{ "event": "friend_online", "kid_id": "<uuid>" }
```

```json
{ "event": "friend_offline", "kid_id": "<uuid>" }
```

## Health

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/` | Service health check. |

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |
