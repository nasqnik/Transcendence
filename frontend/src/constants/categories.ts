export type TaskCategory = 'health' | 'learning' | 'responsibility' | 'creativity'

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
export const CATEGORY_STYLE: Record<TaskCategory, { bg: string; text: string; bar: string; icon: string }> = {
  health:         { bg: 'bg-teal-50',    text: 'text-teal-700',    bar: 'bg-teal-500',    icon: '❤️' },
  learning:       { bg: 'bg-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500',    icon: '📘' },
  responsibility: { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500',   icon: '🏆' },
  creativity:     { bg: 'bg-primary-50', text: 'text-primary-700', bar: 'bg-primary-500', icon: '🎨' },
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
