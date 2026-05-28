// API клиент для /cabinets/* и /payments/* — F.41+F.42, 2026-05-28.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface Cabinet {
  slug: string
  name: string
  description: string | null
  intake_form: { fields?: Array<{
    name: string
    label: string
    type: string
    required?: boolean
    options?: string[]
  }> } | null
  price_usd_session: number
  price_usd_subscription_monthly: number | null
  is_active: boolean
}

export interface CabinetSession {
  id: number
  cabinet_slug: string
  user_email: string
  intake_data: Record<string, unknown> | null
  payment_status: string
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface CabinetChatResponse {
  reply: string
  session_id: number
}

export interface PaymentInitiateResp {
  id: number
  status: string
  provider: string
  amount_usd: number
  next_action: Record<string, unknown> | null
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

export async function cabinetsList(): Promise<Cabinet[]> {
  const res = await fetch(`${BASE}/cabinets`, { credentials: 'include' })
  return jsonOrError<Cabinet[]>(res)
}

export async function cabinetSessionCreate(
  cabinetSlug: string, intakeData: Record<string, unknown> | null = null,
): Promise<CabinetSession> {
  const res = await fetch(`${BASE}/cabinets/sessions`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cabinet_slug: cabinetSlug, intake_data: intakeData }),
  })
  return jsonOrError<CabinetSession>(res)
}

export async function cabinetChat(
  sessionId: number, content: string,
): Promise<CabinetChatResponse> {
  const res = await fetch(`${BASE}/cabinets/sessions/${sessionId}/chat`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  return jsonOrError<CabinetChatResponse>(res)
}

export async function paymentInitiate(opts: {
  kind: 'task' | 'cabinet_session' | 'subscription' | 'topup'
  provider: 'stripe' | 'crypto_trc20' | 'crypto_sol' | 'crypto_btc'
  amount_usd: number
  task_id?: number
  cabinet_session_id?: number
}): Promise<PaymentInitiateResp> {
  const res = await fetch(`${BASE}/payments/initiate`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  })
  return jsonOrError<PaymentInitiateResp>(res)
}
