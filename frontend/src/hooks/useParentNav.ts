import { useQuery } from '@tanstack/react-query'
import { getParentCompletions } from '../api/parent'

export interface ParentNavItem {
  icon: string
  labelKey: string
  path: string
  badge: number
}

/**
 * The parent's three destinations, with their badge counts.
 *
 * Shared by the desktop sidebar and the mobile bottom bar so a destination is
 * defined once. The completions query is already in the cache from the pages
 * themselves, so this costs no extra requests.
 */
export function useParentNav(): ParentNavItem[] {
  const { data: completions = [] } = useQuery({
    queryKey: ['parentCompletions'],
    queryFn: getParentCompletions,
  })
  const pendingCount = completions.filter(c => c.status === 'pending').length

  return [
    { icon: '📊', labelKey: 'parentDash.overview',  path: '/parent/dashboard', badge: 0 },
    { icon: '✅', labelKey: 'parentDash.approvals',  path: '/parent/approvals', badge: pendingCount },
    { icon: '⚙️', labelKey: 'parentDash.settings',   path: '/parent/settings',  badge: 0 },
  ]
}
