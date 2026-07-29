import client from './client'
import { type TaskCategory } from '../constants/categories'

/**
 * social-service: friends, friend requests, and kid search.
 * Every endpoint here is kid-only (the service enforces `IsKid`).
 */

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends'

export interface FriendStat {
  category: TaskCategory
  level: number
  xp_percent: number
}

/**
 * A friend's wardrobe, as social-service reports it.
 *
 * Only `base_character` is dependable today: social reads `equipped_hat`,
 * `equipped_outfit` and `equipped_accessory` from catalog-service, but catalog
 * emits `equipped_hair`, `equipped_glasses` and `equipped_earrings`. The names
 * never match, so those three arrive `null` for everyone. `equipped_background`
 * is the one slot whose name lines up.
 */
export interface FriendAvatar {
  base_character: string
  equipped_hat: string | null
  equipped_outfit: string | null
  equipped_accessory: string | null
  equipped_background: string | null
}

export interface Friend {
  kid_id: string
  friendship_id: string
  is_online: boolean
  friends_since: string
  name: string
  username: string
  bio: string
  avatar: FriendAvatar | null
  main_level: number
  overall_xp: number
  stats: FriendStat[]
}

/**
 * An incoming friend request.
 *
 * Note there is no identity here — just the sender's id. social-service has no
 * public kid-by-id lookup, so the UI cannot say who a request is from until
 * the serializer carries the sender's name the way the friends list does.
 */
export interface FriendRequest {
  id: string
  from_kid_id: string
  to_kid_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  responded_at: string | null
}

export interface KidSearchResult {
  kid_id: string
  username: string
  name: string
  bio: string
  is_online: boolean
  friendship_status: FriendshipStatus
}

export interface KidSearchPage {
  count: number
  next: string | null
  previous: string | null
  results: KidSearchResult[]
}

/** GET /social/friends/ — accepted friends, enriched with identity, progress and presence. */
export async function getFriends(): Promise<Friend[]> {
  const res = await client.get<Friend[]>('/social/friends/')
  return res.data
}

/** GET /social/friends/requests/ — friend requests sent *to* me and still pending. */
export async function getFriendRequests(): Promise<FriendRequest[]> {
  const res = await client.get<FriendRequest[]>('/social/friends/requests/')
  return res.data
}

/** POST /social/friends/requests/ — ask to be someone's friend. */
export async function sendFriendRequest(toKidId: string): Promise<FriendRequest> {
  const res = await client.post<FriendRequest>('/social/friends/requests/', { to_kid_id: toKidId })
  return res.data
}

/** POST /social/friends/requests/:id/accept/ */
export async function acceptFriendRequest(requestId: string): Promise<FriendRequest> {
  const res = await client.post<FriendRequest>(`/social/friends/requests/${requestId}/accept/`)
  return res.data
}

/** POST /social/friends/requests/:id/decline/ */
export async function declineFriendRequest(requestId: string): Promise<FriendRequest> {
  const res = await client.post<FriendRequest>(`/social/friends/requests/${requestId}/decline/`)
  return res.data
}

/** DELETE /social/friends/:kidId/ — remove an accepted friendship. */
export async function unfriend(kidId: string): Promise<void> {
  await client.delete(`/social/friends/${kidId}/`)
}

export interface SearchKidsParams {
  q: string
  /** Defaults to `not_friends` server-side — the sensible list when adding someone. */
  status?: 'not_friends' | 'pending' | 'friends' | 'all'
  page?: number
  pageSize?: number
}

/** GET /social/kids/search/ — find kids to add. The server rejects `q` under 2 characters. */
export async function searchKids({ q, status, page, pageSize }: SearchKidsParams): Promise<KidSearchPage> {
  const res = await client.get<KidSearchPage>('/social/kids/search/', {
    params: { q, status, page, page_size: pageSize },
  })
  return res.data
}

// Mirrors catalog-service's `build_avatar_url`: these two seeds ship with a hair
// colour override, and without it they render noticeably lighter than in the
// avatar studio.
const DARK_HAIR_SEEDS = ['5dko0f0w', 'kwiay0te']

/**
 * A friend's character image, composed from their base character.
 *
 * Equipped items are deliberately not applied: they arrive null (see
 * `FriendAvatar`), and resolving item ids to DiceBear parameters would need the
 * catalog item list, which is a different service's concern.
 */
export function friendAvatarUrl(avatar: FriendAvatar | null): string | null {
  if (!avatar?.base_character) return null
  const url = new URL('https://api.dicebear.com/10.x/adventurer/svg')
  url.searchParams.set('seed', avatar.base_character)
  if (DARK_HAIR_SEEDS.includes(avatar.base_character)) {
    url.searchParams.set('hairColor', '2c1b18')
  }
  return url.toString()
}
