import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotifications, markNotificationRead, type Notification } from '../api/notifications'
import useAuthStore from '../store/authStore'

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'https://localhost/api')
  .replace('https://', 'wss://')
  .replace('/api', '')

const KEY = ['notifications'] as const

export function useNotifications() {
  const token = useAuthStore(s => s.token)
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const fresh = await getNotifications()
      // Server only returns unread. Merge with the in-memory cache first
      // (has optimistic read-state), then fall back to sessionStorage so
      // read notifications survive a hard page refresh.
      const stored: Notification[] = JSON.parse(sessionStorage.getItem('notifications') ?? '[]')
      const prev = queryClient.getQueryData<Notification[]>(KEY) ?? stored
      const ids = new Set(fresh.map(n => n.id))
      const merged = [...fresh, ...prev.filter(n => !ids.has(n.id))]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      sessionStorage.setItem('notifications', JSON.stringify(merged))
      return merged
    },
    enabled: !!token,
  })

  // Live updates over WebSocket, written straight into the query cache.
  useEffect(() => {
    if (!token) return
    let unmounted = false
    let ws: WebSocket | null = null
    let reconnectDelay = 1000
    let timer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (unmounted) return
      const socket = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`)
      ws = socket

      socket.onopen = () => { reconnectDelay = 1000 }

      socket.onmessage = (e) => {
        try {
          const notification = JSON.parse(e.data) as Notification
          queryClient.setQueryData<Notification[]>(KEY, (prev = []) => {
            const updated = [notification, ...prev.filter(n => n.id !== notification.id)]
            sessionStorage.setItem('notifications', JSON.stringify(updated))
            return updated
          })
          if (notification.notification_type === 'task_confirmed' ||
              notification.notification_type === 'task_rejected') {
            queryClient.invalidateQueries({ queryKey: ['completions'] })
          }
        } catch { /* ignore malformed message */ }
      }

      socket.onclose = () => {
        if (unmounted) return
        timer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000)
          connect()
        }, reconnectDelay)
      }

      socket.onerror = () => socket.close()
    }

    connect()

    return () => {
      unmounted = true
      if (timer) clearTimeout(timer)
      const socket = ws
      ws = null
      if (!socket) return
      // Detach handlers so teardown can't trigger a reconnect or a cache write.
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null
      // Closing a still-CONNECTING socket logs a noisy "closed before the
      // connection is established" warning (happens on every StrictMode remount
      // in dev), so defer the close until it has actually opened.
      if (socket.readyState === WebSocket.CONNECTING) socket.onopen = () => socket.close()
      else socket.close()
    }
  }, [token, queryClient])

  // Optimistic mark-as-read with rollback on failure.
  const { mutate: markRead } = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: KEY })
      const previous = queryClient.getQueryData<Notification[]>(KEY)
      const updated = (previous ?? []).map(n => n.id === id ? { ...n, is_read: true } : n)
      queryClient.setQueryData<Notification[]>(KEY, updated)
      sessionStorage.setItem('notifications', JSON.stringify(updated))
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(KEY, ctx.previous)
        sessionStorage.setItem('notifications', JSON.stringify(ctx.previous))
      }
    },
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return { notifications, unreadCount, markRead }
}
