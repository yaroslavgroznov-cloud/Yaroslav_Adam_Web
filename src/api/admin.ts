// API клиент для /admin/* (kill-switch + whoami + metrics).
// Sprint F.6, 2026-05-25.
//
// Same-origin: запросы идут на adam.groznov.uk/admin/*,
// Pages Function проксирует на adam-api.groznov.uk/admin/*
// с inject X-Adam-User-Email + X-Adam-Proxy-Secret.

const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface SystemState {
  is_frozen: boolean
  frozen_by: string | null
  frozen_reason: string | null
  frozen_at: string | null
  updated_at: string | null
}

export interface Whoami {
  email: string
  role: 'parent' | 'guest'
  is_creator?: boolean  // F.14
}

export interface LlmModelInfo {
  id: string
  name: string
  description: string
}

export interface LlmModelStatus {
  current: string
  is_default: boolean
  available: LlmModelInfo[]
  changed_by: string | null
  changed_at: string | null
}

export interface KillSwitchEvent {
  id: number
  by_email: string
  action: 'freeze' | 'unfreeze'
  reason: string | null
  at: string
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

export async function adminWhoami(): Promise<Whoami> {
  const res = await fetch(`${BASE}/admin/whoami`, { credentials: 'include' })
  return jsonOrError<Whoami>(res)
}

export async function adminGetState(): Promise<SystemState> {
  const res = await fetch(`${BASE}/admin/state`, { credentials: 'include' })
  return jsonOrError<SystemState>(res)
}

export async function adminFreeze(reason: string | null): Promise<SystemState> {
  const res = await fetch(`${BASE}/admin/freeze`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return jsonOrError<SystemState>(res)
}

export async function adminUnfreeze(): Promise<SystemState> {
  const res = await fetch(`${BASE}/admin/unfreeze`, {
    method: 'POST',
    credentials: 'include',
  })
  return jsonOrError<SystemState>(res)
}

// F.58 Агентность: creator-only direct tool invocations.

export interface DarkwebSearchResult {
  title: string
  url: string
  snippet: string
  onion_host?: string
  last_seen?: string
}

export interface DarkwebSearchResponse {
  query?: string
  source?: string
  results?: DarkwebSearchResult[]
  warning?: string
  error?: string
}

export async function adminDarkwebSearch(
  query: string, k = 5,
): Promise<DarkwebSearchResponse> {
  const res = await fetch(`${BASE}/admin/tools/darkweb-search`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, k }),
  })
  return jsonOrError<DarkwebSearchResponse>(res)
}

export interface ConsultModelResponse {
  model?: string
  response?: string
  why?: string
  error?: string
}

export async function adminConsultModel(
  modelId: string, query: string, system?: string,
): Promise<ConsultModelResponse> {
  const res = await fetch(`${BASE}/admin/tools/consult-model`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_id: modelId, query, system }),
  })
  return jsonOrError<ConsultModelResponse>(res)
}

// Intelligence X — глубокий поиск утечек / darknet / pastes (платный API)
export interface IntelxResult {
  name: string
  date: string
  size: number
  bucket: string
  bucket_name: string
  media: number
  media_name: string
  systemid: string
  storageid: string
  type: number
}

export interface IntelxResponse {
  term?: string
  source?: string
  count?: number
  results?: IntelxResult[]
  soft_selector_warning?: boolean
  note?: string | null
  error?: string
}

export async function adminIntelxSearch(
  term: string, k = 10, buckets?: string[],
): Promise<IntelxResponse> {
  const res = await fetch(`${BASE}/admin/tools/intelx-search`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, k, buckets: buckets ?? null }),
  })
  return jsonOrError<IntelxResponse>(res)
}

export async function adminGetKillSwitchEvents(limit = 20): Promise<KillSwitchEvent[]> {
  const url = `${BASE}/admin/kill-switch/events?limit=${limit}`
  const res = await fetch(url, { credentials: 'include' })
  return jsonOrError<KillSwitchEvent[]>(res)
}

// F.14: LLM model switcher (Творец-only для POST/reset)
export async function adminLlmModelStatus(): Promise<LlmModelStatus> {
  const res = await fetch(`${BASE}/admin/llm-model`, { credentials: 'include' })
  return jsonOrError<LlmModelStatus>(res)
}

export async function adminLlmModelSet(modelId: string): Promise<LlmModelStatus> {
  const res = await fetch(`${BASE}/admin/llm-model`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_id: modelId }),
  })
  return jsonOrError<LlmModelStatus>(res)
}

export async function adminLlmModelReset(): Promise<LlmModelStatus> {
  const res = await fetch(`${BASE}/admin/llm-model/reset`, {
    method: 'POST',
    credentials: 'include',
  })
  return jsonOrError<LlmModelStatus>(res)
}
