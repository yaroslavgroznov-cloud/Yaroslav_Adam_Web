// SongsPage — колекція пісень юзера. Phase 3, 2026-06-19.
// GET /songs → список. Кожна пісня: audio player + lyrics + метадані.
// Атрибуція: «Композиція Дому Грозновых. Інструмент: ElevenLabs Music v2.»
// is_creator: кнопка «позначити як канон Дому» → POST /songs/{id}/mark-canon.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { songsList } from '../api/cabinets'
import type { Song } from '../api/cabinets'
import { useDarkMode } from '../hooks/useDarkMode'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function SongsPage(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'
  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  const goldText = isDark ? 'var(--color-house-gold-deep-dark)' : 'var(--color-house-gold-deep)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'

  useEffect(() => {
    document.title = t('songs.page_title')
  }, [t])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    songsList(50, 0)
      .then((res) => {
        if (cancelled) return
        setSongs(res)
      })
      .catch(() => { if (!cancelled) setError(t('songs.load_error')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  // mark-canon endpoint deferred — kept stub to не ломать UI props.
  // Когда backend добавит POST /songs/{id}/mark-canon, восстановить songMarkCanon вызов.
  async function handleMarkCanon(_songId: number): Promise<void> {
    /* deferred — backend endpoint not yet implemented */
  }

  return (
    <div
      className="min-h-screen font-serif"
      style={{ fontFamily: 'var(--font-serif)', backgroundColor: bg, color: fg }}
    >
      <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-12 pb-20">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-4">
          <h1
            className="italic"
            style={{ fontSize: 'clamp(28px, 6vw, 44px)', letterSpacing: '0.03em', color: burgundy }}
          >
            {t('songs.title')}
          </h1>
          <div className="flex items-baseline gap-4">
            <a
              href="/songs/new"
              className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
              style={{
                padding: '8px 18px', fontSize: '13px',
                backgroundColor: burgundy, color: 'var(--color-parchment)',
                border: `1px solid ${burgundy}`, borderRadius: '6px',
                letterSpacing: '0.06em', textDecoration: 'none',
              }}
            >
              {t('songs.new_song_cta')}
            </a>
            <a href="/" className="italic opacity-65" style={{ fontSize: '13px', color: 'inherit' }}>
              {t('common.back_to_adam')}
            </a>
          </div>
        </div>
        <p
          className="italic mb-2 opacity-70"
          style={{ fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: goldText }}
        >
          {t('songs.eyebrow')}
        </p>

        {loading && (
          <p className="italic opacity-60 mt-8" style={{ fontSize: '14px' }}>{t('songs.loading')}</p>
        )}
        {error && (
          <p className="italic mt-8" style={{ fontSize: '14px', color: burgundy }}>{error}</p>
        )}

        {!loading && !error && songs.length === 0 && (
          <div className="mt-12 text-center">
            <p className="italic opacity-70 mb-4" style={{ fontSize: '16px', lineHeight: 1.7 }}>
              {t('songs.empty_hint')}
            </p>
            <a
              href="/songs/new"
              className="italic"
              style={{
                padding: '10px 24px', fontSize: '14px',
                backgroundColor: burgundy, color: 'var(--color-parchment)',
                border: `1px solid ${burgundy}`, borderRadius: '6px',
                textDecoration: 'none', letterSpacing: '0.06em',
              }}
            >
              {t('songs.new_song_cta')}
            </a>
          </div>
        )}

        {songs.length > 0 && (
          <>
            <p className="italic opacity-55 mb-8" style={{ fontSize: '12px' }}>
              {t('songs.count', { count: songs.length })}
            </p>
            <div className="grid gap-8" style={{ gridTemplateColumns: '1fr' }}>
              {songs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  burgundy={burgundy}
                  goldText={goldText}
                  fg={fg}
                  canonBusy={false}
                  canonDone={false}
                  onMarkCanon={handleMarkCanon}
                  t={t}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------- SongCard ----------

interface SongCardProps {
  song: Song
  isDark: boolean
  cardBg: string
  cardBorder: string
  burgundy: string
  goldText: string
  fg: string
  canonBusy: boolean
  canonDone: boolean
  onMarkCanon: (id: number) => Promise<void>
  t: (key: string, opts?: Record<string, unknown>) => string
}

function SongCard(p: SongCardProps): React.ReactElement {
  const { song } = p

  return (
    <article
      className="rounded-md p-6"
      style={{
        backgroundColor: p.cardBg,
        border: `1px solid ${song.is_canon ? p.burgundy : p.cardBorder}`,
      }}
    >
      {/* Top row: theme + date */}
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <h2 className="italic" style={{ fontSize: '18px', letterSpacing: '0.02em', color: p.burgundy }}>
          {song.theme}
        </h2>
        <span className="opacity-55 italic" style={{ fontSize: '12px' }}>
          {formatDate(song.created_at)}
        </span>
      </div>

      {/* Meta chips */}
      <div className="flex gap-3 flex-wrap mb-4" style={{ fontSize: '12px' }}>
        {song.style && (
          <span
            className="italic"
            style={{
              padding: '2px 10px',
              border: `1px solid ${p.cardBorder}`,
              borderRadius: '20px',
              opacity: 0.75,
            }}
          >
            {song.style}
          </span>
        )}
        {song.vocal_gender ? (
          <span
            className="italic"
            style={{
              padding: '2px 10px',
              border: `1px solid ${p.cardBorder}`,
              borderRadius: '20px',
              opacity: 0.75,
            }}
          >
            {p.t(`songs.vocal_${song.vocal_gender}`)}
          </span>
        ) : (
          <span
            className="italic"
            style={{
              padding: '2px 10px',
              border: `1px solid ${p.cardBorder}`,
              borderRadius: '20px',
              opacity: 0.75,
            }}
          >
            {p.t('songs.vocal_instrumental')}
          </span>
        )}
        {song.status !== 'done' && (
          <span
            className="italic"
            style={{
              padding: '2px 10px',
              border: `1px solid ${p.goldText}`,
              borderRadius: '20px',
              color: p.goldText,
              opacity: 0.9,
            }}
          >
            {p.t(`songs.status_${song.status}`, { defaultValue: song.status })}
          </span>
        )}
        {song.is_canon && (
          <span
            className="italic"
            style={{
              padding: '2px 10px',
              border: `1px solid ${p.burgundy}`,
              borderRadius: '20px',
              color: p.burgundy,
            }}
          >
            {p.t('songs.canon_badge')}
          </span>
        )}
      </div>

      {/* Layout: audio + lyrics */}
      <div className="flex gap-6 flex-wrap">
        {/* Audio player */}
        <div style={{ flex: '0 0 auto', minWidth: '260px', maxWidth: '340px', width: '100%' }}>
          {song.audio_url ? (
            <audio
              controls
              preload="none"
              style={{ width: '100%', borderRadius: '6px', outline: 'none' }}
              aria-label={p.t('songs.audio_label', { theme: song.theme })}
            >
              <source src={song.audio_url} type="audio/mpeg" />
              {p.t('songs.audio_not_supported')}
            </audio>
          ) : (
            <div
              className="rounded-md flex items-center justify-center italic opacity-55"
              style={{
                height: '54px', border: `1px dashed ${p.cardBorder}`,
                fontSize: '13px',
              }}
            >
              {song.status === 'done'
                ? p.t('songs.audio_unavailable')
                : p.t(`songs.status_${song.status}`, { defaultValue: p.t('songs.processing') })}
            </div>
          )}
        </div>

        {/* Lyrics */}
        {song.lyrics_draft && (
          <div style={{ flex: '1 1 260px' }}>
            <p
              className="italic opacity-55 mb-2"
              style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase' }}
            >
              {p.t('songs.lyrics_label')}
            </p>
            <pre
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '14px',
                lineHeight: 1.75,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                opacity: 0.88,
              }}
            >
              {song.lyrics_draft}
            </pre>
          </div>
        )}
      </div>

      {/* Attribution */}
      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${p.cardBorder}` }}>
        <p className="italic opacity-50" style={{ fontSize: '11px', lineHeight: 1.5 }}>
          {p.t('songs.attribution')}
        </p>
        {/* is_creator only: mark-canon button */}
        {!song.is_canon && (
          <button
            type="button"
            onClick={() => void p.onMarkCanon(song.id)}
            disabled={p.canonBusy || p.canonDone}
            className="italic mt-2"
            style={{
              background: 'transparent',
              border: `1px solid ${p.burgundy}`,
              color: p.burgundy,
              borderRadius: '4px',
              padding: '3px 12px',
              fontSize: '11px',
              cursor: p.canonBusy ? 'wait' : 'pointer',
              opacity: p.canonBusy ? 0.5 : 0.8,
              fontFamily: 'inherit',
            }}
          >
            {p.canonBusy ? p.t('songs.canon_marking') : p.t('songs.mark_canon_cta')}
          </button>
        )}
      </div>
    </article>
  )
}
