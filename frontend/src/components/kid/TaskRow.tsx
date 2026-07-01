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
}: Props) {
  const { t } = useTranslation()

  const category = primaryCategory(task.category_rewards)
  const style     = CATEGORY_STYLE[category]

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
            <p className={`font-body font-semibold text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
              <span className="ms-1 text-gray-300 text-xs" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
            </p>
            <p className={`font-body text-xs font-semibold mt-0.5 ${style.text}`}>
              {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
            </p>
          </button>
        ) : (
          <div className="flex-1 min-w-0">
            <p className={`font-body font-semibold text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </p>
            <p className={`font-body text-xs font-semibold mt-0.5 ${style.text}`}>
              {t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
            </p>
          </div>
        )}

        {/* XP reward */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-body font-bold text-sm text-gray-700">+{task.xp_reward}</span>
          <span aria-hidden="true">⭐</span>
        </div>

        {/* Status indicator */}
        {distinguishPending && isPending ? (
          <span
            className="w-7 h-7 flex items-center justify-center shrink-0 text-amber-700"
            aria-label={t('kidDash.taskPending')}
          >
            ⏳
          </span>
        ) : isDone ? (
          <span className="w-7 h-7 rounded-full bg-teal-500 border-2 border-teal-500 shrink-0 flex items-center justify-center">
            <Checkmark />
          </span>
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={false}
            aria-label={task.title}
            onClick={() => !isRejected && onComplete(task.id)}
            className="w-7 h-7 rounded-full border-2 border-gray-300 hover:border-primary-500 shrink-0 flex items-center justify-center focus-ring transition-colors"
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
