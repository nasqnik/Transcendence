import { useQuery } from '@tanstack/react-query'
import { type TaskCategory } from '../constants/categories'
import { getTasks, getCompletions, type Completion } from '../api/tasks'
import {
  getGamificationStats,
  getGamificationProfile,
} from '../api/gamification'

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
  isLoading: boolean
}

const CATEGORIES: TaskCategory[] = ['health', 'learning', 'responsibility', 'creativity']
const MAIN_XP_PER_LEVEL = 200  // must match backend MAIN_XP_PER_LEVEL setting

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyStats(): Record<TaskCategory, { level: number; xp_percent: number }> {
  return Object.fromEntries(
    CATEGORIES.map(cat => [cat, { level: 0, xp_percent: 0 }])
  ) as Record<TaskCategory, { level: number; xp_percent: number }>
}

function emptyPending(): Record<TaskCategory, number> {
  return Object.fromEntries(CATEGORIES.map(cat => [cat, 0])) as Record<TaskCategory, number>
}

/** Format a Date as YYYY-MM-DD in the browser's local timezone. */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeStreak(completions: Completion[]): number {
  // Convert server UTC timestamps to local-timezone date strings so the streak
  // reflects the kid's calendar day, not the UTC day.
  // (e.g. a task done at 8 pm UTC-5 is stored as the next UTC day on the server,
  //  but should count as today for the kid.)
  const confirmedDates = new Set(
    completions
      .filter(c => c.status === 'confirmed')
      .map(c => localDateStr(new Date(c.completed_at)))
  )
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
  const { data: rawStats   = [], isLoading: statsLoading } = useQuery({ queryKey: ['gamificationStats'],   queryFn: getGamificationStats })
  const { data: profile        , isLoading: profileLoading } = useQuery({ queryKey: ['gamificationProfile'], queryFn: getGamificationProfile })
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

  return { stats, pendingXpByCategory, level, progress, xpCurrent, xpMax, coins, streak, isLoading: statsLoading || profileLoading }
}
