import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Task, type TaskCategory, CATEGORY_STYLE, primaryCategory } from '../../constants/categories'
import { type CompletionInfo } from '../../api/tasks'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  task: Task
  completionInfo?: CompletionInfo
  onComplete: (id: string) => void
  /** Overrides the due-date text (e.g. "Tomorrow" instead of "29 Jul"). */
  dueLabel?: string
  /** Offers the AI "why this task" note behind a disclosure. Tasks page only. */
  showAiSummary?: boolean
  className?: string
  overdue?: boolean
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onEdit?: () => void
}

// ─── Shared SVG checkmark ─────────────────────────────────────────────────────

function Checkmark() {
  return (
    <svg viewBox="0 0 10 8" className="w-3 h-3" fill="none" aria-hidden="true">
      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Circular arrow — marks a task that came back and needs doing again. */
function RedoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M13.5 2.5V5H11" />
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
  dueLabel,
  showAiSummary = false,
  className = '',
  overdue = false,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onEdit,
}: Props) {
  const { t, i18n } = useTranslation()
  const [aiOpen, setAiOpen] = useState(false)
  const aiPanelId = `ai-${task.id}`
  const hasAiNote = showAiSummary && task.ai_evaluated && Boolean(task.ai_summary)

  const category = primaryCategory(task.category_rewards)
  const style     = CATEGORY_STYLE[category]

  const isPending   = completionInfo?.status === 'pending'
  const isConfirmed = completionInfo?.status === 'confirmed'
  const isRejected  = completionInfo?.status === 'rejected'
  const isDone      = isConfirmed || isPending

  let dueDateFormatted: string | null = dueLabel ?? null
  if (!dueDateFormatted && task.due_date) {
    const [y, m, d] = task.due_date.split('-').map(Number)
    dueDateFormatted = new Date(y, m - 1, d).toLocaleDateString(
      i18n.language,
      { day: 'numeric', month: 'short' }
    )
  }

  return (
    <li className={`flex items-start gap-3 px-3 py-2.5 ${className}`}>

      {/* Category icon. Carries the accessible name now that the category is
          no longer spelled out in the row's text. */}
      <div
        role="img"
        aria-label={t(`kidDash.categories.${category}` as `kidDash.categories.${TaskCategory}`)}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${style.bg} flex items-center justify-center text-base sm:text-lg shrink-0 mt-0.5`}
      >
        {style.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">

        {/* Title + pencil. Wraps rather than truncating — on a phone the
            column is narrow enough that truncation left titles unreadable. */}
        <div className="flex items-start gap-1.5">
          <p className={`font-body font-semibold text-sm flex-1 min-w-0 line-clamp-3 ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </p>
          {/* Sits with the row's other controls rather than as a line of text
              under the title. Reads "AI" — short and the same in every
              language — with the fuller wording as its accessible name. */}
          {hasAiNote && !selectMode && (
            <button
              type="button"
              onClick={() => setAiOpen(open => !open)}
              aria-expanded={aiOpen}
              aria-controls={aiPanelId}
              aria-label={t('kidDash.aiSummary')}
              className={`shrink-0 inline-flex items-center gap-0.5 rounded-lg px-1.5 h-6 font-body text-xs font-semibold transition-colors focus-ring ${
                aiOpen
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              <span aria-hidden="true">✨</span>
              <span aria-hidden="true">AI</span>
            </button>
          )}
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

        {/* Due date. The category is carried by the coloured icon rather than
            repeated as text, and the description lives in the edit view — a
            list row stays scannable with just a title and one meta line. */}
        {/* Meta line. The XP reward sits here rather than in the right-hand
            cluster so the title keeps the width it needs on narrow screens. */}
        <p className="flex items-center gap-1.5 mt-0.5 font-body text-xs">
          {dueDateFormatted && (
            <span className={overdue ? 'text-danger-700 font-semibold' : 'text-gray-400'}>
              {dueDateFormatted}
            </span>
          )}
          {dueDateFormatted && <span aria-hidden="true" className="text-gray-300">·</span>}
          <span className="font-bold text-amber-700 whitespace-nowrap">
            <span aria-hidden="true">⭐</span> +{task.xp_reward}
            <span className="sr-only"> {t('tasks.xpRewardLabel')}</span>
          </span>
        </p>

        {/* Sent back: the parent's words are the useful part, so the label is
            folded in rather than given its own line. */}
        {isRejected && (
          <p className="font-body text-xs text-danger-700 italic mt-1 line-clamp-2">
            <span aria-hidden="true">✗ </span>
            <span className="sr-only">{t('kidDash.taskRejected')}: </span>
            {completionInfo?.review_note
              ? `“${completionInfo.review_note}”`
              : t('kidDash.taskRejected')}
          </p>
        )}

        {/* Approved with a note — the praise half of the review, easy to miss
            otherwise since confirmed tasks leave the list. */}
        {isConfirmed && completionInfo?.review_note && (
          <p className="font-body text-xs text-teal-700 italic mt-1">
            <span aria-hidden="true">✓ </span>
            &ldquo;{completionInfo.review_note}&rdquo;
          </p>
        )}

        {/* Revealed by the ✨ AI control above; interesting once, not on every
            scan, so it stays out of the way until asked for. */}
        {hasAiNote && aiOpen && (
          <p
            id={aiPanelId}
            className="mt-1.5 rounded-lg bg-primary-50 px-3 py-2 font-body text-xs text-gray-700 leading-relaxed"
          >
            {task.ai_summary}
          </p>
        )}
      </div>

      {/* Right column: just the action, so the title gets the rest */}
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
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
        ) : isPending ? (
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
            onClick={() => onComplete(task.id)}
            className={`w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center focus-ring transition-colors ${
              // A task that came back shows a redo glyph rather than an empty
              // circle: the action is the same, but it reads as "do it again".
              isRejected
                ? 'border-danger-500 text-danger-700 hover:bg-danger-50'
                : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'
            }`}
          >
            {isRejected && <RedoIcon />}
          </button>
        )}
      </div>

    </li>
  )
}
