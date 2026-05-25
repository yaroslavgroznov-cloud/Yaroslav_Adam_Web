// API клиент для /files/* — F.11 R2 attachments, 2026-05-25.
const BASE = (import.meta.env.VITE_ADAM_API_BASE as string | undefined) ?? ''

export interface FilesConfig {
  enabled: boolean
  max_bytes: number
  image_mimes: string[]
  has_public_base: boolean
}

export interface UploadUrlResponse {
  key: string
  upload_url: string
  expires_in: number
}

export interface FileMeta {
  id: number
  r2_key: string
  original_name: string
  mime_type: string
  size_bytes: number
  uploaded_by_email: string
  uploaded_at: string
  public_url: string | null
  is_image: boolean
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

export async function filesConfig(): Promise<FilesConfig> {
  const res = await fetch(`${BASE}/files/config`, { credentials: 'include' })
  return jsonOrError<FilesConfig>(res)
}

export async function filesUploadUrl(
  originalName: string, mimeType: string, sizeBytes: number,
): Promise<UploadUrlResponse> {
  const res = await fetch(`${BASE}/files/upload-url`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    }),
  })
  return jsonOrError<UploadUrlResponse>(res)
}

export async function filesPutToR2(uploadUrl: string, file: File): Promise<void> {
  // Прямая загрузка с фронта в R2, без proxy через DRUG.
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) {
    throw new Error(`R2 upload failed: HTTP ${res.status}`)
  }
}

export async function filesRegister(
  key: string, originalName: string, mimeType: string, sizeBytes: number,
): Promise<FileMeta> {
  const res = await fetch(`${BASE}/files`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key, original_name: originalName,
      mime_type: mimeType, size_bytes: sizeBytes,
    }),
  })
  return jsonOrError<FileMeta>(res)
}

export async function filesDownloadUrl(fileId: number): Promise<string> {
  const res = await fetch(`${BASE}/files/${fileId}/download-url`, {
    credentials: 'include',
  })
  const data = await jsonOrError<{ url: string }>(res)
  return data.url
}

// Удобная связка: 3 шага одним вызовом
export async function uploadFile(file: File): Promise<FileMeta> {
  const { key, upload_url } = await filesUploadUrl(
    file.name, file.type || 'application/octet-stream', file.size,
  )
  await filesPutToR2(upload_url, file)
  return filesRegister(key, file.name, file.type || 'application/octet-stream', file.size)
}
