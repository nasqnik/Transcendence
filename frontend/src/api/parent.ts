import client from './client'
import { decodeJWT } from './auth'
import { type Completion, type KidStat, type KidProfile } from '../constants/categories'

/** Extract kid_ids from a stored parent JWT without making a network call. */
export function kidIdsFromToken(token: string): string[] {
  const payload = decodeJWT(token)
  const ids = payload['kid_ids']
  if (!Array.isArray(ids)) return []
  return ids as string[]
}

export interface KidRef {
  id: string
  username?: string
}

/** A parent's kids from their JWT — id + display name, no network call.
 *  Prefers a `kids: [{id, username}]` claim; falls back to `kid_ids` (id only)
 *  until the backend adds names to the token. */
export function kidsFromToken(token: string): KidRef[] {
  const payload = decodeJWT(token)
  const kids = payload['kids']
  if (Array.isArray(kids)) {
    return (kids as Array<{ id: unknown; username?: unknown }>).map(k => ({
      id: String(k.id),
      username: typeof k.username === 'string' ? k.username : undefined,
    }))
  }
  const ids = payload['kid_ids']
  if (Array.isArray(ids)) return (ids as string[]).map(id => ({ id }))
  return []
}

/** GET /task/completions/ — parent JWT auto-scopes to their kids. */
export async function getParentCompletions(): Promise<Completion[]> {
  const res = await client.get<Completion[]>('/task/completions/')
  return res.data
}

export interface ReviewCompletionInput {
  status: 'confirmed' | 'rejected'
  review_note: string
}

/** POST /task/completions/<id>/review/ — approve or reject a completion. */
export async function reviewCompletion(id: string, input: ReviewCompletionInput): Promise<Completion> {
  const res = await client.post<Completion>(`/task/completions/${id}/review/`, input)
  return res.data
}

/** GET /gamification/kids/<kid_id>/stats/ — category stats for one kid. */
export async function getKidStats(kidId: string): Promise<KidStat[]> {
  const res = await client.get<KidStat[]>(`/gamification/kids/${kidId}/stats/`)
  return res.data
}

/** GET /gamification/profile/ scoped to a kid — not yet available parent-side.
 *  We derive a lightweight KidProfile from the stats array instead. */
export function profileFromStats(kidId: string, stats: KidStat[]): KidProfile {
  const overall_xp = stats.reduce((sum, s) => sum + s.xp_percent, 0)
  const main_level = stats.length ? Math.max(...stats.map(s => s.level)) : 1
  return { id: kidId, kid_id: kidId, main_level, overall_xp, coins: 0 }
}
