import client from './client'
import { decodeJWT } from './auth'
import { type Completion, type KidStat } from '../constants/categories'

/** Extract kid_ids from a stored parent JWT without making a network call. */
export function kidIdsFromToken(token: string): string[] {
  const payload = decodeJWT(token)
  const ids = payload['kid_ids']
  if (!Array.isArray(ids)) return []
  return ids as string[]
}

export interface KidRef {
  id: string
  name?: string
  username?: string
}

/** A parent's kids from their JWT */
export function kidsFromToken(token: string): KidRef[] {
  const payload = decodeJWT(token)
  const kids = payload['kids']
  let list: KidRef[]
  if (Array.isArray(kids)) {
    list = (kids as Array<{ id: unknown; name?: unknown; username?: unknown }>).map(k => ({
      id: String(k.id),
      name: typeof k.name === 'string' ? k.name : undefined,
      username: typeof k.username === 'string' ? k.username : undefined,
    }))
  } else {
    const ids = payload['kid_ids']
    list = Array.isArray(ids) ? (ids as string[]).map(id => ({ id })) : []
  }
  return list.sort((a, b) =>
    (a.name || a.username || a.id).localeCompare(b.name || b.username || b.id))
}

export function kidDisplayName(kid: KidRef): string | undefined {
  return kid.name || kid.username
}

/** GET /task/completions/ */
export async function getParentCompletions(): Promise<Completion[]> {
  const res = await client.get<Completion[]>('/task/completions/')
  return res.data
}

export interface ReviewCompletionInput {
  status: 'confirmed' | 'rejected'
  review_note: string
}

/** POST /task/completions/<id>/review/  */
export async function reviewCompletion(id: string, input: ReviewCompletionInput): Promise<Completion> {
  const res = await client.post<Completion>(`/task/completions/${id}/review/`, input)
  return res.data
}

/** GET /gamification/kids/<kid_id>/stats/ */
export async function getKidStats(kidId: string): Promise<KidStat[]> {
  const res = await client.get<KidStat[]>(`/gamification/kids/${kidId}/stats/`)
  return res.data
}

export interface CategoryBreakdown {
  category: string
  total_points: number
}

export interface DailyTrend {
  date: string        // YYYY-MM-DD
  points: number
}

export interface CompletionRates {
  total: number
  confirmed: number
  rejected: number
  pending: number
  rate: number        // 0-100
}

export interface KidAnalytics {
  category_breakdown: CategoryBreakdown[]
  daily_trend: DailyTrend[]
  completion_rates: CompletionRates | null
}

/** GET /analytics/kids/<kid_id>/dashboard/ */
export async function getKidAnalytics(kidId: string): Promise<KidAnalytics> {
  const res = await client.get<KidAnalytics>(`/analytics/kids/${kidId}/dashboard/`)
  return res.data
}
