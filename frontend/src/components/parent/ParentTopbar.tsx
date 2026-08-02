import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { useDismissable } from '../../hooks/useDismissable'
import { getParentAvatar } from '../../api/avatar'
import NotificationBell from '../NotificationBell'
import Avatar from './Avatar'

export default function ParentTopbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser, logout } = useAuthStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => { setMenuOpen(false); triggerRef.current?.focus() }, [])
  useDismissable(menuRef, closeMenu, { enabled: menuOpen })

  const { data: avatar } = useQuery({ queryKey: ['parentAvatar'], queryFn: getParentAvatar })

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-heading text-xl sm:text-2xl font-bold text-gray-900 truncate">
          {t('dashboard.greeting', { name: currentUser?.username })}{' '}
          <span aria-hidden="true">👋</span>
        </p>
        <p className="hidden sm:block font-body text-sm text-gray-400">{t('parentDash.monitorHint')}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <NotificationBell />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={currentUser?.username ?? t('a11y.userMenu')}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="rounded-full focus-ring hover:opacity-90 transition-opacity"
          >
            <Avatar src={avatar?.profile_picture} name={currentUser?.username} className="w-10 h-10 rounded-full" textClassName="text-base" />
          </button>

          {menuOpen && (
            <div role="menu" className="absolute end-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-body font-semibold text-sm text-gray-900 truncate">{currentUser?.username}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                autoFocus
                onClick={() => { closeMenu(); navigate('/parent/profile') }}
                className="w-full px-4 py-3 flex items-center gap-3 font-body text-sm text-gray-700 hover:bg-gray-50 focus-ring transition-colors text-start"
              >
                <span aria-hidden="true">👤</span>
                {t('parentDash.profile')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { closeMenu(); logout(); navigate('/') }}
                className="w-full px-4 py-3 flex items-center gap-3 font-body text-sm text-danger-700 hover:bg-danger-50 focus-ring transition-colors text-start"
              >
                <span aria-hidden="true">🚪</span>
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
