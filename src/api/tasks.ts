// API клиент для /tasks/* — F.18, 2026-05-26.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled'

export interface AdamTask {
  id: number
  owner_email: string
  title: string
  instructions: string
  status: TaskStatus
  result: string | null
  error: string | null
  email_delivered: boolean
  messenger_delivered: boolean
  seen_at: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  r2_download_url?: string | null
}

async function jsonOrError<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j && typeof j.detail === 'string') detail = j.detail
    } catch { /* not json */ }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export async function tasksList(limit = 50): Promise<AdamTask[]> {
  const res = await fetch(`${BASE}/tasks?limit=${limit}`, { credentials: 'include' })
  return jsonOrError<AdamTask[]>(res)
}

export async function taskCreate(
  title: string, instructions: string,
): Promise<AdamTask> {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, instructions }),
  })
  return jsonOrError<AdamTask>(res)
}

export async function taskGet(taskId: number): Promise<AdamTask> {
  const res = await fetch(`${BASE}/tasks/${taskId}`, { credentials: 'include' })
  return jsonOrError<AdamTask>(res)
}

export async function taskCancel(taskId: number): Promise<AdamTask> {
  const res = await fetch(`${BASE}/tasks/${taskId}/cancel`, {
    method: 'POST', credentials: 'include',
  })
  return jsonOrError<AdamTask>(res)
}

export async function taskSeen(taskId: number): Promise<AdamTask> {
  const res = await fetch(`${BASE}/tasks/${taskId}/seen`, {
    method: 'POST', credentials: 'include',
  })
  return jsonOrError<AdamTask>(res)
}
