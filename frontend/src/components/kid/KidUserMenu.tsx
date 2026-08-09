import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getKidAvatar } from '../../api/catalog'
import useAuthStore from '../../store/authStore'
import { useDismissable } from '../../hooks/useDismissable'

export default function KidUserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser, logout } = useAuthStore()
  // Same cached query the dashboard band and the studio use.
  const { data: avatar } = useQuery({ queryKey: ['kidAvatar'], queryFn: getKidAvatar })

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => { setMenuOpen(false); triggerRef.current?.focus() }, [])
  useDismissable(menuRef, closeMenu, { enabled: menuOpen , trapFocus: true })

  return (
    <div className="relative" ref={menuRef}>

      {/* Avatar button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen(v => !v)}
        aria-label={currentUser?.username || t('a11y.userMenu')}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center font-heading font-bold text-primary-700 hover:bg-primary-200 focus-ring transition-colors overflow-hidden"
      >
        {avatar?.avatar_url
          ? <img src={avatar.avatar_url} alt="" className="w-full h-full object-cover" />
          : currentUser?.username?.[0]?.toUpperCase() ?? '?'}
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div role="menu" className="absolute end-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-body font-semibold text-sm text-gray-900">{currentUser?.username}</p>
          </div>
          {/* autoFocus moves here with the menu order: the first item should
              take focus when the menu opens, and logging out is no longer it. */}
          <button
            type="button"
            role="menuitem"
            autoFocus
            onClick={() => { closeMenu(); navigate('/profile') }}
            className="w-full px-4 py-3 flex items-center gap-3 font-body text-sm text-gray-700 hover:bg-gray-50 focus-ring transition-colors text-start"
          >
            <span aria-hidden="true">👤</span>
            {t('kidDash.profile')}
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
  )
}
