import client from './client'

export type AvatarSlot = 'hair' | 'glasses' | 'earrings' | 'background'

export interface AvatarItem {
  id: string
  name: string
  type: AvatarSlot
  image_url: string
  coin_cost: number
  is_active: boolean
  param_key: string
  param_value: string
}

export interface KidAvatar {
  id: string
  kid_id: string
  base_character: string
  avatar_url: string
  unlocked_items: AvatarItem[]
  equipped_hair: string | null
  equipped_glasses: string | null
  equipped_earrings: string | null
  equipped_background: string | null
  updated_at: string
}

export interface BaseCharacter {
  seed: string
  name: string
  avatar_url: string
}

/** GET /catalog/avatar/ — the kid's avatar (composed DiceBear URL + owned/equipped items). */
export async function getKidAvatar(): Promise<KidAvatar> {
  const res = await client.get<KidAvatar>('/catalog/avatar/')
  return res.data
}

/** GET /catalog/shop/ — all purchasable avatar items. */
export async function getShopItems(): Promise<AvatarItem[]> {
  const res = await client.get<AvatarItem[]>('/catalog/shop/')
  return res.data
}

/** GET /catalog/avatar/characters/ — base character options (male / female). */
export async function getBaseCharacters(): Promise<BaseCharacter[]> {
  const res = await client.get<BaseCharacter[]>('/catalog/avatar/characters/')
  return res.data
}

/** PATCH /catalog/avatar/base/ — set the base character (free). */
export async function setBaseCharacter(baseCharacter: string): Promise<KidAvatar> {
  const res = await client.patch<KidAvatar>('/catalog/avatar/base/', { base_character: baseCharacter })
  return res.data
}

/** POST /catalog/shop/purchase/ — spend coins to unlock an item. */
export async function purchaseItem(itemId: string): Promise<{ detail: string; remaining_coins: number }> {
  const res = await client.post('/catalog/shop/purchase/', { item_id: itemId })
  return res.data
}

/** PATCH /catalog/avatar/equip/ — equip an owned item to its slot. */
export async function equipItem(itemId: string): Promise<KidAvatar> {
  const res = await client.patch<KidAvatar>('/catalog/avatar/equip/', { item_id: itemId })
  return res.data
}

/** PATCH /catalog/avatar/unequip/ — clear a slot. */
export async function unequipItem(slot: AvatarSlot): Promise<KidAvatar> {
  const res = await client.patch<KidAvatar>('/catalog/avatar/unequip/', { slot })
  return res.data
}
