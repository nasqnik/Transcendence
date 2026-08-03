import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../hooks/useNotifications'
import { useDismissable } from '../hooks/useDismissable'
import LoadError from './LoadError'

/**
 * Where each notification takes you. Marking it read was the only thing a tap
 * did, so the kid had to work out for themselves which page it referred to.
 */
const TYPE_PATH: Record<string, string> = {
  task_confirmed: '/tasks',
  task_rejected:  '/tasks',
  task_submitted: '/tasks',
  level_up:       '/dashboard',
  friend_request: '/friends',
}

const TYPE_ICON: Record<string, string> = {
  task_confirmed: '✅',
  task_rejected:  '❌',
  task_submitted: '📋',
  level_up:       '⭐',
  // Matches the Friends nav icon, so the notification and the place it sends
  // you look like the same thing.
  friend_request: '👥',
}

function formatRelative(dateStr: string, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (minutes < 1)   return rtf.format(0, 'minute')
  if (minutes < 60)  return rtf.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return rtf.format(-hours, 'hour')
  return rtf.format(-Math.floor(hours / 24), 'day')
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, isError, refetch, pushedMessage } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef   = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => { setOpen(false); triggerRef.current?.focus() }, [])

  // Focus the panel heading on open so the keyboard follows the panel, the way
  // the user menu already does. React only honours `autoFocus` on form
  // controls, so a heading has to be focused explicitly.
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (open) headingRef.current?.focus() }, [open])

  useDismissable(containerRef, close, { enabled: open , trapFocus: true })

  return (
    <div className="relative" ref={containerRef}>

      {/* Notifications arrive over a socket, so nothing on the page changes in
          a way a screen reader would notice — the badge just ticks up silently. */}
      <p role="status" aria-live="polite" className="sr-only">{pushedMessage}</p>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={
          unreadCount > 0
            ? `${t('notifications.title')}, ${t('notifications.newCount', { count: unreadCount })}`
            : t('notifications.title')
        }
        aria-expanded={open}
        aria-controls="notification-panel"
        className="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 focus-ring transition-colors text-gray-500 hover:text-gray-700"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 end-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-panel"
          role="region"
          aria-label={t('notifications.title')}
          // w-80 alone overflowed a 375px screen; cap it to the viewport.
          className="absolute end-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            {/* tabIndex -1: focusable programmatically, but not a tab stop
                once focus has moved on. */}
            <h2 ref={headingRef} tabIndex={-1} className="font-heading font-bold text-gray-900 text-sm focus-ring rounded">
              {t('notifications.title')}
            </h2>
            {unreadCount > 0 && (
              <span className="font-body text-xs text-primary-600 font-semibold">
                {t('notifications.newCount', { count: unreadCount })}
              </span>
            )}
          </div>

          {isError ? (
            <LoadError variant="inline" onRetry={refetch} />
          ) : (
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="font-body text-sm text-gray-400 text-center py-10">
                {t('notifications.empty')}
              </li>
            ) : (
              notifications.map(n => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) markRead(n.id)
                      const path = TYPE_PATH[n.notification_type]
                      if (path) { close(); navigate(path) }
                    }}
                    className={`w-full text-start px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-primary-50/60' : ''}`}
                  >
                    <span className="text-base shrink-0 mt-0.5" aria-hidden="true">
                      {TYPE_ICON[n.notification_type] ?? '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-body text-sm leading-snug ${n.is_read ? 'text-gray-500' : 'text-gray-900 font-semibold'}`}>
                        {n.message}
                      </p>
                      <p className="font-body text-xs text-gray-400 mt-0.5">
                        {formatRelative(n.created_at, i18n.language)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1.5" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
          )}
        </div>
      )}

    </div>
  )
}
