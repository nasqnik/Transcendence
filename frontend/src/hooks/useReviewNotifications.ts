import { useEffect, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getNotifications, type Notification } from '../api/notifications'
import useAuthStore from '../store/authStore'

export const NOTIFICATIONS_KEY = ['notifications'] as const

/**
 * A parent's verdict on a task the kid submitted — the only thing the tasks
 * badge counts. `task_submitted` is the parent's copy of the kid's own action,
 * and `level_up` / `friend_request` belong to other surfaces.
 */
const REVIEW_TYPES: Notification['notification_type'][] = ['task_confirmed', 'task_rejected']

// ─── "Seen on the tasks page" marker ─────────────────────────────────────────

/**
 * The badge tracks whether the kid has *visited the tasks page* since the last
 * verdict — deliberately not the notification's `is_read`, which belongs to the
 * bell. Reading a verdict in the bell leaves the tasks badge up, and visiting
 * the tasks page leaves the bell unread; the two are separate surfaces
 * answering separate questions.
 *
 * Only a timestamp is stored, never notification content: the server remains
 * the sole owner of the list itself. Scoped per user so a second account on a
 * shared browser does not inherit the first one's marker.
 */
const STORAGE_PREFIX = 'kiddopath:tasksVerdictsSeenAt:'

const listeners = new Set<() => void>()
// useSyncExternalStore requires a snapshot that is stable between changes, so
// the value is cached rather than re-read from storage on every render.
const cache = new Map<string, string>()

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function readSeenAt(userId: string): string {
  const cached = cache.get(userId)
  if (cached !== undefined) return cached
  let stored = ''
  try {
    stored = localStorage.getItem(storageKey(userId)) ?? ''
  } catch {
    // Private browsing can throw on access; an empty marker just means every
    // verdict counts as unseen, which is the safe direction to fail.
  }
  cache.set(userId, stored)
  return stored
}

/** Records that the kid has just looked at the tasks page. */
export function markTasksVerdictsSeen(userId: string) {
  const now = new Date().toISOString()
  if (cache.get(userId) === now) return
  cache.set(userId, now)
  try {
    localStorage.setItem(storageKey(userId), now)
  } catch {
    // Non-fatal: the marker then lasts only for this page's lifetime.
  }
  listeners.forEach(notify => notify())
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => { listeners.delete(onChange) }
}

/** Test seam: drops the in-memory cache so cases start from a clean marker. */
export function resetTasksVerdictsSeenForTests() {
  cache.clear()
  listeners.clear()
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Verdicts that arrived since the kid last opened the tasks page.
 *
 * Reads the shared query cache rather than calling `useNotifications`, which
 * opens a WebSocket per call — this runs in the sidebar and the bottom bar at
 * once, so using that hook here would open a socket per navigation surface.
 */
export function useUnseenVerdicts(): Notification[] {
  const token = useAuthStore(s => s.token)
  const userId = useAuthStore(s => s.currentUser?.id) ?? ''
  const seenAt = useSyncExternalStore(
    subscribe,
    () => readSeenAt(userId),
  )

  const { data: notifications = [] } = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: getNotifications,
    enabled: !!token,
  })

  return notifications.filter(n =>
    REVIEW_TYPES.includes(n.notification_type) &&
    (!seenAt || n.created_at > seenAt)
  )
}

/**
 * Clears the tasks badge while the kid is on the tasks page.
 *
 * Re-stamps whenever a verdict lands, so one arriving while they are already
 * looking at the page does not raise a badge for something in front of them.
 */
export function useMarkTasksVerdictsSeen() {
  const userId = useAuthStore(s => s.currentUser?.id) ?? ''
  const unseen = useUnseenVerdicts()
  const unseenCount = unseen.length

  useEffect(() => {
    if (!userId) return
    markTasksVerdictsSeen(userId)
  }, [userId, unseenCount])
}
