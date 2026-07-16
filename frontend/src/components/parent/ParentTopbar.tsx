import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../../store/authStore'
import { useDismissable } from '../../hooks/useDismissable'
import LanguageSwitcher from '../LanguageSwitcher'

export default function ParentTopbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser, logout } = useAuthStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => { setMenuOpen(false); triggerRef.current?.focus() }, [])
  useDismissable(menuRef, closeMenu, { enabled: menuOpen })

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
        <LanguageSwitcher />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={currentUser?.username ?? 'Menu'}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-heading font-bold text-primary-700 hover:bg-primary-200 focus-ring transition-colors"
          >
            {currentUser?.username?.[0]?.toUpperCase() ?? '?'}
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
