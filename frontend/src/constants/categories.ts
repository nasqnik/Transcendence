export type TaskCategory = 'health' | 'learning' | 'responsibility' | 'creativity'

export type StatCategory = TaskCategory | 'honesty'

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
  review_mode: 'always' | 'never'   // 'optional' was dropped backend-side
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
  category: StatCategory   // includes 'honesty', which gamification awards on parent approval
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
