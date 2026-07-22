import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../hooks/usePageTitle'

export default function TermsOfService() {
  const { t } = useTranslation()
  usePageTitle(`${t('legal.terms')} — ${t('app.name')}`)

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
            {t('legal.terms')}
          </h1>
          <p className="font-body text-sm text-gray-500 mt-1">
            {t('legal.lastUpdated', { date: 'July 1, 2026' })}
          </p>
        </header>

        <section aria-labelledby="tos-acceptance">
          <h2 id="tos-acceptance" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            1. Acceptance of Terms
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            By accessing or using KiddoPath (the "Service"), you agree to be bound by these Terms of
            Service ("Terms"). If you do not agree to all of these Terms, you may not use the Service.
            If you are registering on behalf of a child, you represent that you are the child's parent
            or legal guardian and that you accept these Terms on the child's behalf.
          </p>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            These Terms constitute a legally binding agreement between you and KiddoPath. Please read
            them carefully before creating an account.
          </p>
        </section>

        <section aria-labelledby="tos-service">
          <h2 id="tos-service" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            2. Description of Service
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            KiddoPath is a gamified task and habit management platform that allows parents or guardians
            ("Parent Users") to create and assign tasks to children ("Child Users"). Children earn
            experience points (XP), gain levels in task categories, and collect virtual coins upon
            completing tasks. Parents can optionally review and approve or reject completed tasks.
          </p>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            The Service is provided for personal, non-commercial, educational, and motivational use by
            families.
          </p>
        </section>

        <section aria-labelledby="tos-eligibility">
          <h2 id="tos-eligibility" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            3. Eligibility
          </h2>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1">
            <li>
              <strong>Parent Users</strong> must be at least 18 years of age and have the legal authority
              to enter into these Terms.
            </li>
            <li>
              <strong>Child Users</strong> may be of any age, provided a parent or legal guardian has
              created and linked a guardian account, verified their email, and explicitly accepted the
              guardian invitation.
            </li>
            <li>
              If you are under 13 years old (or the applicable age of digital consent in your country),
              you may only use the Service under the direct supervision of a parent or guardian who has
              provided verifiable parental consent through the platform's invitation flow.
            </li>
          </ul>
        </section>

        <section aria-labelledby="tos-accounts">
          <h2 id="tos-accounts" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            4. Account Registration and Security
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activity that occurs under your account. You agree to:
          </p>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1 mt-2">
            <li>Provide accurate, current, and complete information during registration.</li>
            <li>Keep your password secure and not share it with anyone.</li>
            <li>Notify us immediately of any unauthorised use of your account.</li>
            <li>Not create more than one account per person without our express permission.</li>
          </ul>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            We are not liable for any loss or damage arising from your failure to protect your account
            credentials.
          </p>
        </section>

        <section aria-labelledby="tos-parental">
          <h2 id="tos-parental" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            5. Parental Responsibilities
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            Parent Users bear full responsibility for:
          </p>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1 mt-2">
            <li>
              Supervising their child's use of the Service and ensuring tasks assigned are age-appropriate
              and safe.
            </li>
            <li>
              Keeping their guardian account secure so that only they can approve or reject their child's
              task completions.
            </li>
            <li>
              Reviewing the categories and privacy settings configured for their child's account and
              updating them as appropriate.
            </li>
            <li>
              Promptly notifying us if a child account is being misused or if the parent-child
              relationship has changed.
            </li>
          </ul>
        </section>

        <section aria-labelledby="tos-use">
          <h2 id="tos-use" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            6. Acceptable Use
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed mb-2">
            You agree not to use the Service to:
          </p>
          <ul className="font-body text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-1">
            <li>Violate any applicable law, regulation, or third-party rights.</li>
            <li>
              Submit false, misleading, or harmful content as task titles, descriptions, or parent notes.
            </li>
            <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
            <li>
              Reverse-engineer, decompile, or otherwise attempt to extract the source code of the
              Service.
            </li>
            <li>Use automated tools (bots, scrapers) to interact with the Service without our consent.</li>
            <li>
              Impersonate another person or misrepresent your identity or relationship to a child.
            </li>
          </ul>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            We reserve the right to suspend or terminate any account that violates these rules.
          </p>
        </section>

        <section aria-labelledby="tos-gamification">
          <h2 id="tos-gamification" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            7. Virtual Rewards and Gamification
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            XP points, levels, coins, streaks, and any other gamification elements within KiddoPath are
            virtual constructs provided solely to motivate and engage users within the platform. They have
            no monetary value, cannot be exchanged for real currency, transferred between accounts, or
            redeemed outside the Service in any way.
          </p>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            We may adjust, reset, or remove virtual rewards at any time without liability if the system is
            found to have been manipulated or if we change how the gamification system works.
          </p>
        </section>

        <section aria-labelledby="tos-ip">
          <h2 id="tos-ip" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            8. Intellectual Property
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            The KiddoPath name, logo, software, design, and all associated intellectual property are
            owned by or licensed to us and are protected by applicable intellectual property laws. You
            are granted a limited, non-exclusive, non-transferable licence to access and use the Service
            for its intended purpose. This licence does not include the right to copy, modify, distribute,
            or create derivative works from any part of the Service.
          </p>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            Content you create within the Service (task titles, descriptions, notes) remains yours. By
            entering it into the platform you grant us a limited licence to store, display, and process
            it solely to provide the Service.
          </p>
        </section>

        <section aria-labelledby="tos-disclaimer">
          <h2 id="tos-disclaimer" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            9. Disclaimer of Warranties
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not warrant that the Service will be
            uninterrupted, error-free, or free of viruses or other harmful components.
          </p>
        </section>

        <section aria-labelledby="tos-liability">
          <h2 id="tos-liability" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            10. Limitation of Liability
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, KIDDOPATH SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
            DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE
            SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            Our total aggregate liability for any claims arising under these Terms shall not exceed the
            amount you paid us in the twelve months preceding the claim (or EUR 50 if no payment was made).
          </p>
        </section>

        <section aria-labelledby="tos-termination">
          <h2 id="tos-termination" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            11. Termination
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            You may delete your account at any time. We may suspend or terminate your access to the
            Service at any time, with or without notice, if we reasonably believe you have violated these
            Terms or applicable law.
          </p>
          <p className="font-body text-sm text-gray-700 leading-relaxed mt-2">
            Upon termination, your right to use the Service ceases immediately. Sections 8–12 of these
            Terms survive termination.
          </p>
        </section>

        <section aria-labelledby="tos-changes">
          <h2 id="tos-changes" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            12. Changes to These Terms
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            We may revise these Terms at any time. When we make material changes, we will update the
            "Last updated" date at the top of this page. Continued use of the Service after the updated
            Terms are published constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section aria-labelledby="tos-contact">
          <h2 id="tos-contact" className="font-heading text-xl font-semibold text-gray-800 mb-2">
            13. Contact Us
          </h2>
          <p className="font-body text-sm text-gray-700 leading-relaxed">
            Questions about these Terms should be sent to:
          </p>
          <address className="font-body text-sm text-gray-700 not-italic mt-2">
            <strong>KiddoPath Legal</strong>
            <br />
            Email:{' '}
            <a
              href="mailto:legal@kiddopath.app"
              className="text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
            >
              legal@kiddopath.app
            </a>
          </address>
        </section>

        <footer className="border-t border-gray-100 pt-4 flex gap-6">
          <Link
            to="/privacy"
            className="font-body text-sm text-primary-600 underline hover:text-primary-700 focus-ring rounded-sm"
          >
            {t('legal.privacy')}
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
