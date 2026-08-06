# Auth Service API

All paths are prefixed with `/api/`. Interactive docs: `/api/docs/`.

Two account types: **parent** and **kid**. Most endpoints return JWT access/refresh tokens.

## Username rules

Parents and kids share one username namespace — a kid cannot take a name a
parent already uses, or the other way round — so the same rule applies to both:

- 3 to 20 characters
- letters, digits, and underscore only (`a-z`, `A-Z`, `0-9`, `_`)
- must start with a letter
- reserved names (`admin`, `root`, `support`, `kiddopath`, and similar) are rejected

Surrounding whitespace is trimmed before validation. Case is stored as typed but
compared case-insensitively, so `Mariam` and `mariam` collide.

Enforced on kid signup, kid Google signup, parent registration, and `PATCH
/auth/me/` for both actors. Rejections return `400` with the message under the
`username` key. Google sign-in derives a parent's first username from their
email, sanitising it to fit these rules (`mariam.hassan+news@gmail.com` becomes
`mariamhassannews`).

Validation runs on create and update only. An account created before these rules
keeps its username, but its owner must pick a conforming one to save any profile
edit.

## Profile (parent or kid)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/auth/me/` | Return the logged-in parent or kid profile. |
| PATCH | `/auth/me/` | Update editable profile fields for the logged-in actor. |
| DELETE | `/auth/me/` | Delete the logged-in parent or kid account. |
| POST | `/auth/me/password/` | Set or change the app password. |
| POST | `/auth/me/email/` | Request an email change (confirmation sent to the new address). |
| POST | `/auth/verify-email-change/` | Confirm a pending email change with the token (public). |

Editable profile fields:
- **Parent:** `username`, `bio`
- **Kid:** `name`, `username`, `bio`

Read-only on GET `/auth/me/`: `id`, `email`, `pending_email`, `role` (parent), `registration_status` / `avatar_url` (kid), `email_verified`, `has_password`, `created_at`.

### A kid's guardians (`parents`)

A kid's GET `/auth/me/` also returns a read-only `parents` array, so the kid app
can show who their guardians are:

```json
"parents": [
  {
    "id": "19ce7946-...",
    "username": "dev_parent_multi",
    "email": "dev-parent-multi@localhost",
    "bio": "",
    "role": "primary"
  }
]
```

The primary guardian comes first, followed by a secondary one if the kid invited
a second parent who accepted. Only **accepted** guardians appear — a pending
invitation is not listed. The array is empty while the kid is still
`awaiting_primary_parent`, so clients must handle no guardians at all. Parents
do not get this field; their kids are already carried in their JWT.

### Delete account (`DELETE /auth/me/`)

- **Kid:** hard-deletes the kid account → `204`.
- **Parent with no linked kids:** hard-deletes the parent account → `204`.
- **Parent who is the only guardian of any child:** rejected → `409`
  (`"You can't delete this account while you're the only guardian. Link each child to another parent first."`).
- **Parent when every linked child already has another accepted guardian:** detaches this parent (revokes their guardian invites, reassigns `Kid.parent` if needed) then deletes → `204`.
- No request body. Clients should discard JWTs after `204`.

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

## Password reset (forgot password)

Public endpoints (no JWT). Auth-service sends the email itself (same as verify-email).
Links expire in **1 hour** (`PASSWORD_RESET_EXPIRY_HOURS`).

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/password-reset/` | Email a parent a reset link. |
| POST | `/auth/password-reset/confirm/` | Set a new parent password with the token. |
| POST | `/auth/kid/password-reset/` | Email a kid a reset link. |
| POST | `/auth/kid/password-reset/confirm/` | Set a new kid password with the token. |

**Request** (`POST …/password-reset/`):

```json
{ "email": "user@example.com" }
```

Always returns `200` with the same message whether or not the email exists
(so the API does not leak which emails are registered):

```json
{ "message": "If an account exists for that email, we sent a password reset link." }
```

In `DEBUG`, a matching account also gets `reset_token` and `reset_url` in the
response for local testing.

Frontend links in the email:

- Parent: `{FRONTEND_URL}/reset-password?token=<uuid>`
- Kid: `{FRONTEND_URL}/kid/reset-password?token=<uuid>`

**Confirm** (`POST …/password-reset/confirm/`):

```json
{ "token": "<uuid>", "new_password": "secure-pass-1" }
```

Success → `200` with `"Password updated. You can log in with your new password."`
Invalid/expired token → `400` under `token`.

## Parent

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register/` | Register a parent and send a verification email. |
| POST | `/auth/verify-email/` | Verify a parent's email. |
| POST | `/auth/token/` | Log in a parent (email/username + password) -> tokens. |
| POST | `/auth/token/refresh/` | Refresh a parent's access token. |
| POST | `/auth/token/verify/` | Check a parent's access token is valid. |
| POST | `/auth/google/` | Log in or sign up a parent via Google. |
| POST | `/auth/password-reset/` | Request a parent password reset email. |
| POST | `/auth/password-reset/confirm/` | Confirm a parent password reset. |

The parent access token includes:
- `kid_ids` — UUIDs of kids they guard (used by task-service and others)
- `kids` — `[{ "id", "username", "name" }, ...]` for parent UI display without an extra API call

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
| POST | `/auth/kid/password-reset/` | Request a kid password reset email. |
| POST | `/auth/kid/password-reset/confirm/` | Confirm a kid password reset. |

## Guardian invitations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/guardian-invitations/{token}/` | Preview a pending invitation (public). |
| POST | `/guardian-invitations/accept/` | Logged-in parent accepts a guardian invitation. |

## Internal (service-to-service)

Header: `X-Internal-Token`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/auth/internal/kids/search/?q=&ordering=&page=&page_size=&exclude_ids=&include_ids=` | Search active kids by username/name with sort + pagination. |
| GET | `/auth/internal/kids/?ids=<uuid>,<uuid>` | Batch lookup. Returns active kids only: `{ kid_id, username, name, bio }[]`. |
| GET | `/auth/internal/kids/{kid_id}/parent/` | Return `{ "parent_id" }` for a kid. |
| GET | `/auth/internal/kids/{kid_id}/` | Return `{ "kid_id", "username", "name", "bio" }` if the kid is **active**. |

**GET `/auth/internal/kids/search/` notes**

- `q` required, min 2 characters (`icontains` on username and name).
- `ordering`: `username` (default), `-username`, `name`, `-name`.
- `exclude_ids`: optional comma-separated UUIDs removed before pagination.
- `include_ids`: if the param is present, restrict to those UUIDs (empty → empty page).
- Pagination: `page`, `page_size` (default 20, max 50). Response: `{ count, next, previous, results }`.

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |
| GET | `/admin/` | Django admin (superuser). |
