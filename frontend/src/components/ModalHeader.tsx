import { useTranslation } from 'react-i18next'

interface Props {
  /** Must match the `labelledBy` passed to Modal, so the dialog stays named. */
  id: string
  title: string
  onClose: () => void
}

/**
 * Title bar for a Modal: heading plus a close button.
 *
 * The three dialogs that use it kept their own byte-identical copies, down to
 * the close button's sizing and hover classes. Only the header is shared —
 * their bodies genuinely differ (one streams a create, one streams an update
 * and also deletes, one lists history), so those stay separate.
 */
export default function ModalHeader({ id, title, onClose }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h2 id={id} className="font-heading text-xl font-bold text-gray-900">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 focus-ring transition-colors text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    </div>
  )
}
