import client from './client'
import { type Task, type Completion } from '../constants/categories'
import useAuthStore from '../store/authStore'
export type { Completion }

export interface CompletionInfo {
  status: 'pending' | 'confirmed' | 'rejected'
  review_note: string
}

export async function getTasks(): Promise<Task[]> {
  const res = await client.get('/task/tasks/')
  return res.data
}

export async function getCompletions(): Promise<Completion[]> {
  const res = await client.get('/task/completions/')
  return res.data
}

export async function postCompletion(taskId: string): Promise<Completion> {
  const res = await client.post('/task/completions/', { task: taskId })
  return res.data
}

export interface CategorySettings {
  show_health: boolean
  show_learning: boolean
  show_responsibility: boolean
  show_creativity: boolean
}

export async function getCategorySettings(): Promise<CategorySettings> {
  const res = await client.get('/task/settings/categories/')
  return res.data
}

export async function updateCategorySettings(data: CategorySettings): Promise<CategorySettings> {
  const res = await client.put('/task/settings/categories/', data)
  return res.data
}

export interface CreateTaskInput {
  title: string
  description: string
  due_date: string | null
}

async function readTaskSSE(
  body: ReadableStream<Uint8Array>,
  onToken: (text: string) => void,
  onDone: (task: Task) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const chunk of chunks) {
      let eventType = ''
      let dataLine = ''
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim()
        else if (line.startsWith('data: ')) dataLine = line.slice(6)
      }
      if (!dataLine) continue
      let payload: Record<string, unknown>
      try { payload = JSON.parse(dataLine) } catch { continue }

      if (eventType === 'token' && typeof payload.text === 'string') onToken(payload.text)
      else if (eventType === 'done' && payload.task) onDone(payload.task as Task)
      else if (eventType === 'error') throw new Error((payload.message as string) ?? 'ai_error')
    }
  }

  const remaining = buffer.trim()
  if (remaining) {
    try {
      const payload = JSON.parse(remaining)
      if (payload.id) onDone(payload as Task)
    } catch { /* ignore */ }
  }
}

export async function createTaskStream(
  data: CreateTaskInput,
  onToken: (text: string) => void,
  onDone: (task: Task) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().token
  const baseURL = client.defaults.baseURL ?? 'https://localhost/api'

  const res = await fetch(`${baseURL}/task/tasks/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal,
  })

  if (!res.ok) throw new Error(`${res.status}`)
  if (!res.body) throw new Error('no-body')

  await readTaskSSE(res.body, onToken, onDone)
}

export async function updateTaskStream(
  taskId: string,
  data: UpdateTaskInput,
  onToken: (text: string) => void,
  onDone: (task: Task) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().token
  const baseURL = client.defaults.baseURL ?? 'https://localhost/api'

  const res = await fetch(`${baseURL}/task/tasks/${taskId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal,
  })

  if (!res.ok) throw new Error(`${res.status}`)
  if (!res.body) throw new Error('no-body')

  // If only due_date changed, backend returns plain JSON (no AI re-classification)
  if (!(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    const task = await res.json() as Task
    onDone(task)
    return
  }

  await readTaskSSE(res.body, onToken, onDone)
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  due_date?: string | null
}

export async function deleteTask(taskId: string): Promise<void> {
  await client.delete(`/task/tasks/${taskId}/`)
}

/** Progressively extracts the human-readable "summary" field from a
 *  partially-received SSE JSON payload while the AI stream is in flight. */
export function extractStreamingSummary(buffer: string): string {
  const m = /"summary"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(buffer)
  return m ? m[1] : ''
}
