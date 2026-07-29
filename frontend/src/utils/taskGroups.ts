import { type Task, type Completion } from '../constants/categories'
import { type CompletionInfo } from '../api/tasks'

/**
 * Most recent completion per task. A task can be submitted, rejected and
 * submitted again, so only the newest one describes its current state.
 */
export function latestCompletions(completions: Completion[]): Map<string, CompletionInfo> {
  const latest = new Map<string, CompletionInfo>()
  const newestFirst = [...completions].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  )
  for (const c of newestFirst) {
    if (!latest.has(c.task)) {
      latest.set(c.task, { status: c.status, review_note: c.review_note })
    }
  }
  return latest
}

export interface TaskGroups {
  /** Due today and still to do. */
  today: Task[]
  /** Due before today and still to do. */
  overdue: Task[]
  /** Due after today. */
  upcoming: Task[]
  /** No due date. */
  anytime: Task[]
  /** Submitted and waiting on a parent. */
  pending: Task[]
}

/**
 * Split tasks into the buckets the kid UI shows.
 *
 * Confirmed tasks are dropped — they are finished, and live in the points log.
 * Awaiting-review ones are pulled out of their date bucket, since nothing can
 * be done about them until a parent looks.
 *
 * A rejected task is deliberately *not* special-cased: being sent back means it
 * is simply open work again, so it returns to its date bucket carrying the
 * parent's note. This is how review workflows generally behave — a rejection
 * reopens the item rather than parking it somewhere separate.
 */
export function groupTasks(
  tasks: Task[],
  completions: Completion[],
  today: string,
  /**
   * Ids to keep in place despite being completed — used to hold a just-ticked
   * task in the list for a moment so the kid sees it get checked off.
   */
  keepIds: ReadonlySet<string> = new Set(),
): TaskGroups {
  const latest = latestCompletions(completions)

  const groups: TaskGroups = {
    today: [], overdue: [], upcoming: [], anytime: [], pending: [],
  }

  function byDueDate(task: Task) {
    if (task.due_date === null) groups.anytime.push(task)
    else if (task.due_date === today) groups.today.push(task)
    else if (task.due_date < today) groups.overdue.push(task)
    else groups.upcoming.push(task)
  }

  for (const task of tasks) {
    // A just-ticked task holds its place in the list so its tick is visible,
    // and only moves once the linger window ends.
    if (keepIds.has(task.id)) {
      byDueDate(task)
      continue
    }
    const status = latest.get(task.id)?.status
    if (status === 'confirmed') continue
    if (status === 'pending') groups.pending.push(task)
    else byDueDate(task) // never submitted, or sent back to be redone
  }

  groups.upcoming.sort((a, b) => a.due_date!.localeCompare(b.due_date!))
  groups.overdue.sort((a, b) => a.due_date!.localeCompare(b.due_date!))

  return groups
}
