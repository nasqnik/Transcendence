import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface LegalLinksProps {
  /** Extra classes appended to the nav (e.g. alignment/spacing per page). */
  className?: string
}

const LINK_CLASS = 'font-body text-xs text-gray-500 hover:text-primary-600 focus-ring rounded-sm'

/** Privacy Policy + Terms of Service footer links, shared across auth screens. */
export default function LegalLinks({ className = '' }: LegalLinksProps) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('a11y.legalNav')} className={`flex gap-4 ${className}`}>
      <Link to="/privacy" className={LINK_CLASS}>{t('legal.privacy')}</Link>
      <Link to="/terms" className={LINK_CLASS}>{t('legal.terms')}</Link>
    </nav>
  )
}
