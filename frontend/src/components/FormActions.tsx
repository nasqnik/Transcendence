import { useTranslation } from 'react-i18next'
import Button from './Button'

interface Props {
  /** Label for the submit button when idle. */
  submitLabel: string
  /** Label while the request is in flight. */
  pendingLabel: string
  busy: boolean
  onCancel: () => void
}

/**
 * The submit/cancel pair used by every inline edit form in settings.
 *
 * Extracted because the same fourteen lines — including the `disabled` on both
 * buttons and the identical sizing classes — were repeated in each form. The
 * rows themselves are deliberately *not* merged: one edits a field in place,
 * one starts a confirm-by-link flow that never changes its value, and one
 * takes three fields with its own match validation. Only the buttons are
 * genuinely the same thing.
 */
export default function FormActions({ submitLabel, pendingLabel, busy, onCancel }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2">
      <Button type="submit" variant="primary" disabled={busy} className="px-4 py-2 text-sm">
        {busy ? pendingLabel : submitLabel}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={busy}
        className="px-4 py-2 text-sm"
      >
        {t('common.cancel')}
      </Button>
    </div>
  )
}
