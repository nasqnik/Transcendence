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
   * When false/omitted (TodaysTasks): treats both pending and confirmed as "done" (filled ✓).
   */
  distinguishPending?: boolean
  /**
   * Pass `expanded` + `onToggleExpand` together to enable the expand/collapse
   * details panel (description + AI summary). Omit both to hide the toggle.
   */
  expanded?: boolean
  onToggleExpand?: () => void
  /** Extra classes applied to the <li> wrapper (e.g. hover styles, padding variants). */
  className?: string
  /** When true: shows the task's due date in danger color below the category label. */
  overdue?: boolean
  /**
   * When true (TasksAll select mode): replaces the status/complete control with a
   * selection checkbox. Pair with `selected` + `onToggleSelect`.
   */
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

// ─── Shared SVG checkmark ─────────────────────────────────────────────────────

function Checkmark() {
  return (
    <svg viewBox="0 0 10 8" className="w-3 h-3" fill="none" aria-hidden="true">
      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskRow({
  task,
  completionInfo,
  onComplete,
  distinguishPending = false,
  expanded,
  onToggleExpand,
  className = '',
  overdue = false,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const { t, i18n } = useTranslation()

  const category = primaryCategory(task.category_rewards)
  const style     = CATEGORY_STYLE[category]

  let dueDateFormatted: string | null = null
  if (overdue && task.due_date) {
    const [y, m, d] = task.due_date.split('-').map(Number)
    dueDateFormatted = new Date(y, m - 1, d).toLocaleDateString(
      i18n.language,
      { day: 'numeric', month: 'short' }
    )
  }

  const isPending   = completionInfo?.status === 'pending'
  const isConfirmed = completionInfo?.status === 'confirmed'
  const isRejected  = completionInfo?.status === 'rejected'
  // In simple mode (TodaysTasks) pending and confirmed both count as "done".
  const isDone      = isConfirmed || isPending

  const hasDetails = !!task.description || (task.ai_evaluated && !!task.ai_summary)
  const canExpand  = hasDetails && onToggleExpand !== undefined

  return (
    <li className={`flex flex-col gap-1 px-3 py-3 ${className}`}>
      <div className="flex items-center gap-3">

        {/* Category icon */}
        <div
          className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center text-lg shrink-0`}
          aria-hidden="true"
        >
          {style.icon}
        </div>

        {/* Title + category — expandable button in TasksAll, plain div otherwise */}
        {canExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={!!expanded}
            className="flex-1 min-w-0 text-left focus-ring rounded-lg"
          >
            <p className={`font-body font-semibold text-sm truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
              <span className="ms-1 text-gray-300 text-xs" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
            </p>
            <p className={`font-body text-xs font-semibold mt-0.5 ${style.text}`}>
              {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
            </p>
            {dueDateFormatted && (
              <p className="font-body text-xs font-semibold text-danger-700 mt-0.5">
                {t('tasks.dueDate', { date: dueDateFormatted })}
              </p>
            )}
          </button>
        ) : (
          <div className="flex-1 min-w-0">
            <p className={`font-body font-semibold text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </p>
            <p className={`font-body text-xs font-semibold mt-0.5 ${style.text}`}>
              {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
            </p>
            {dueDateFormatted && (
              <p className="font-body text-xs font-semibold text-danger-700 mt-0.5">
                {t('tasks.dueDate', { date: dueDateFormatted })}
              </p>
            )}
          </div>
        )}

        {/* XP reward */}
        <div className="flex items-center gap-1 shrink-0 bg-amber-50 rounded-full px-2.5 py-1">
          <span aria-hidden="true" className="text-xs">⭐</span>
          <span className="font-body font-bold text-xs text-amber-700">+{task.xp_reward}</span>
        </div>

        {/* Selection checkbox (select mode) or status indicator */}
        {selectMode ? (
          <label className="w-8 h-8 flex items-center justify-center shrink-0 cursor-pointer">
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
            className="w-8 h-8 flex items-center justify-center shrink-0 text-amber-700"
          >
            ⏳
          </span>
        ) : isDone ? (
          <span className="w-8 h-8 rounded-full bg-teal-500 shrink-0 flex items-center justify-center shadow-sm">
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

      {/* Rejection note */}
      {isRejected && (
        <div className="ms-[3.25rem] flex flex-col gap-0.5">
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

      {/* Expanded details: description + AI summary (TasksAll only) */}
      {expanded && (
        <div className="ms-[3.25rem] mt-1 flex flex-col gap-2">
          {task.description && (
            <p className="font-body text-xs text-gray-600 leading-relaxed">
              {task.description}
            </p>
          )}
          {task.ai_evaluated && task.ai_summary && (
            <div className="bg-primary-50 rounded-lg px-3 py-2">
              <p className="font-body text-xs font-semibold text-primary-600 mb-0.5">
                <span aria-hidden="true">✨</span> {t('kidDash.aiSummary')}
              </p>
              <p className="font-body text-xs text-primary-700 leading-relaxed">
                {task.ai_summary}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
