import { useState, useEffect, useCallback, useRef } from 'react'
import { getNotifications, markNotificationRead, type Notification } from '../api/notifications'
import useAuthStore from '../store/authStore'

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'https://localhost/api')
  .replace('https://', 'wss://')
  .replace('/api', '')

// Module-level cache so read notifications survive hook remounts within the tab
let notificationCache: Notification[] = []

export function useNotifications() {
  const token = useAuthStore(s => s.token)
  const [notifications, setNotifications] = useState<Notification[]>(notificationCache)
  const wsRef            = useRef<WebSocket | null>(null)
  const reconnectDelay   = useRef(1000)
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef     = useRef(false)

  // Initial fetch — merge unread from API with cached read notifications
  useEffect(() => {
    getNotifications()
      .then(fresh => {
        const freshIds = new Set(fresh.map(n => n.id))
        const cached   = notificationCache.filter(n => !freshIds.has(n.id))
        const merged   = [...fresh, ...cached].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        notificationCache = merged
        setNotifications(merged)
      })
      .catch(() => {})
  }, [])

  // WebSocket with reconnect
  useEffect(() => {
    if (!token) return
    unmountedRef.current = false

    function connect() {
      if (unmountedRef.current) return
      const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelay.current = 1000
      }

      ws.onmessage = (e) => {
        try {
          const notification = JSON.parse(e.data) as Notification
          setNotifications(prev => {
            const updated = [notification, ...prev.filter(n => n.id !== notification.id)]
            notificationCache = updated
            return updated
          })
        } catch { /* ignore malformed message */ }
      }

      ws.onclose = () => {
        if (unmountedRef.current) return
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
          connect()
        }, reconnectDelay.current)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [token])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      notificationCache = updated
      return updated
    })
    try {
      await markNotificationRead(id)
    } catch {
      setNotifications(prev => {
        const reverted = prev.map(n => n.id === id ? { ...n, is_read: false } : n)
        notificationCache = reverted
        return reverted
      })
    }
  }, [])

  return { notifications, unreadCount, markRead }
}
