import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useKidNav } from '../../hooks/useKidNav'

/**
 * Phone navigation: five labelled tabs at thumb height.
 *
 * Replaces a permanent 56px icon rail that took 15% of a 375px screen on every
 * page and — having no room for text — hid its labels below `lg`, leaving a
 * child to navigate by guessing what each emoji meant. A bottom bar gives the
 * width back and brings the words with it.
 *
 * Desktop keeps the sidebar; this is `lg:hidden` and the sidebar is
 * `hidden lg:flex`, so exactly one of them is ever present.
 */
export default function KidBottomNav() {
  const { t } = useTranslation()
  const items = useKidNav()

  return (
    <nav
      aria-label={t('a11y.mainNav')}
      // pb from the safe-area inset so the bar clears the iOS home indicator
      // rather than sitting under it.
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex pb-[env(safe-area-inset-bottom)]"
    >
      {items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/dashboard'}
          aria-label={item.badge > 0 ? `${t(item.labelKey)} (${item.badge})` : undefined}
          className={({ isActive }) =>
            `relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 focus-ring transition-colors ${
              isActive ? 'text-primary-700' : 'text-gray-500'
            }`
          }
        >
          <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
          {/* The labels the icon rail could not fit. Truncated rather than
              wrapped so a long word in Russian or Arabic cannot make one tab
              taller than its neighbours. */}
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
