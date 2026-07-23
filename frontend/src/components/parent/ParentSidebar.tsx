import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getParentCompletions } from '../../api/parent'

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParentSidebar() {
  const { t } = useTranslation()

  const { data: completions = [] } = useQuery({
    queryKey: ['parentCompletions'],
    queryFn: getParentCompletions,
  })
  const pendingCount = completions.filter(c => c.status === 'pending').length

  const NAV_ITEMS = [
    { icon: '📊', labelKey: 'parentDash.overview',  path: '/parent/dashboard', badge: 0 },
    { icon: '✅', labelKey: 'parentDash.approvals',  path: '/parent/approvals', badge: pendingCount },
    { icon: '⚙️', labelKey: 'parentDash.settings',   path: '/parent/settings',  badge: 0 },
  ] as const

  return (
    <aside className="w-14 lg:w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">

      {/* Logo */}
      <div className="p-3 lg:p-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl shrink-0" aria-hidden="true">⭐</span>
          <div className="hidden lg:block">
            <div className="font-heading font-bold text-primary-700 text-lg leading-tight">
              {t('app.name')}
            </div>
            <div className="font-body text-xs text-gray-400">
              {t('parentDash.title')}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label={t('a11y.mainNav')} className="flex-1 px-2 lg:px-3 py-2 flex flex-col gap-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            aria-label={
              item.badge > 0
                ? `${t(item.labelKey)} (${item.badge})`
                : t(item.labelKey)
            }
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl font-body font-semibold text-sm transition-colors focus-ring ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="hidden lg:inline flex-1">{t(item.labelKey)}</span>
            {item.badge > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1 end-1 lg:static lg:ms-auto min-w-5 h-5 px-1 rounded-full bg-primary-600 text-white font-body font-bold text-[10px] flex items-center justify-center"
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

    </aside>
  )
}
