import { useTranslation } from 'react-i18next'
import Modal from '../Modal'
import {
  STAT_XP_PER_LEVEL,
  MAIN_XP_PER_LEVEL,
  OVERALL_XP_PER_STAT_LEVEL,
  COINS_PER_MAIN_LEVEL,
  STAT_LEVELS_PER_MAIN_LEVEL,
} from '../../constants/xp'

interface Props {
  onClose: () => void
}

/**
 * The rules of the game, in the order a kid actually experiences them.
 *
 * Every number comes from `constants/xp`, which mirrors gamification-service —
 * nothing here is written out by hand. A help panel that quietly disagrees with
 * the bars next to it would be worse than no help panel.
 */
export default function HowRewardsWork({ onClose }: Props) {
  const { t } = useTranslation()

  const steps = [
    { icon: '✅', text: t('rewards.stepTask') },
    { icon: '⭐', text: t('rewards.stepCategory', { xp: STAT_XP_PER_LEVEL }) },
    { icon: '🚀', text: t('rewards.stepOverall', { xp: OVERALL_XP_PER_STAT_LEVEL, total: MAIN_XP_PER_LEVEL }) },
    { icon: '🪙', text: t('rewards.stepCoins', { coins: COINS_PER_MAIN_LEVEL }) },
    { icon: '🎨', text: t('rewards.stepShop') },
  ]

  return (
    <Modal
      onClose={onClose}
      labelledBy="rewards-title"
      describedBy="rewards-summary"
      cardClassName="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 max-h-[85vh] overflow-auto"
    >
      <h2 id="rewards-title" className="font-heading text-xl font-bold text-gray-900">
        <span aria-hidden="true">💡</span> {t('rewards.title')}
      </h2>

      {/* The headline answer, before the steps: this is the question the panel
          exists to answer, and a kid shouldn't have to assemble it from five
          bullet points. */}
      <p id="rewards-summary" className="rounded-xl bg-primary-50 p-3 font-body text-sm text-primary-700">
        {t('rewards.summary', {
          levels: STAT_LEVELS_PER_MAIN_LEVEL,
          xp: STAT_XP_PER_LEVEL,
          coins: COINS_PER_MAIN_LEVEL,
        })}
      </p>

      <ol className="flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-base shrink-0"
            >
              {step.icon}
            </span>
            <p className="font-body text-sm text-gray-700 pt-1.5">{step.text}</p>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={onClose}
        className="min-h-11 w-full rounded-xl bg-primary-600 font-body text-sm font-bold text-white hover:bg-primary-700 focus-ring transition-colors"
      >
        {t('rewards.gotIt')}
      </button>
    </Modal>
  )
}
