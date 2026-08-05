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
 * A friend's character, as social-service reports it.
 *
 * `avatar_url` is composed by catalog-service and passed through, so the
 * equipped items are already baked in — the frontend no longer reconstructs it
 * from the base character. Null when the kid has no avatar row yet.
 */
export interface FriendAvatar {
  avatar_url: string | null
  base_character: string
  equipped_hair: string | null
  equipped_glasses: string | null
  equipped_earrings: string | null
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
 * An incoming friend request, newest first.
 *
 * The sender's identity is enriched from auth-service. If auth is unreachable
 * those fields come back as empty strings and the row is still returned, so
 * the UI falls back rather than showing nothing.
 */
export interface FriendRequest {
  id: string
  from_kid_id: string
  to_kid_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  responded_at: string | null
  from_name: string
  from_username: string
  from_bio: string
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

