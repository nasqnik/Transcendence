import type { ReactNode } from 'react'
import AuthCard from './AuthCard'

interface AuthMessageLayoutProps {
  headingId: string
  title: string
  icon?: string
  children?: ReactNode
  /** Announced when the view updates (e.g. loading → success). */
  statusMessage?: string
  /** Error or detail text; rendered with role="alert", not as the page heading. */
  alertMessage?: string
}

/**
 * Status/message screen built on AuthCard: same gradient card shell, with the
 * body centered and an optional role="alert" detail line above the content.
 */
export default function AuthMessageLayout({
  headingId,
  title,
  icon,
  children,
  statusMessage,
  alertMessage,
}: AuthMessageLayoutProps) {
  return (
    <AuthCard
      headingId={headingId}
      title={title}
      icon={icon}
      statusMessage={statusMessage}
      bodyClassName="px-6 py-6 flex flex-col items-center gap-4"
    >
      {alertMessage && (
        <p role="alert" className="font-body text-sm text-danger-700 bg-danger-50 rounded-xl px-4 py-3 w-full text-center">
          {alertMessage}
        </p>
      )}
      {children}
    </AuthCard>
  )
}
