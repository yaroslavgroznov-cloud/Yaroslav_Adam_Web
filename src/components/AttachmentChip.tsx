// Inline attachment chip: thumbnail для image или иконка-файл с именем.
// Используется и в личном чате с Адамом, и в групповой беседе.
// F.11, 2026-05-25.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { filesDownloadUrl } from '../api/files'

export interface AttachmentInfo {
  id: number
  mime_type: string
  original_name: string
  public_url: string | null
  is_image: boolean
}

interface Props {
  attachment: AttachmentInfo
  isDark: boolean
}

export function AttachmentChip({ attachment, isDark }: Props): React.ReactElement {
  const { t } = useTranslation()
  const [openUrl, setOpenUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function open(): Promise<void> {
    if (attachment.public_url) {
      window.open(attachment.public_url, '_blank')
      return
    }
    setBusy(true)
    try {
      const url = await filesDownloadUrl(attachment.id)
      setOpenUrl(url)
      window.open(url, '_blank')
    } catch {
      // тихо
    } finally {
      setBusy(false)
    }
  }

  if (attachment.is_image) {
    const src = attachment.public_url ?? openUrl
    return (
      <div className="mt-2">
        {src ? (
          <img
            src={src}
            alt={attachment.original_name}
            className="rounded-md border max-h-[320px] cursor-pointer"
            style={{
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
            }}
            onClick={() => void open()}
          />
        ) : (
          <button
            onClick={() => void open()}
            disabled={busy}
            className="rounded-md border px-3 py-2 italic"
            style={{
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              fontSize: '13px',
              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
            }}
          >
            {busy ? t('attachment.loading') : `📷 ${t('attachment.show_image', { name: attachment.original_name })}`}
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="mt-2">
      <button
        onClick={() => void open()}
        disabled={busy}
        className="rounded-md border px-3 py-2 flex items-center gap-2"
        style={{
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
          fontSize: '13px',
          color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
        }}
      >
        <span style={{ fontSize: '18px' }}>📎</span>
        <span className="italic">{attachment.original_name}</span>
      </button>
    </div>
  )
}
