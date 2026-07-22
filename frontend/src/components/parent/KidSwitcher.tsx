import { useTranslation } from 'react-i18next'
import type { KidRef } from '../../api/parent'

interface KidSwitcherProps {
  kids: KidRef[]
  selectedId: string
  onSelect: (id: string) => void
  /** Display label for a kid (name, or "Child N" fallback). */
  labelFor: (kid: KidRef, index: number) => string
}

export default function KidSwitcher({ kids, selectedId, onSelect, labelFor }: KidSwitcherProps) {
  const { t } = useTranslation()

  return (
    <div role="group" aria-label={t('parentDash.selectKid')} className="flex flex-wrap items-start gap-2">
      {kids.map((kid, i) => {
        const active = kid.id === selectedId
        const label = labelFor(kid, i)
        return (
          <button
            key={kid.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(kid.id)}
            className="group flex flex-col items-center gap-1.5 rounded-2xl px-2 py-1.5 focus-ring"
          >
            {/* Avatar — placeholder initial for now; swap for the kid's real
                avatar once the backend exposes it on the token. */}
            <span
              aria-hidden="true"
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-heading font-bold transition-all ${
                active
                  ? 'bg-primary-600 text-white ring-2 ring-primary-600 ring-offset-2 ring-offset-primary-50'
                  : 'bg-primary-100 text-primary-700 group-hover:bg-primary-200'
              }`}
            >
              {label.charAt(0).toUpperCase()}
            </span>
            <span
              className={`font-body text-xs max-w-[5rem] truncate ${
                active ? 'font-bold text-primary-700' : 'font-semibold text-gray-500'
              }`}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
