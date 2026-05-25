// API клиент для /family/* — F.7, 2026-05-25.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface FamilyMember {
  id: number
  email: string
  display_name: string
  relation: string | null
  slot_position: number
  is_active: boolean
  can_be_called: boolean
}

export interface FamilyCall {
  id: number
  by_email: string
  by_name: string
  to_email: string
  message: string | null
  called_at: string
  seen_at: string | null
  email_delivered: boolean
}

export interface SlotUpdate {
  email?: string | null
  display_name?: string | null
  relation?: string | null
  is_active?: boolean | null
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

export async function familyMembers(): Promise<FamilyMember[]> {
  const res = await fetch(`${BASE}/family/members`, { credentials: 'include' })
  return jsonOrError<FamilyMember[]>(res)
}

export async function familyCall(
  toEmail: string, message: string | null,
): Promise<FamilyCall> {
  const res = await fetch(`${BASE}/family/call`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to_email: toEmail, message }),
  })
  return jsonOrError<FamilyCall>(res)
}

export async function familyCallsReceived(
  opts: { onlyUnseen?: boolean; limit?: number } = {},
): Promise<FamilyCall[]> {
  const params = new URLSearchParams()
  if (opts.onlyUnseen) params.set('only_unseen', 'true')
  if (opts.limit) params.set('limit', String(opts.limit))
  const url = `${BASE}/family/calls/received${params.toString() ? '?' + params : ''}`
  const res = await fetch(url, { credentials: 'include' })
  return jsonOrError<FamilyCall[]>(res)
}

export async function familyCallSeen(callId: number): Promise<FamilyCall> {
  const res = await fetch(`${BASE}/family/calls/${callId}/seen`, {
    method: 'POST',
    credentials: 'include',
  })
  return jsonOrError<FamilyCall>(res)
}

export async function familySlots(): Promise<FamilyMember[]> {
  const res = await fetch(`${BASE}/family/slots`, { credentials: 'include' })
  return jsonOrError<FamilyMember[]>(res)
}

export async function familySlotUpdate(
  slotId: number, body: SlotUpdate,
): Promise<FamilyMember> {
  const res = await fetch(`${BASE}/family/slots/${slotId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrError<FamilyMember>(res)
}
