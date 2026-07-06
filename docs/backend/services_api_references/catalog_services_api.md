# Catalog Service API

All paths are prefixed with `/api/catalog/`. Auth via `Authorization: Bearer <JWT>`.  
Interactive docs: `/api/catalog/docs/`.

Roles: **kid** only — the catalog is kid-facing.

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
    "name": "Cool Hat",
    "type": "hat",
    "image_url": "https://example.com/cool-hat.png",
    "coin_cost": 50,
    "is_active": true
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
| `hat` | A hat item for the kid's avatar. |
| `outfit` | An outfit item for the kid's avatar. |
| `accessory` | An accessory item for the kid's avatar. |
| `background` | A background item for the kid's avatar. |

## Avatar

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/avatar/` | kid | Get the kid's current avatar state including owned and equipped items. |
| PATCH | `/avatar/equip/` | kid | Equip an owned item to the correct slot. |

**GET `/avatar/` response**

```json
{
  "id": "<uuid>",
  "kid_id": "<uuid>",
  "base_character": "default",
  "unlocked_items": ["<uuid>", "<uuid>"],
  "equipped_hat": "<uuid>",
  "equipped_outfit": null,
  "equipped_accessory": null,
  "equipped_background": null,
  "updated_at": "2026-06-25T06:50:51.825394Z"
}
```

**PATCH `/avatar/equip/` body**

```json
{ "item_id": "<uuid>" }
```

**PATCH `/avatar/equip/` response**

Returns the full updated avatar object (same shape as GET `/avatar/`).

Returns `404` if the item does not exist or is inactive.  
Returns `400` if the kid does not own the item.

## Misc

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/` | Health check. |
| GET | `/docs/` | Swagger UI. |
| GET | `/schema/` | OpenAPI schema. |

## Notes for frontend

- The shop list is empty until an admin seeds items into the database.
- Coin balance is owned by gamification-service — catalog-service calls it internally on purchase.
- `unlocked_items` is a list of item UUIDs the kid owns. Use this to show lock/unlock state in the shop UI.
- Equipped slots (`equipped_hat`, `equipped_outfit`, etc.) are UUIDs or `null` if nothing is equipped.