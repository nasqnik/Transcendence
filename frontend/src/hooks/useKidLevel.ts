import { useQuery } from '@tanstack/react-query'
import { type TaskCategory } from '../constants/categories'
import { getTasks, getCompletions, type Completion } from '../api/tasks'
import {
  getGamificationStats,
  getGamificationProfile,
} from '../api/gamification'
import { localDateStr } from '../utils/date'
import { MAIN_XP_PER_LEVEL } from '../constants/xp'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KidLevelData {
  /** Per-category level + XP progress, straight from the backend */
  stats: Record<TaskCategory, { level: number; xp_percent: number }>
  /** XP from pending (unconfirmed) completions, per category */
  pendingXpByCategory: Record<TaskCategory, number>
  /** Kid's overall (main) level */
  level: number
  /** Progress within current main level as 0-100 percentage */
  progress: number
  /** Raw XP earned within the current level (0 to xpMax-1) */
  xpCurrent: number
  /** XP needed to complete one level */
  xpMax: number
  /** Coins earned */
  coins: number
  /** Consecutive days (ending today, local time) with ≥1 confirmed completion */
  streak: number
  /** The last 7 local days, oldest first, for the streak strip */
  week: DayMark[]
  isLoading: boolean
  /** The gamification fetches failed — the numbers below are placeholders, not facts. */
  isError: boolean
  /** Re-runs the failed gamification queries. */
  refetch: () => void
}

export interface DayMark {
  /** Local YYYY-MM-DD */
  date: string
  /** At least one confirmed completion that day */
  done: boolean
  isToday: boolean
}

const CATEGORIES: TaskCategory[] = ['health', 'learning', 'responsibility', 'creativity']
// Must match gamification-service's MAIN_XP_PER_LEVEL. It moved 200 -> 100
// when the reward curve was sped up; while these disagreed the bar read
// "80 / 200" at 40% for a kid who was 80% of the way to the next level.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyStats(): Record<TaskCategory, { level: number; xp_percent: number }> {
  return Object.fromEntries(
    CATEGORIES.map(cat => [cat, { level: 0, xp_percent: 0 }])
  ) as Record<TaskCategory, { level: number; xp_percent: number }>
}

function emptyPending(): Record<TaskCategory, number> {
  return Object.fromEntries(CATEGORIES.map(cat => [cat, 0])) as Record<TaskCategory, number>
}

/**
 * Local-timezone dates that have at least one confirmed completion.
 *
 * Server timestamps are UTC, so they are converted to the kid's calendar day
 * first — a task done at 8 pm UTC-5 is stored as the next UTC day but should
 * still count as today for them.
 */
function confirmedDateSet(completions: Completion[]): Set<string> {
  return new Set(
    completions
      .filter(c => c.status === 'confirmed')
      .map(c => localDateStr(new Date(c.completed_at)))
  )
}

/** The last 7 local days, oldest first. */
function computeWeek(completions: Completion[]): DayMark[] {
  const confirmedDates = confirmedDateSet(completions)
  const today = new Date()
  const week: DayMark[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = localDateStr(d)
    week.push({ date, done: confirmedDates.has(date), isToday: i === 0 })
  }
  return week
}

function computeStreak(completions: Completion[]): number {
  const confirmedDates = confirmedDateSet(completions)
  let streak = 0
  const today = new Date()
  for (let i = 0; ; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (confirmedDates.has(localDateStr(d))) streak++
    else break
  }
  return streak
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKidLevel(): KidLevelData {
  // Gamification service — real server-side XP/level data
  const statsQuery   = useQuery({ queryKey: ['gamificationStats'],   queryFn: getGamificationStats })
  const profileQuery = useQuery({ queryKey: ['gamificationProfile'], queryFn: getGamificationProfile })
  const { data: rawStats = [], isLoading: statsLoading } = statsQuery
  const { data: profile, isLoading: profileLoading } = profileQuery
  // Tasks + completions already cached by TodaysTasks — no extra requests
  const { data: tasks       = [] } = useQuery({ queryKey: ['tasks'],       queryFn: getTasks })
  const { data: completions = [] } = useQuery({ queryKey: ['completions'], queryFn: getCompletions })

  // Build per-category map, defaulting to zeros for categories not yet started
  const stats = emptyStats()
  for (const s of rawStats) {
    if (s.category in stats) {
      stats[s.category as TaskCategory] = { level: s.level, xp_percent: s.xp_percent }
    }
  }

  // Sum XP from pending (awaiting parent review) completions so the UI can
  // show the kid that XP is coming once a parent confirms.
  const pendingXpByCategory = emptyPending()
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  for (const c of completions) {
    if (c.status !== 'pending') continue
    const task = taskMap.get(c.task)
    if (!task) continue
    for (const reward of task.category_rewards) {
      pendingXpByCategory[reward.category as TaskCategory] += reward.points_value
    }
  }

  const level      = profile?.main_level ?? 0
  // overall_xp is 0-(MAIN_XP_PER_LEVEL-1) within the current level
  const xpCurrent = profile?.overall_xp ?? 0
  const xpMax     = MAIN_XP_PER_LEVEL
  const progress  = profile ? Math.round((xpCurrent / xpMax) * 100) : 0
  const coins     = profile?.coins ?? 0
  const streak    = computeStreak(completions)
  const week      = computeWeek(completions)

  return {
    stats, pendingXpByCategory, level, progress, xpCurrent, xpMax, coins, streak, week,
    isLoading: statsLoading || profileLoading,
    // Every number above falls back to 0, so a failed fetch renders as a real
    // Level 0 with no XP. Callers need to be able to tell those apart.
    isError: statsQuery.isError || profileQuery.isError,
    refetch: () => { statsQuery.refetch(); profileQuery.refetch() },
  }
}
