/**
 * A category a task can be worth.
 *
 * Deliberately excludes `honesty`: task-service never puts it on a task and the
 * AI is instructed never to score it, so it must not be offerable in a task
 * form or a visibility toggle — there is no `show_honesty` setting either.
 */
export type TaskCategory = 'health' | 'learning' | 'responsibility' | 'creativity'

/**
 * A category a kid can hold a level in.
 *
 * Honesty is awarded by task-service when a parent *confirms* a pending
 * completion, worth the sum of that task's category points. Auto-confirmed
 * tasks earn none. So it is real progress a kid sees and earns coins from,
 * without ever appearing on a task — which is why it is a separate type rather
 * than a fifth `TaskCategory`.
 */
export type StatCategory = TaskCategory | 'honesty'

/** The four a task can carry, in display order. */
export const TASK_CATEGORIES: TaskCategory[] =
  ['health', 'learning', 'responsibility', 'creativity']

/** All five a kid can level up, honesty last since it is earned differently. */
export const STAT_CATEGORIES: StatCategory[] = [...TASK_CATEGORIES, 'honesty']

export interface CategoryReward {
  category: TaskCategory
  points_value: number
}

export interface Task {
  id: string
  kid_id: string
  title: string
  description: string
  xp_reward: number
  ai_summary: string
  ai_evaluated: boolean
  due_date: string | null
  is_active: boolean
  created_at: string
  category_rewards: CategoryReward[]
  review_mode: 'always' | 'never' | 'optional'
}

export interface Completion {
  id: string
  task: string              // task id
  task_title?: string       
  task_description?: string 
  task_due_date?: string | null
  kid_id: string
  status: 'pending' | 'confirmed' | 'rejected'
  completed_at: string
  reviewed_at: string | null
  review_note: string
}

// `text` uses the darker `-700` shade (not `-500`) — `-500` fails WCAG AA's
// 4.5:1 text contrast minimum against both white and these categories' own
// `-50` tint backgrounds. `bar`/`bg` stay at `-500`/`-50` since neither ever
// carries text (progress-bar fills and badge tints are held to the looser
// 3:1 non-text contrast rule, which `-500` already clears).
// `solid` is the fill to use behind white text. The `bar` shades are -500 and
// exist for progress fills, which are held to the looser 3:1 non-text rule;
// white on them measures 2.17-4.23:1, all under the 4.5 AA text minimum
// (amber is the worst). The -700 shades run 6.70-10.01:1.
// Honesty uses rose, the one clear hue left beside teal, blue, amber and
// purple: indigo passes contrast but reads as a shade of the blue and purple
// already in play, and cyan's -500 measures 2.43:1 against white, under the
// 3:1 non-text floor. Measured 6.29:1 (text on white), 5.72:1 (text on tint),
// 6.29:1 (white on solid), 3.67:1 (bar on white).
export const CATEGORY_STYLE: Record<StatCategory, { bg: string; text: string; bar: string; solid: string; icon: string }> = {
  health:         { bg: 'bg-teal-50',    text: 'text-teal-700',    bar: 'bg-teal-500',    solid: 'bg-teal-700',    icon: '❤️' },
  learning:       { bg: 'bg-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500',    solid: 'bg-blue-700',    icon: '📘' },
  responsibility: { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500',   solid: 'bg-amber-700',   icon: '🏆' },
  creativity:     { bg: 'bg-primary-50', text: 'text-primary-700', bar: 'bg-primary-500', solid: 'bg-primary-700', icon: '🎨' },
  honesty:        { bg: 'bg-rose-50',    text: 'text-rose-700',    bar: 'bg-rose-500',    solid: 'bg-rose-700',    icon: '🛡️' },
}

/** Returns the category with the highest points_value, used as the display category. */
export function primaryCategory(rewards: CategoryReward[]): TaskCategory {
  if (!rewards.length) return 'learning'
  return [...rewards].sort((a, b) => b.points_value - a.points_value)[0].category
}

export interface KidStat {
  id: string
  kid_id: string
  category: TaskCategory
  level: number
  xp_percent: number
}

export interface KidProfile {
  id: string
  kid_id: string
  main_level: number
  overall_xp: number
  coins: number
}
