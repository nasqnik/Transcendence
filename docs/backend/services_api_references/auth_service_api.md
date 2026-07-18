# Auth Service API

All paths are prefixed with `/api/`. Interactive docs: `/api/docs/`.

Two account types: **parent** and **kid**. Most endpoints return JWT access/refresh tokens.

## Profile (parent or kid)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/auth/me/` | Return the logged-in parent or kid profile. |
| PATCH | `/auth/me/` | Update editable profile fields for the logged-in actor. |
| POST | `/auth/me/password/` | Set or change the app password. |
| POST | `/auth/me/email/` | Request an email change (confirmation sent to the new address). |
| POST | `/auth/verify-email-change/` | Confirm a pending email change with the token (public). |

Editable profile fields:
- **Parent:** `username`
- **Kid:** `name`, `username`

Read-only on GET `/auth/me/`: `id`, `email`, `pending_email`, `role` (parent), `registration_status` / `avatar_url` (kid), `email_verified`, `has_password`, `created_at`.

### Password (`POST /auth/me/password/`)

```json
{ "current_password": "...", "new_password": "..." }
```

- If the account already has a password: `current_password` is required and must match.
- Google-only / no password yet: omit `current_password` and send `new_password` to **set** one.
- Returns `204` on success.

### Email change

**Request** (`POST /auth/me/email/`):

```json
{ "email": "new@example.com" }
```

Response includes `pending_email`. The current email stays active until confirmation.

**Confirm** (`POST /auth/verify-email-change/`):

```json
{ "token": "<uuid>" }
```

## Parent

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register/` | Register a parent and send a verification email. |
| POST | `/auth/verify-email/` | Verify a parent's email. |
| POST | `/auth/token/` | Log in a parent (email/username + password) -> tokens. |
| POST | `/auth/token/refresh/` | Refresh a parent's access token. |
| POST | `/auth/token/verify/` | Check a parent's access token is valid. |
| POST | `/auth/google/` | Log in or sign up a parent via Google. |

The parent access token includes a `kid_ids` claim (the kids they guard), used by task-service.

## Kid

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/kids/signup/` | Register a kid and invite the primary parent. |
| POST | `/kids/signup/google/` | Register a kid via Google (not used yet). |
| POST | `/auth/kid/verify-email/` | Verify a kid's email. |
| POST | `/kids/invite-parent/` | Logged-in kid invites a second parent. |
| POST | `/auth/kid/token/` | Log in a kid -> tokens. |
| POST | `/auth/kid/token/refresh/` | Refresh a kid's access token. |
| POST | `/auth/kid/token/verify/` | Check a kid's access token is valid. |
| POST | `/auth/kid/google/` | Log in a kid via Google. |

## Guardian invitations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/guardian-invitations/{token}/` | Preview a pending invitation (public). |
| POST | `/guardian-invitations/accept/` | Logged-in parent accepts a guardian invitation. |

## Internal (service-to-service)

Header: `X-Internal-Token`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/auth/internal/kids/{kid_id}/parent/` | Return `{ "parent_id" }` for a kid. |
| GET | `/auth/internal/kids/{kid_id}/` | Return `{ "kid_id", "username", "name" }` if the kid is **active**. |

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |
| GET | `/admin/` | Django admin (superuser). |
