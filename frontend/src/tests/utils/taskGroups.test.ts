import { describe, it, expect } from 'vitest'
import { latestCompletions, groupTasks } from '../../utils/taskGroups'
import type { Task, Completion } from '../../constants/categories'

const TODAY = '2026-07-28'

function task(id: string, dueDate: string | null, createdAt = '2026-01-01T00:00:00Z'): Task {
  return {
    id,
    title: `task ${id}`,
    description: '',
    due_date: dueDate,
    xp_reward: 10,
    created_at: createdAt,
    category_rewards: [],
  } as unknown as Task
}

function completion(
  taskId: string,
  status: Completion['status'],
  completedAt: string,
): Completion {
  return {
    id: `c-${taskId}-${completedAt}`,
    task: taskId,
    kid_id: 'kid',
    status,
    completed_at: completedAt,
    reviewed_at: null,
    review_note: '',
  } as unknown as Completion
}

describe('latestCompletions', () => {
  it('keeps only the newest completion per task', () => {
    const result = latestCompletions([
      completion('a', 'rejected', '2026-07-20T10:00:00Z'),
      completion('a', 'pending', '2026-07-27T10:00:00Z'),
    ])
    expect(result.get('a')?.status).toBe('pending')
  })

  it('is independent of input order', () => {
    const result = latestCompletions([
      completion('a', 'pending', '2026-07-27T10:00:00Z'),
      completion('a', 'rejected', '2026-07-20T10:00:00Z'),
    ])
    expect(result.get('a')?.status).toBe('pending')
  })

  it('returns an empty map for no completions', () => {
    expect(latestCompletions([]).size).toBe(0)
  })
})

describe('groupTasks', () => {
  it('buckets tasks by due date', () => {
    const groups = groupTasks(
      [
        task('today', TODAY),
        task('past', '2026-07-01'),
        task('future', '2026-08-10'),
        task('undated', null),
      ],
      [],
      TODAY,
    )
    expect(groups.today.map(t => t.id)).toEqual(['today'])
    expect(groups.overdue.map(t => t.id)).toEqual(['past'])
    expect(groups.upcoming.map(t => t.id)).toEqual(['future'])
    expect(groups.anytime.map(t => t.id)).toEqual(['undated'])
  })

  it('drops confirmed tasks entirely and moves awaiting-review ones to pending', () => {
    const groups = groupTasks(
      [task('done', TODAY), task('waiting', TODAY), task('open', TODAY)],
      [
        completion('done', 'confirmed', '2026-07-28T09:00:00Z'),
        completion('waiting', 'pending', '2026-07-28T09:00:00Z'),
      ],
      TODAY,
    )
    expect(groups.today.map(t => t.id)).toEqual(['open'])
    expect(groups.pending.map(t => t.id)).toEqual(['waiting'])
    // 'done' appears nowhere
    expect(Object.values(groups).flat().map(t => t.id)).not.toContain('done')
  })

  it('returns a rejected task to its date bucket as open work', () => {
    // A rejection reopens the task rather than parking it somewhere separate,
    // so it shows up alongside everything else still to do.
    const groups = groupTasks(
      [task('sent-back', TODAY), task('overdue-back', '2026-07-01')],
      [
        completion('sent-back', 'rejected', '2026-07-28T09:00:00Z'),
        completion('overdue-back', 'rejected', '2026-07-28T09:00:00Z'),
      ],
      TODAY,
    )
    expect(groups.today.map(t => t.id)).toEqual(['sent-back'])
    expect(groups.overdue.map(t => t.id)).toEqual(['overdue-back'])
    expect(groups.pending).toEqual([])
  })

  it('treats a task resubmitted after rejection as awaiting review', () => {
    const groups = groupTasks(
      [task('redo', TODAY)],
      [
        completion('redo', 'rejected', '2026-07-20T09:00:00Z'),
        completion('redo', 'pending', '2026-07-28T09:00:00Z'),
      ],
      TODAY,
    )
    expect(groups.today).toEqual([])
    expect(groups.pending.map(t => t.id)).toEqual(['redo'])
  })

  it('keeps a just-completed task in place when its id is in keepIds', () => {
    // Holds the row on screen for a moment so its tick is visible, instead of
    // jumping straight to the waiting-for-approval group.
    const groups = groupTasks(
      [task('ticked', TODAY), task('open', TODAY)],
      [completion('ticked', 'pending', '2026-07-28T09:00:00Z')],
      TODAY,
      new Set(['ticked']),
    )
    expect(groups.today.map(t => t.id)).toEqual(['ticked', 'open'])
    expect(groups.pending).toEqual([])
  })

  it('moves the task to pending once it is no longer in keepIds', () => {
    const groups = groupTasks(
      [task('ticked', TODAY), task('open', TODAY)],
      [completion('ticked', 'pending', '2026-07-28T09:00:00Z')],
      TODAY,
      new Set(),
    )
    expect(groups.today.map(t => t.id)).toEqual(['open'])
    expect(groups.pending.map(t => t.id)).toEqual(['ticked'])
  })

  it('puts a newly added task at the end of today, not the top', () => {
    // The API returns tasks newest-created first, so without this the task you
    // just made would jump above the ones already on the list.
    const groups = groupTasks(
      [
        task('just-added', TODAY, '2026-07-28T18:00:00Z'),
        task('added-earlier', TODAY, '2026-07-28T08:00:00Z'),
        task('added-first', TODAY, '2026-07-27T09:00:00Z'),
      ],
      [],
      TODAY,
    )
    expect(groups.today.map(t => t.id)).toEqual(['added-first', 'added-earlier', 'just-added'])
  })

  it('orders undated tasks oldest first too', () => {
    const groups = groupTasks(
      [
        task('newer', null, '2026-07-28T18:00:00Z'),
        task('older', null, '2026-07-20T08:00:00Z'),
      ],
      [],
      TODAY,
    )
    expect(groups.anytime.map(t => t.id)).toEqual(['older', 'newer'])
  })

  it('sorts dated buckets chronologically', () => {
    const groups = groupTasks(
      [task('later', '2026-08-10'), task('sooner', '2026-07-30')],
      [],
      TODAY,
    )
    expect(groups.upcoming.map(t => t.id)).toEqual(['sooner', 'later'])
  })
})
