import { useTranslation } from 'react-i18next'
import { type Task, type TaskCategory, CATEGORY_STYLE, primaryCategory } from '../../constants/categories'
import { type CompletionInfo } from '../../api/tasks'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  task: Task
  completionInfo?: CompletionInfo
  onComplete: (id: string) => void
  /**
   * When true (TasksAll): shows ⏳ for pending and ✓ for confirmed separately.
   * When false/omitted (TodaysTasks): treats both pending and confirmed as "done".
   */
  distinguishPending?: boolean
  className?: string
  overdue?: boolean
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onEdit?: () => void
  showAiSummary?: boolean
}

// ─── Shared SVG checkmark ─────────────────────────────────────────────────────

function Checkmark() {
  return (
    <svg viewBox="0 0 10 8" className="w-3 h-3" fill="none" aria-hidden="true">
      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskRow({
  task,
  completionInfo,
  onComplete,
  distinguishPending = false,
  className = '',
  overdue = false,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onEdit,
  showAiSummary = false,
}: Props) {
  const { t, i18n } = useTranslation()

  const category = primaryCategory(task.category_rewards)
  const style     = CATEGORY_STYLE[category]

  const isPending   = completionInfo?.status === 'pending'
  const isConfirmed = completionInfo?.status === 'confirmed'
  const isRejected  = completionInfo?.status === 'rejected'
  const isDone      = isConfirmed || isPending

  let dueDateFormatted: string | null = null
  if (task.due_date) {
    const [y, m, d] = task.due_date.split('-').map(Number)
    dueDateFormatted = new Date(y, m - 1, d).toLocaleDateString(
      i18n.language,
      { day: 'numeric', month: 'short' }
    )
  }

  return (
    <li className={`flex items-start gap-3 px-3 py-3 ${className}`}>

      {/* Category icon */}
      <div
        className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center text-lg shrink-0 mt-0.5`}
        aria-hidden="true"
      >
        {style.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">

        {/* Title + pencil */}
        <div className="flex items-center gap-1.5">
          <p className={`font-body font-semibold text-sm flex-1 min-w-0 truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </p>
          {onEdit && !selectMode && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={t('a11y.editTask', { title: task.title })}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 focus-ring transition-colors"
            >
              <PencilIcon />
            </button>
          )}
        </div>

        {/* Category + due date */}
        <p className={`font-body text-xs font-semibold mt-0.5 ${overdue ? 'text-danger-700' : style.text}`}>
          {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
          {dueDateFormatted && (
            <span className={`font-normal ms-1 ${overdue ? 'text-danger-700' : 'text-gray-400'}`}>
              · {dueDateFormatted}
            </span>
          )}
        </p>

        {/* Description + AI summary */}
        {(task.description || (showAiSummary && task.ai_evaluated && task.ai_summary)) && (
          <div className="mt-1 flex flex-col gap-0.5">
            {task.description && (
              <p className="font-body text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
            {showAiSummary && task.ai_evaluated && task.ai_summary && (
              <p className="font-body text-xs text-primary-600 line-clamp-2 leading-relaxed">
                <span aria-hidden="true">✨</span> {task.ai_summary}
              </p>
            )}
          </div>
        )}

        {/* Rejection note */}
        {isRejected && (
          <div className="mt-1.5 flex flex-col gap-0.5">
            <p className="font-body text-xs font-semibold text-danger-700">
              <span aria-hidden="true">✗</span> {t('kidDash.taskRejected')}
            </p>
            {completionInfo?.review_note && (
              <p className="font-body text-xs text-gray-500 italic">
                "{completionInfo.review_note}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right column: XP + status/checkbox */}
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <div className="flex items-center gap-1 bg-amber-50 rounded-full px-2.5 py-1">
          <span aria-hidden="true" className="text-xs">⭐</span>
          <span className="font-body font-bold text-xs text-amber-700">+{task.xp_reward}</span>
        </div>

        {selectMode ? (
          <label className="w-8 h-8 flex items-center justify-center cursor-pointer">
            <span className="sr-only">{t('a11y.selectTask', { title: task.title })}</span>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(task.id)}
              className="w-5 h-5 rounded accent-primary-600 focus-ring cursor-pointer"
            />
          </label>
        ) : distinguishPending && isPending ? (
          <span
            role="img"
            aria-label={t('kidDash.taskPending')}
            className="w-8 h-8 flex items-center justify-center text-amber-700"
          >
            ⏳
          </span>
        ) : isDone ? (
          <span
            role="img"
            aria-label={t('kidDash.statusConfirmed')}
            className="w-8 h-8 rounded-full bg-teal-500 shrink-0 flex items-center justify-center shadow-sm"
          >
            <Checkmark />
          </span>
        ) : (
          <button
            type="button"
            aria-label={t('a11y.completeTask', { title: task.title })}
            disabled={isRejected}
            onClick={() => onComplete(task.id)}
            className={`w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center focus-ring transition-colors ${
              isRejected
                ? 'border-gray-200 opacity-40 cursor-not-allowed'
                : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'
            }`}
          />
        )}
      </div>

    </li>
  )
}
