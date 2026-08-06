import client from './client'
import { type StatCategory } from '../constants/categories'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GamificationStat {
  category: StatCategory
  /** Levels completed in this category */
  level: number
  /** XP within current level (0 – 99) */
  xp_percent: number
}

export interface GamificationProfile {
  /** Kid's overall main level */
  main_level: number
  /** XP within current main level (0 – 199) */
  overall_xp: number
  /** Coins earned */
  coins: number
}

/** One category that gained a level as part of a single award. */
export interface StatLevelUp {
  category: StatCategory
  level: number
}

/**
 * One coin award, ready to celebrate.
 *
 * `coins_awarded` and `stat_level_ups` are the delta to show; the rest are the
 * totals afterwards. Coins are granted at the exact moment a category bar
 * fills, so an award always carries at least one level-up — they are the same
 * event, not two.
 */
export interface RewardSummary {
  completion_id: string
  coins_awarded: number
  stat_level_ups: StatLevelUp[]
  coins_total: number
  overall_xp: number
  main_level: number
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getGamificationStats(): Promise<GamificationStat[]> {
  const res = await client.get('/gamification/stats/')
  return res.data
}

export async function getGamificationProfile(): Promise<GamificationProfile> {
  const res = await client.get('/gamification/profile/')
  return res.data
}

/**
 * Awards the kid has not been shown yet, oldest first.
 *
 * Coins are often earned while the kid isn't looking — a parent may confirm a
 * task hours later, and that response goes to the parent. This feed is what
 * makes those replayable on next open instead of the balance silently changing.
 */
export async function getPendingRewards(): Promise<RewardSummary[]> {
  const res = await client.get<RewardSummary[]>('/gamification/rewards/pending/')
  return res.data
}

/** Acknowledge shown awards so they stop coming back. Omit ids to clear all. */
export async function markRewardsSeen(completionIds?: string[]): Promise<void> {
  await client.post('/gamification/rewards/seen/',
    completionIds ? { completion_ids: completionIds } : {})
}
