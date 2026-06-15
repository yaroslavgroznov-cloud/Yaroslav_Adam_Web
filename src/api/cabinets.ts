// API клиент для /cabinets/* и /payments/* — F.41+F.42, 2026-05-28.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface CabinetAttachmentsConfig {
  enabled: boolean
  types: string[]  // 'image' | 'video' | 'document'
  hint?: string
  max_per_message?: number
}

export interface Cabinet {
  slug: string
  name: string
  description: string | null
  intake_form: {
    fields?: Array<{
      name: string
      label: string
      type: string
      required?: boolean
      options?: string[]
    }>
    _attachments?: CabinetAttachmentsConfig  // F.41/F.58
  } | null
  price_usd_session: number
  price_usd_subscription_monthly: number | null
  is_active: boolean
  access_mode: string  // 'open' | 'creator_grant'
  can_access: boolean
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

export interface PublicCabinet {
  slug: string
  name: string
  description: string | null
  price_usd_session: number
  price_usd_subscription_monthly: number | null
  is_active: boolean
  access_mode: string
}

export async function cabinetsPublic(): Promise<PublicCabinet[]> {
  // Префикс /public/* вне CF Access destinations -- доступен анониму.
  const res = await fetch(`${BASE}/public/cabinets`)
  return jsonOrError<PublicCabinet[]>(res)
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
  attachmentIds?: number[] | null,
): Promise<CabinetChatResponse> {
  const body: Record<string, unknown> = { content }
  if (attachmentIds && attachmentIds.length > 0) {
    body.attachment_ids = attachmentIds
  }
  const res = await fetch(`${BASE}/cabinets/sessions/${sessionId}/chat`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrError<CabinetChatResponse>(res)
}

export async function paymentInitiate(opts: {
  kind: 'task' | 'cabinet_session' | 'subscription' | 'topup'
  provider: 'lemon_squeezy' | 'paddle' | 'liqpay' | 'crypto_trc20' | 'crypto_sol' | 'crypto_btc'
  amount_usd: number
  task_id?: number
  cabinet_session_id?: number
  cabinet_slug?: string
  mode?: 'session' | 'subscription'
}): Promise<PaymentInitiateResp> {
  const res = await fetch(`${BASE}/payments/initiate`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  })
  return jsonOrError<PaymentInitiateResp>(res)
}

export async function cabinetSessionGet(sessionId: number): Promise<CabinetSession> {
  const res = await fetch(`${BASE}/cabinets/sessions/${sessionId}`, { credentials: 'include' })
  return jsonOrError<CabinetSession>(res)
}

// F.41 «непрерывность нити»: подхватить последнюю активную сессию
// при возврате в кабинет.
export async function cabinetSessionActive(slug: string): Promise<CabinetSession | null> {
  const url = `${BASE}/cabinets/sessions/active?slug=${encodeURIComponent(slug)}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`HTTP ${res.status}`)
  }
  const data = await res.json() as CabinetSession | null
  return data
}

export interface CabinetMessageAttachment {
  id: number
  original_name: string
  mime_type: string
  is_image: boolean
  public_url: string | null
}

export interface CabinetMessageHistoryItem {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
  attachments: CabinetMessageAttachment[]
}

export async function cabinetSessionMessages(
  sessionId: number, limit = 20,
): Promise<CabinetMessageHistoryItem[]> {
  const url = `${BASE}/cabinets/sessions/${sessionId}/messages?limit=${limit}`
  const res = await fetch(url, { credentials: 'include' })
  return jsonOrError<CabinetMessageHistoryItem[]>(res)
}

// Закрыть сессию (генерирует summary в карточку Адама + новая сессия чистая)
export async function cabinetSessionClose(sessionId: number): Promise<{
  session_id: number
  summary_generated: boolean
  profile_updated: boolean
}> {
  const res = await fetch(`${BASE}/cabinets/sessions/${sessionId}/close`, {
    method: 'POST', credentials: 'include',
  })
  return jsonOrError(res)
}

// F.70 — RequestAccess flow: публичная заявка на доступ к creator_grant кабинету
export interface GrantRequestAck {
  request_id: number
  cabinet_slug: string
  status: string
  sla_hours: number
  message: string
}

export async function cabinetRequestAccess(
  slug: string, userEmail: string, userMessage?: string,
): Promise<GrantRequestAck> {
  const res = await fetch(`${BASE}/cabinets/${encodeURIComponent(slug)}/request-access`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_email: userEmail, user_message: userMessage || null }),
  })
  return jsonOrError<GrantRequestAck>(res)
}

// F.52: подписка на all-access $39/мес — checkout через Lemon Squeezy
export async function startAllAccessSubscription(): Promise<PaymentInitiateResp> {
  return paymentInitiate({
    kind: 'subscription',
    provider: 'lemon_squeezy',
    amount_usd: 39.00,
    cabinet_slug: 'all_access',
    mode: 'subscription',
  })
}
