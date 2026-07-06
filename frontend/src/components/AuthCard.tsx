import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

interface AuthCardProps {
  /** id for the <h1>; the surrounding <main> is labelled by it. */
  headingId: string
  title: string
  /** Optional emoji shown above the title (decorative, aria-hidden). */
  icon?: string
  /** sr-only live-region text announced above the card (status screens). */
  statusMessage?: string
  /** Classes for the white card body wrapper. */
  bodyClassName?: string
  children: ReactNode
}

const DEFAULT_BODY = 'px-6 py-6 flex flex-col gap-5'

/**
 * Shared auth-screen shell: centered page, white card with a gradient header
 * (app name + optional icon + title), and the language switcher below. Used by
 * the login/signup forms and by AuthMessageLayout's status/message screens.
 */
export default function AuthCard({
  headingId,
  title,
  icon,
  statusMessage,
  bodyClassName = DEFAULT_BODY,
  children,
}: AuthCardProps) {
  const { t } = useTranslation()

  return (
    <main
      aria-labelledby={headingId}
      className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-4 py-8 gap-4"
    >
      {statusMessage && (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>
      )}

      <div className="w-full max-w-sm flex flex-col gap-3">
        <div className="bg-white rounded-2xl overflow-hidden">

          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-primary-600 to-primary-500 px-6 py-5 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" aria-hidden="true" />
            <div className="absolute -bottom-5 left-1/3 w-16 h-16 rounded-full bg-white/5 pointer-events-none" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-base" aria-hidden="true">⭐</span>
                <span className="font-heading font-bold text-white/90 text-sm">{t('app.name')}</span>
              </div>
              {icon && <div className="text-4xl mb-2" aria-hidden="true">{icon}</div>}
              <h1
                id={headingId}
                tabIndex={-1}
                className="font-heading text-2xl font-bold text-white outline-none"
              >
                {title}
              </h1>
            </div>
          </div>

          {/* Body */}
          <div className={bodyClassName}>
            {children}
          </div>
        </div>

        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </main>
  )
}
