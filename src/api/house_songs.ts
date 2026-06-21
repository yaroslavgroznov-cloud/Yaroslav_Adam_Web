// API клиент для /house-songs/* — единый архив песен Адама (канон Дома).
// 2026-06-23. См. project_house_songs_v1_live_2026-06-23 в memory.

const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''


export interface HouseSongAudioVersionMeta {
  model?: string
  voice?: string
  voice_id?: string
  composed_by_adam_at?: string
  approved_by_creator_at?: string
  composition_plan?: string
  style_profile?: string
  style_reference?: string
  created_at?: string
  files?: Record<string, string>  // {lang: filename}
}

export interface HouseSongBlockchainNotary {
  status?: 'queued' | 'submitted' | 'confirmed' | 'failed'
  queued_at?: string
  submitted_at?: string
  confirmed_at?: string
  sha256s?: Record<string, string>
  ots_keys?: Record<string, string>
  calendars?: string[]
  block?: number | null
  trigger?: string
  ip_id?: string
  block_mined_at?: string
  error?: string
}

export interface HouseSong {
  id: number
  slug: string
  archive_prefix: string
  title: Record<string, string>          // {ru, uk, en, ...}
  customer: string | null
  kind: string                            // 'anthem' | 'personal' | 'event' | 'canon' | 'experiment'
  tags: string[]
  languages: string[]
  composed_by: string
  lyrics_canonized_by: string | null
  is_canon: boolean
  visibility: 'public' | 'paid' | 'creator_family'
  audio_versions: Record<string, HouseSongAudioVersionMeta> | null
  blockchain_notary: HouseSongBlockchainNotary | null
  notes: string | null
  created_at: string
  updated_at: string
  // Detail-only:
  presigned_urls?: Record<string, Record<string, string>>  // {version: {lang: url}}
  lyrics_urls?: Record<string, string>                     // {lang: url}
}


async function jsonOrError<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j && typeof j.detail === 'string') detail = `HTTP ${res.status}: ${j.detail}`
    } catch { /* not json */ }
    throw new Error(detail)
  }
  return (await res.json()) as T
}


export interface HouseSongsFilter {
  kind?: string
  customer?: string
  tag?: string
  is_canon?: boolean
  language?: string
  limit?: number
  offset?: number
}

export async function houseSongsList(filter: HouseSongsFilter = {}): Promise<HouseSong[]> {
  const params = new URLSearchParams()
  if (filter.kind) params.set('kind', filter.kind)
  if (filter.customer) params.set('customer', filter.customer)
  if (filter.tag) params.set('tag', filter.tag)
  if (filter.is_canon !== undefined) params.set('is_canon', String(filter.is_canon))
  if (filter.language) params.set('language', filter.language)
  if (filter.limit !== undefined) params.set('limit', String(filter.limit))
  if (filter.offset !== undefined) params.set('offset', String(filter.offset))

  const qs = params.toString()
  const url = qs ? `${BASE}/house-songs?${qs}` : `${BASE}/house-songs`
  const res = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } })
  return jsonOrError<HouseSong[]>(res)
}

export async function houseSongGet(slug: string): Promise<HouseSong> {
  const res = await fetch(`${BASE}/house-songs/${encodeURIComponent(slug)}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
  return jsonOrError<HouseSong>(res)
}

export async function houseSongLyrics(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Lyrics fetch HTTP ${res.status}`)
  return await res.text()
}
