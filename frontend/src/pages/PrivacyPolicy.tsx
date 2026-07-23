import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../hooks/usePageTitle'

export default function PrivacyPolicy() {
  const { t } = useTranslation()
  usePageTitle(`${t('legal.privacy')} — ${t('app.name')}`)

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
            {t('legal.lastUpdated', { date: 'July 1, 2026' })}
          </p>
        </header>

        <section aria-labelledby="pp-intro">
          <h2 id="pp-intro" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            1. Introduction
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            KiddoPath ("we", "us", or "our") operates a gamified task and habit management platform
            designed for children under parental supervision. This Privacy Policy explains what personal
            data we collect, how we use it, and the rights you have over your information.
          </p>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            By creating an account you agree to the practices described in this policy. If you are
            registering a child account, you confirm that you are the child's parent or legal guardian
            and that you consent on the child's behalf.
          </p>
        </section>

        <section aria-labelledby="pp-collect">
          <h2 id="pp-collect" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            2. Information We Collect
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed mb-2">
            We collect only the information necessary to provide the service:
          </p>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1">
            <li>
              <strong>Account data:</strong> email address, username, display name, and password (stored as a
              one-way cryptographic hash — we never store your plaintext password).
            </li>
            <li>
              <strong>Task data:</strong> task titles, descriptions, categories, due dates, completion status,
              and any notes added by a parent or guardian.
            </li>
            <li>
              <strong>Gamification data:</strong> experience points (XP) earned per category, level progress,
              coin balance, and daily streak history.
            </li>
            <li>
              <strong>Usage data:</strong> login timestamps and completion timestamps, used to compute streaks
              and provide activity summaries to parents.
            </li>
            <li>
              <strong>Invitation data:</strong> the email address of a parent or guardian entered during child
              registration, used solely to send the guardian invitation.
            </li>
          </ul>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            We do not collect payment information, geolocation data, or any biometric data.
          </p>
        </section>

        <section aria-labelledby="pp-use">
          <h2 id="pp-use" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            3. How We Use Your Information
          </h2>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1">
            <li>To create and maintain your account and authenticate your sessions.</li>
            <li>
              To provide the core service: displaying tasks, recording completions, calculating XP and
              levels, and showing progress to both the child and the parent.
            </li>
            <li>To send transactional emails such as email verification and guardian invitation links.</li>
            <li>
              To allow parents to review and approve or reject their child's completed tasks where the
              child's privacy settings require parental review.
            </li>
            <li>To improve the platform based on aggregated, anonymised usage patterns.</li>
          </ul>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            We do not use your data for advertising, profiling, or automated decision-making that produces
            legal or similarly significant effects.
          </p>
        </section>

        <section aria-labelledby="pp-children">
          <h2 id="pp-children" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            4. Children's Privacy
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            KiddoPath is designed specifically for use by children under parental supervision. We take
            children's privacy seriously and comply with applicable laws including the Children's Online
            Privacy Protection Act (COPPA) and the General Data Protection Regulation (GDPR).
          </p>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1 mt-2">
            <li>
              A child account can only be activated after a parent or guardian accepts an invitation and
              confirms their relationship — we do not activate child accounts without verified parental
              consent.
            </li>
            <li>
              Parents can review their child's tasks, progress, and completion history at any time through
              the parent dashboard.
            </li>
            <li>
              Parents may request deletion of their child's account and all associated data at any time by
              contacting us (see Section 9).
            </li>
            <li>
              We do not display advertising to child users or share their data with advertising networks.
            </li>
          </ul>
        </section>

        <section aria-labelledby="pp-sharing">
          <h2 id="pp-sharing" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            5. Data Sharing and Disclosure
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            We do not sell, rent, or trade your personal data. We may share data only in the following
            limited circumstances:
          </p>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1 mt-2">
            <li>
              <strong>Within the platform:</strong> a child's tasks and progress are visible to their linked
              parent or guardian as required by the service.
            </li>
            <li>
              <strong>Service providers:</strong> we use third-party infrastructure providers (email delivery,
              cloud hosting) who process data strictly on our behalf under confidentiality agreements.
            </li>
            <li>
              <strong>Legal requirements:</strong> we may disclose data if required to do so by law or in
              response to a valid legal process, and only to the extent required.
            </li>
          </ul>
        </section>

        <section aria-labelledby="pp-security">
          <h2 id="pp-security" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            6. Data Security
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            All data in transit is protected by TLS encryption. Passwords are stored using strong
            one-way hashing (Django's PBKDF2 with SHA-256). Authentication uses short-lived access
            tokens and rotating refresh tokens. We conduct regular security reviews of our codebase and
            infrastructure.
          </p>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            No system is completely secure. If you believe your account has been compromised, please
            contact us immediately.
          </p>
        </section>

        <section aria-labelledby="pp-retention">
          <h2 id="pp-retention" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            7. Data Retention
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            We retain personal data for as long as your account is active. When an account is deleted,
            we permanently remove associated personal data within 30 days. Aggregated, anonymised
            statistics that cannot be linked back to any individual may be retained for product
            improvement purposes.
          </p>
        </section>

        <section aria-labelledby="pp-rights">
          <h2 id="pp-rights" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            8. Your Rights
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed mb-2">
            Depending on your jurisdiction, you may have the following rights regarding your personal data:
          </p>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1">
            <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification:</strong> ask us to correct inaccurate or incomplete data.</li>
            <li>
              <strong>Erasure:</strong> request deletion of your account and personal data ("right to be
              forgotten").
            </li>
            <li>
              <strong>Portability:</strong> receive your data in a structured, machine-readable format.
            </li>
            <li>
              <strong>Withdrawal of consent:</strong> where processing is based on consent, you may withdraw
              it at any time without affecting the lawfulness of prior processing.
            </li>
          </ul>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            For children's accounts, these rights are exercised by the parent or legal guardian.
            To exercise any right, contact us as described in Section 9.
          </p>
        </section>

        <section aria-labelledby="pp-contact">
          <h2 id="pp-contact" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            9. Contact Us
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            For any privacy-related questions, requests, or concerns, please contact us at:
          </p>
          <address className="font-body text-sm text-gray-700 not-italic mt-2">
            <strong>KiddoPath Privacy Team</strong>
            <br />
            Email:{' '}
            <a
              href="mailto:privacy@kiddopath.app"
              className="text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
            >
              privacy@kiddopath.app
            </a>
          </address>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            We will respond to all legitimate requests within 30 days. This policy may be updated from
            time to time; the "Last updated" date at the top of this page will reflect the most recent
            revision.
          </p>
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
