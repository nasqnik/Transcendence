import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../hooks/useNotifications'
import { useDismissable } from '../hooks/useDismissable'

const TYPE_ICON: Record<string, string> = {
  task_confirmed: '✅',
  task_rejected:  '❌',
  task_submitted: '📋',
  level_up:       '⭐',
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
  const { notifications, unreadCount, markRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef   = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => { setOpen(false); triggerRef.current?.focus() }, [])
  useDismissable(containerRef, close, { enabled: open })

  return (
    <div className="relative" ref={containerRef}>

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
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 focus-ring transition-colors text-gray-500 hover:text-gray-700"
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
          className="absolute end-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-heading font-bold text-gray-900 text-sm">{t('notifications.title')}</h2>
            {unreadCount > 0 && (
              <span className="font-body text-xs text-primary-600 font-semibold">
                {t('notifications.newCount', { count: unreadCount })}
              </span>
            )}
          </div>

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
                    onClick={() => { if (!n.is_read) markRead(n.id) }}
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
        </div>
      )}

    </div>
  )
}
