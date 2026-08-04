import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotifications, markNotificationRead, type Notification } from '../api/notifications'
import useAuthStore from '../store/authStore'
import { closeSocket } from '../utils/closeSocket'
import { WS_BASE } from '../utils/wsBase'

const KEY = ['notifications'] as const

export function useNotifications() {
  const token = useAuthStore(s => s.token)
  const queryClient = useQueryClient()
  // The message of the most recent socket push, for a live region. Set from
  // the socket handler rather than derived in render: only genuinely new
  // arrivals should be announced, and the initial backlog should not be.
  const [pushedMessage, setPushedMessage] = useState('')

  // The server returns every notification (read + unread) newest-first, so its
  // response is the complete list — no client-side merge or persistence needed.
  const notificationsQuery = useQuery({
    queryKey: KEY,
    queryFn: getNotifications,
    enabled: !!token,
  })
  const { data: notifications = [] } = notificationsQuery

  // Live updates over WebSocket, prepended straight into the query cache.
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
          const data = JSON.parse(e.data) as Partial<Notification> & { type?: string }
          // Heartbeat: server pings every ~30s to detect dead connections.
          // Reply so it knows we're alive, and never render it as a notification.
          if (data.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }))
            return
          }
          // Only real notifications (which always have an id) enter the list —
          // guards against ping and any other future control frame.
          if (!data.id) return
          const notification = data as Notification
          queryClient.setQueryData<Notification[]>(KEY, (prev = []) => {
            const next = [notification, ...prev.filter(n => n.id !== notification.id)]
            // The server replays unread notifications unordered on connect, so
            // keep the list newest-first regardless of arrival order.
            return next.sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          })
          if (notification.notification_type === 'task_confirmed' ||
              notification.notification_type === 'task_rejected') {
            queryClient.invalidateQueries({ queryKey: ['completions'] })
          }
          // A friend request arrives over this socket and nowhere else — the
          // presence socket only carries friend_online/friend_offline. Without
          // this the bell would ping while the sidebar badge and the friends
          // page kept showing the old count until something happened to
          // refetch them. social-service does send this: it posts to
          // notification-service's internal notify endpoint when a request is
          // created, and `friend_request` is an accepted type there.
          if (notification.notification_type === 'friend_request') {
            queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
          }
          setPushedMessage(notification.message)
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
      closeSocket(socket)
    }
  }, [token, queryClient])

  // Optimistic mark-as-read with rollback on failure.
  const { mutate: markRead } = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: KEY })
      const previous = queryClient.getQueryData<Notification[]>(KEY)
      queryClient.setQueryData<Notification[]>(KEY, (prev = []) =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous)
    },
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return {
    notifications,
    unreadCount,
    markRead,
    // Without this the list falls back to [] and the panel says "no
    // notifications" — the same empty-vs-error confusion LoadError fixed on
    // every other surface.
    pushedMessage,
    isError: notificationsQuery.isError,
    refetch: () => { notificationsQuery.refetch() },
  }
}
