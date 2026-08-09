import { useQuery } from '@tanstack/react-query'
import { getFriendRequests } from '../api/social'
import { useUnseenVerdicts } from './useReviewNotifications'

export interface KidNavItem {
  icon: string
  labelKey: string
  path: string
  badge: number
}

/**
 * The kid's five destinations, with their badge counts.
 *
 * Shared by the desktop sidebar and the mobile bottom bar so a new destination
 * is added once. Every query here is already in the cache from the pages
 * themselves, so this costs no extra requests.
 */
export function useKidNav(): KidNavItem[] {
  // A `friend_request` notification does reach the bell now, but this badge
  // is what marks the Friends page itself as having something waiting.
  const { data: requests = [] } = useQuery({ queryKey: ['friendRequests'], queryFn: getFriendRequests })

  // Approvals and rejections the kid has not looked at yet.
  //
  // This used to count tasks due today plus overdue ones, which meant adding a
  // task raised the badge — the kid was being alerted to their own action, and
  // the number only fell once the work was done. A badge should mark something
  // new to look at, so it now tracks the parent's verdicts and clears on the
  // tasks page, where those verdicts are visible. Tracked separately from the
  // bell's read state, so clearing one does not clear the other.
  const verdicts = useUnseenVerdicts()

  return [
    { icon: '🏠', labelKey: 'kidDash.nav.home',     path: '/dashboard', badge: 0 },
    { icon: '📋', labelKey: 'tasks.allTasks',       path: '/tasks',     badge: verdicts.length },
    { icon: '🎨', labelKey: 'kidDash.nav.avatar',   path: '/avatar',    badge: 0 },
    { icon: '👥', labelKey: 'friends.title',        path: '/friends',   badge: requests.length },
    { icon: '⚙️', labelKey: 'kidDash.nav.settings', path: '/settings',  badge: 0 },
  ]
}
