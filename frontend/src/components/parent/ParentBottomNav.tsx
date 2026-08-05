import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useParentNav } from '../../hooks/useParentNav'

/**
 * Phone navigation: labelled tabs at thumb height.
 *
 * Desktop keeps the sidebar; this is `lg:hidden` and the sidebar is
 * `hidden lg:flex`, so exactly one of them is ever present.
 */
export default function ParentBottomNav() {
  const { t } = useTranslation()
  const items = useParentNav()

  return (
    <nav
      aria-label={t('a11y.mainNav')}
      // pb from the safe-area inset so the bar clears the iOS home indicator.
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex pb-[env(safe-area-inset-bottom)]"
    >
      {items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end
          aria-label={item.badge > 0 ? `${t(item.labelKey)} (${item.badge})` : undefined}
          className={({ isActive }) =>
            `relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 focus-ring transition-colors ${
              isActive ? 'text-primary-700' : 'text-gray-500'
            }`
          }
        >
          <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
          <span className="font-body text-[11px] font-semibold leading-tight truncate max-w-full px-1">
            {t(item.labelKey)}
          </span>
          {item.badge > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1 end-1/4 min-w-4 h-4 px-1 rounded-full bg-primary-600 text-white font-body font-bold text-[10px] flex items-center justify-center"
            >
              {item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
