import { type TaskCategory } from '../constants/categories'

const CATEGORIES: TaskCategory[] = ['health', 'learning', 'responsibility', 'creativity']

export interface LevelUp {
  category: TaskCategory
  level: number
}

/**
 * Every category that gained a level between two snapshots.
 *
 * Returns all of them, not the first: one task can credit two categories at
 * once, and stopping at the first meant the kid was congratulated for one and
 * never told about the other.
 */
export function levelUpsBetween(
  prev: Record<TaskCategory, number>,
  current: Record<TaskCategory, number>,
): LevelUp[] {
  return CATEGORIES
    .filter(cat => current[cat] > prev[cat])
    .map(cat => ({ category: cat, level: current[cat] }))
}
