import { useTranslation } from 'react-i18next'
import useAuthStore from '../store/authStore'
import { kidsFromToken } from '../api/parent'
import { usePageTitle } from '../hooks/usePageTitle'
import PendingApprovals from '../components/parent/PendingApprovals'

export default function ParentApprovals() {
  const { t } = useTranslation()
  usePageTitle(t('parentDash.pendingApprovals'))

  const { token } = useAuthStore()
  const kids = token ? kidsFromToken(token) : []

  // kid_id -> display label (name, or "Child N" / "Your child" fallback)
  const labels = new Map(
    kids.map((k, i) => [
      k.id,
      k.username || (kids.length > 1 ? t('parentDash.childN', { n: i + 1 }) : t('parentDash.yourChild')),
    ]),
  )
  const kidLabelFor = (id: string) => labels.get(id) ?? t('parentDash.yourChild')

  return (
    <main
      id="main-content"
      aria-labelledby="approvals-page-heading"
      className="flex-1 flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-auto"
    >
      <h1 id="approvals-page-heading" className="sr-only">
        {t('parentDash.pendingApprovals')}
      </h1>

      <PendingApprovals kidLabelFor={kidLabelFor} />
    </main>
  )
}
