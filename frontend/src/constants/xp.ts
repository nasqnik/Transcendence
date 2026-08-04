/**
 * The XP scales, mirrored from gamification-service's settings.
 *
 * Both live here rather than next to one consumer because the kid's own stats,
 * a friend's card, and the level hook all have to agree with the server — and
 * with each other. When the reward curve moves, this is the only file to edit.
 *
 * `MAIN_XP_PER_LEVEL` moved 200 -> 100 when the curve was sped up; while the
 * frontend still said 200 the bar read "80 / 200" at 40% for a kid who was 80%
 * of the way to the next level.
 *
 * Despite the API field being named `xp_percent`, a category's value is raw XP
 * within the current level — the server caps it at `STAT_XP_PER_LEVEL` and
 * rolls over. It is not a percentage.
 */
export const MAIN_XP_PER_LEVEL = 100
export const STAT_XP_PER_LEVEL = 50

/** Overall XP awarded each time a single category levels up. */
export const OVERALL_XP_PER_STAT_LEVEL = 50

/** Coins awarded each time the main level goes up. */
export const COINS_PER_MAIN_LEVEL = 50

/**
 * Category level-ups needed for one main level — the number a kid actually
 * wants when asking "how far until I can buy something?".
 *
 * Derived rather than written down: with the current curve it is 2, but the
 * moment the server's ratio changes a hardcoded 2 becomes a lie in the one
 * place that exists to explain the rules.
 */
export const STAT_LEVELS_PER_MAIN_LEVEL =
  Math.ceil(MAIN_XP_PER_LEVEL / OVERALL_XP_PER_STAT_LEVEL)
