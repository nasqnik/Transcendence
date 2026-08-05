import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type Friend } from '../api/social'
import useAuthStore from '../store/authStore'
import { closeSocket } from '../utils/closeSocket'
import { WS_BASE } from '../utils/wsBase'

const FRIENDS_KEY = ['friends'] as const

/**
 * The server closes a connection that has been quiet for `PRESENCE_STALE_AFTER`
 * (90s by default) and only refreshes the clock when *we* send something. This
 * is the opposite of the notification socket, where the server pings and we
 * answer — send nothing here and the connection drops every 90 seconds.
 */
const PING_INTERVAL_MS = 30_000

interface PresenceEvent {
  event?: 'friend_online' | 'friend_offline'
  kid_id?: string
  type?: string
}

/**
 * Keeps the online dots on the friends list live.
 *
 * Connecting also marks *you* online for everyone else — the server flips your
 * presence on connect and off on disconnect — so this runs for as long as the
 * friends page is mounted.
 */
export function usePresence(enabled: boolean) {
  const token = useAuthStore(s => s.token)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!token || !enabled) return
    let unmounted = false
    let ws: WebSocket | null = null
    let reconnectDelay = 1000
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null

    function setOnline(kidId: string, isOnline: boolean) {
      queryClient.setQueryData<Friend[]>(FRIENDS_KEY, (prev) =>
        prev?.map(friend =>
          friend.kid_id === kidId ? { ...friend, is_online: isOnline } : friend
        )
      )
    }

    function connect() {
      if (unmounted) return
      const socket = new WebSocket(`${WS_BASE}/ws/presence/?token=${token}`)
      ws = socket

      socket.onopen = () => {
        reconnectDelay = 1000
        pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }))
          }
        }, PING_INTERVAL_MS)
      }

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as PresenceEvent
          if (data.event === 'friend_online' && data.kid_id) setOnline(data.kid_id, true)
          else if (data.event === 'friend_offline' && data.kid_id) setOnline(data.kid_id, false)
          // `pong` and anything else is a control frame — nothing to render.
        } catch { /* ignore malformed message */ }
      }

      socket.onclose = () => {
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
        if (unmounted) return
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
          connect()
        }, reconnectDelay)
      }

      socket.onerror = () => socket.close()
    }

    connect()

    return () => {
      unmounted = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (pingTimer) clearInterval(pingTimer)
      const socket = ws
      ws = null
      closeSocket(socket)
    }
  }, [token, enabled, queryClient])
}
