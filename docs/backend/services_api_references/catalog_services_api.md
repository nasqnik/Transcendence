# Catalog Service API

All paths are prefixed with `/api/catalog/`. Auth via `Authorization: Bearer <JWT>`.  
Interactive docs: `/api/catalog/docs/`.

Roles: **kid** — shop and avatar. **parent** — profile picture and kids' avatars.

## Shop

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/shop/` | kid | List all active avatar items available for purchase. |
| POST | `/shop/purchase/` | kid | Purchase an avatar item using coins. |

**GET `/shop/` response**

```json
[
  {
    "id": "<uuid>",
    "name": "Long Hair 1",
    "type": "hair",
    "image_url": "https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=long03",
    "coin_cost": 60,
    "is_active": true,
    "param_key": "hairVariant",
    "param_value": "long03"
  }
]
```

**POST `/shop/purchase/` body**

```json
{ "item_id": "<uuid>" }
```

**POST `/shop/purchase/` response**

```json
{
  "detail": "Purchase successful.",
  "remaining_coins": 150
}
```

Returns `404` if the item does not exist or is inactive.  
Returns `400` if the kid already owns the item or does not have enough coins.  
Returns `503` if gamification-service is unavailable.

**`type` values**

| Value | Meaning |
| --- | --- |
| `hair` | Hair style for the kid's avatar. |
| `glasses` | Glasses for the kid's avatar. |
| `earrings` | Earrings for the kid's avatar. |
| `background` | Background color for the kid's avatar. |

## Avatar

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/avatar/` | kid | Get the kid's current avatar state including owned and equipped items. |
| GET | `/avatar/characters/` | kid | List available base characters (male and female). Free to select. |
| PATCH | `/avatar/base/` | kid | Set base character (male or female). Free — no coins required. |
| PATCH | `/avatar/equip/` | kid | Equip an owned item to the correct slot. |
| PATCH | `/avatar/unequip/` | kid | Unequip an item from a specific slot. |

**GET `/avatar/` response**

```json
{
  "id": "<uuid>",
  "kid_id": "<uuid>",
  "base_character": "5dko0f0w",
  "avatar_url": "https://api.dicebear.com/10.x/adventurer/svg?seed=5dko0f0w&hairVariant=long03&glassesVariant=variant02&glassesProbability=100&backgroundColor=b6e3f4",
  "unlocked_items": [
    {
      "id": "<uuid>",
      "name": "Long Hair 1",
      "type": "hair",
      "image_url": "https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=long03",
      "coin_cost": 60,
      "is_active": true,
      "param_key": "hairVariant",
      "param_value": "long03"
    }
  ],
  "equipped_hair": "<uuid>",
  "equipped_glasses": null,
  "equipped_earrings": null,
  "equipped_background": null,
  "updated_at": "2026-07-27T19:17:03.050000Z"
}
```

- `avatar_url` — ready-to-display composed URL combining base character + all equipped items. Frontend just renders this URL directly.
- `unlocked_items` — full item objects the kid owns including `param_key` and `param_value`.

**GET `/avatar/characters/` response**

```json
[
  {
    "seed": "5dko0f0w",
    "name": "Male",
    "avatar_url": "https://api.dicebear.com/10.x/adventurer/svg?seed=5dko0f0w"
  },
  {
    "seed": "kwiay0te",
    "name": "Female",
    "avatar_url": "https://api.dicebear.com/10.x/adventurer/svg?seed=kwiay0te"
  }
]
```

**PATCH `/avatar/base/` body**

```json
{ "base_character": "5dko0f0w" }
```

`base_character` must be one of: `5dko0f0w` (male), `kwiay0te` (female).

Returns the full updated avatar object (same shape as GET `/avatar/`).

**PATCH `/avatar/equip/` body**

```json
{ "item_id": "<uuid>" }
```

Returns the full updated avatar object (same shape as GET `/avatar/`).

Returns `404` if the item does not exist or is inactive.  
Returns `400` if the kid does not own the item.

**PATCH `/avatar/unequip/` body**

```json
{ "slot": "hair" }
```

`slot` must be one of: `hair`, `glasses`, `earrings`, `background`.

Returns the full updated avatar object (same shape as GET `/avatar/`).  
Returns `400` if slot value is invalid.

## Parent Profile

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/parent/avatar/` | parent | Get parent profile picture URL. |
| POST | `/parent/avatar/upload/` | parent | Upload or replace parent profile picture. |
| DELETE | `/parent/avatar/` | parent | Delete parent profile picture. |
| GET | `/parent/kids/avatars/` | parent | Get composed avatar URLs for all guarded kids. |

**GET `/parent/avatar/` response**

```json
{
  "id": "<uuid>",
  "parent_id": "<uuid>",
  "profile_picture": "<image_url>",
  "updated_at": "2026-07-24T06:20:45.498060Z"
}
```

Returns `null` for `profile_picture` if none uploaded — frontend handles default display.

**POST `/parent/avatar/upload/` request**

Send as `multipart/form-data` with field `profile_picture` containing the image file.

- Allowed formats: JPEG, PNG, WebP
- Max size: 2MB
- Replaces existing picture if one already exists

Returns `400` if file format is invalid or file is empty.  
Returns `413` if file exceeds 2MB (nginx-level rejection with JSON error).

**DELETE `/parent/avatar/` response**

```json
{
  "id": "<uuid>",
  "parent_id": "<uuid>",
  "profile_picture": null,
  "updated_at": "2026-07-27T20:23:57.114104Z"
}
```

**GET `/parent/kids/avatars/` response**

```json
[
  {
    "kid_id": "<uuid>",
    "avatar_url": "https://api.dicebear.com/10.x/adventurer/svg?seed=5dko0f0w&hairVariant=long03&glassesVariant=variant02&glassesProbability=100"
  }
]
```

Returns one entry per guarded kid. `avatar_url` is ready to display — no rendering needed on frontend.

## Internal (Service-to-Service)

Header: `X-Internal-Token`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/internal/avatars/?ids=<uuid>,<uuid>` | Batch catalog avatars. Kids without an avatar row are omitted. |

Response items use the same public avatar fields as `GET /avatar/`.

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/` | Health check. |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |

## Notes for frontend

- Shop items are seeded via `make seed-catalog` — shop is empty without it.
- Coin balance is owned by gamification-service — catalog-service calls it internally on purchase.
- `avatar_url` in `GET /avatar/` is a single composed URL — just display it directly, no rendering logic needed.
- `unlocked_items` includes full item details with `param_key` and `param_value` for reference.
- Equipped slots (`equipped_hair`, `equipped_glasses`, `equipped_earrings`, `equipped_background`) are UUIDs or `null` if nothing is equipped.
- `profile_picture` can be `null` if parent hasn't uploaded — handle default display on frontend side.
- Base characters are free — kid picks male or female via `PATCH /avatar/base/`, no coins deducted.
- If an equipped item is deleted from the shop, it is automatically unequipped on next avatar fetch.