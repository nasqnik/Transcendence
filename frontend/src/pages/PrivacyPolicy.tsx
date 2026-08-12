import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../hooks/usePageTitle'
import { CONTACT_EMAIL } from '../constants/contact'
import { LegalSection, type LegalSectionData } from '../components/LegalSection'

interface ContactSectionData extends LegalSectionData {
  orgLabel: string
  emailLabel: string
  outro?: Array<{ type: 'p'; text: string }>
}

export default function PrivacyPolicy() {
  const { t } = useTranslation()
  usePageTitle(t('legal.privacy'))

  const sections = t('legal.privacyPolicy.sections', { returnObjects: true }) as LegalSectionData[]
  const contact = sections[sections.length - 1] as ContactSectionData

  return (
    <main className="min-h-screen bg-primary-50 py-12 px-4">
      <article className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-6">
        <header>
          <Link
            to="/"
            className="font-body text-sm text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
          >
            ← {t('notFound.backHome')}
          </Link>
          <h1 className="font-heading text-3xl font-bold text-primary-700 mt-4">
            {t('legal.privacy')}
          </h1>
          <p className="font-body text-sm text-gray-500 mt-1">
            {t('legal.lastUpdated', { date: 'August 11, 2026' })}
          </p>
        </header>

        {sections.slice(0, -1).map((section) => (
          <LegalSection key={section.id} section={section} />
        ))}

        <section aria-labelledby={contact.id}>
          <h2 id={contact.id} className="font-heading text-xl font-semibold text-gray-800 mb-2">
            {contact.heading}
          </h2>
          {contact.blocks.map((block, i) => block.type === 'p' && (
            <p key={i} className="font-body text-sm text-gray-700 leading-relaxed">{block.text}</p>
          ))}
          <address className="font-body text-sm text-gray-700 not-italic mt-2">
            <strong>{contact.orgLabel}</strong>
            <br />
            {contact.emailLabel}{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
            >
              {CONTACT_EMAIL}
            </a>
          </address>
          {contact.outro?.map((block, i) => (
            <p key={i} className="font-body text-sm text-gray-700 leading-relaxed mt-2">{block.text}</p>
          ))}
        </section>

        <footer className="border-t border-gray-100 pt-4 flex gap-6">
          <Link
            to="/terms"
            className="font-body text-sm text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
          >
            {t('legal.terms')}
          </Link>
          <Link
            to="/"
            className="font-body text-sm text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
          >
            {t('notFound.backHome')}
          </Link>
        </footer>
      </article>
    </main>
  )
}
