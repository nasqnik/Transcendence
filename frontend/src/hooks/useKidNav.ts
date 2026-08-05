import { useQuery } from '@tanstack/react-query'
import { getTasks, getCompletions } from '../api/tasks'
import { getFriendRequests } from '../api/social'
import { groupTasks } from '../utils/taskGroups'
import { todayStr } from '../utils/date'

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
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
  const { data: completions = [] } = useQuery({ queryKey: ['completions'], queryFn: getCompletions })
  // social-service sends no notification when a request arrives, so this badge
  // is the only thing that tells a kid someone is waiting on them.
  const { data: requests = [] } = useQuery({ queryKey: ['friendRequests'], queryFn: getFriendRequests })

  // What needs doing now. Upcoming and undated tasks are left out on purpose:
  // they would sit in the badge forever instead of clearing as work gets done.
  const groups = groupTasks(tasks, completions, todayStr())
  const todoCount = groups.overdue.length + groups.today.length

  return [
    { icon: '🏠', labelKey: 'kidDash.nav.home',     path: '/dashboard', badge: 0 },
    { icon: '📋', labelKey: 'tasks.allTasks',       path: '/tasks',     badge: todoCount },
    { icon: '🎨', labelKey: 'kidDash.nav.avatar',   path: '/avatar',    badge: 0 },
    { icon: '👥', labelKey: 'friends.title',        path: '/friends',   badge: requests.length },
    { icon: '⚙️', labelKey: 'kidDash.nav.settings', path: '/settings',  badge: 0 },
  ]
}
