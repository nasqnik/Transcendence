import { useTranslation } from 'react-i18next'
import { extractStreamingSummary } from '../../api/tasks'

interface Props {
  title: string
  streamingText: string
}

export default function StreamingView({ title, streamingText }: Props) {
  const { t } = useTranslation()
  return (
    <div className="p-6 flex flex-col gap-4">
      <p className="font-body text-sm font-semibold text-primary-600" aria-live="polite">
        <span aria-hidden="true">✨</span> {t('tasks.aiThinking')}
      </p>
      <p className="font-heading text-base font-bold text-gray-900">{title}</p>
      <div
        aria-hidden="true"
        className="min-h-20 rounded-xl bg-gray-50 border border-gray-200 p-3 font-body text-sm text-gray-700 leading-relaxed"
      >
        {extractStreamingSummary(streamingText)}
        <span className="inline-block w-0.5 h-[1em] bg-primary-500 animate-pulse ms-0.5 align-text-bottom" />
      </div>
    </div>
  )
}
