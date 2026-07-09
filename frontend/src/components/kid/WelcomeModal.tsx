import { useTranslation } from 'react-i18next'
import Modal from '../Modal'

interface Props {
  onDismiss: () => void
}

export default function WelcomeModal({ onDismiss }: Props) {
  const { t, i18n } = useTranslation()
  const arrow = i18n.dir() === 'rtl' ? '←' : '→'

  return (
    <Modal onClose={onDismiss} labelledBy="welcome-heading" cardClassName="rounded-2xl w-full max-w-sm mx-4">
      <div className="p-8 flex flex-col items-center text-center gap-4">

        <div className="flex justify-center items-center gap-3" aria-hidden="true">
          <span className="text-3xl">📋</span>
          <span className="text-gray-300 font-bold">{arrow}</span>
          <span className="text-3xl">⭐</span>
          <span className="text-gray-300 font-bold">{arrow}</span>
          <span className="text-3xl">🏆</span>
        </div>

        <h2 id="welcome-heading" className="font-heading text-xl font-bold text-gray-900">
          {t('kidDash.welcomeModalTitle')}
        </h2>

        <p className="font-body text-sm text-gray-500 leading-relaxed">
          {t('kidDash.welcomeModalBody')}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full py-3 rounded-xl bg-primary-600 text-white font-body font-semibold text-sm hover:bg-primary-700 focus-ring transition-colors"
        >
          {t('kidDash.letsGo')}
        </button>

      </div>
    </Modal>
  )
}
