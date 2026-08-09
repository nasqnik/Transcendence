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

/**
 * Coins awarded each time a *category* levels up.
 *
 * This used to be `COINS_PER_MAIN_LEVEL`. The server moved the award into the
 * category loop, so coins now arrive on every colour level-up rather than once
 * per main level, and the main-level loop pays nothing. A kid earns them twice
 * as often as the old rule implied — and the help panel was still describing
 * the old one.
 */
export const COINS_PER_STAT_LEVEL = 50
