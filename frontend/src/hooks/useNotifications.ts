import { useState, useEffect, useCallback, useRef } from 'react'
import { getNotifications, markNotificationRead, type Notification } from '../api/notifications'
import useAuthStore from '../store/authStore'

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'https://localhost/api')
  .replace('https://', 'wss://')
  .replace('/api', '')

export function useNotifications() {
  const token = useAuthStore(s => s.token)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // Initial fetch
  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .catch(() => {})
  }, [])

  // WebSocket for real-time push
  useEffect(() => {
    if (!token) return

    const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const notification = JSON.parse(e.data) as Notification
        setNotifications(prev => [notification, ...prev])
      } catch { /* ignore malformed message */ }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [token])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    try {
      await markNotificationRead(id)
    } catch {
      // revert on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n))
    }
  }, [])

  return { notifications, unreadCount, markRead }
}
