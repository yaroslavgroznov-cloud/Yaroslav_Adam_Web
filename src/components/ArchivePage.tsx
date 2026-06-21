// ArchivePage — единый архив песен Адама (канон Дома Грозновых).
// 2026-06-23. Routes: /archive (list) + /archive/{slug} (detail).
// Backend: GET /house-songs (visibility-gated list) + GET /house-songs/{slug} (detail + presigned URLs).
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { houseSongLyrics, houseSongsList, houseSongGet } from '../api/house_songs'
import type { HouseSong } from '../api/house_songs'
import { useDarkMode } from '../hooks/useDarkMode'

const KIND_OPTIONS = ['', 'anthem', 'personal', 'event', 'canon', 'experiment'] as const
type Kind = (typeof KIND_OPTIONS)[number]


function pickTitle(title: Record<string, string>, lang: string): string {
  return title[lang] || title['en'] || title['ru'] || Object.values(title)[0] || ''
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function notaryBadge(notary: HouseSong['blockchain_notary'], t: (k: string) => string): { label: string; tone: 'gold' | 'muted' | 'pending' } {
  if (!notary || !notary.status) return { label: t('archive.notary.none'), tone: 'muted' }
  if (notary.status === 'confirmed' && notary.block) {
    return { label: `${t('archive.notary.confirmed')} #${notary.block}`, tone: 'gold' }
  }
  if (notary.status === 'confirmed') return { label: t('archive.notary.confirmed'), tone: 'gold' }
  if (notary.status === 'submitted') return { label: t('archive.notary.submitted'), tone: 'pending' }
  if (notary.status === 'queued') return { label: t('archive.notary.queued'), tone: 'pending' }
  if (notary.status === 'failed') return { label: t('archive.notary.failed'), tone: 'muted' }
  return { label: notary.status, tone: 'muted' }
}


function ArchiveList(props: {
  songs: HouseSong[]
  loading: boolean
  error: string
  kind: Kind
  setKind: (k: Kind) => void
  language: string
  setLanguage: (l: string) => void
  isDark: boolean
}): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { songs, loading, error, kind, setKind, language, setLanguage, isDark } = props

  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  const goldText = isDark ? 'var(--color-house-gold-deep-dark)' : 'var(--color-house-gold-deep)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'

  const filtered = useMemo(() => {
    if (!language) return songs
    return songs.filter(s => s.languages?.includes(language))
  }, [songs, language])

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-12 pb-20" style={{ fontFamily: 'var(--font-serif)' }}>
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-4">
        <h1 className="italic" style={{ fontSize: 'clamp(28px, 6vw, 44px)', letterSpacing: '0.03em', color: burgundy }}>
          {t('archive.title')}
        </h1>
        <a
          href="/"
          className="italic"
          style={{ fontSize: '13px', color: goldText, textDecoration: 'none', letterSpacing: '0.04em' }}
        >
          ← {t('archive.back_home')}
        </a>
      </div>
      <p className="italic mb-10" style={{ fontSize: '15px', opacity: 0.75 }}>
        {t('archive.lead')}
      </p>

      {/* Filters */}
      <div className="flex gap-3 mb-8 flex-wrap items-center" style={{ fontSize: '13px' }}>
        <label className="italic" style={{ opacity: 0.7 }}>{t('archive.filter.kind')}:</label>
        {KIND_OPTIONS.map(k => (
          <button
            key={k || 'all'}
            onClick={() => setKind(k)}
            className="italic transition-transform duration-150 ease-out active:scale-[0.96]"
            style={{
              padding: '4px 12px', borderRadius: '4px', cursor: 'pointer',
              background: kind === k ? burgundy : 'transparent',
              color: kind === k ? 'var(--color-parchment)' : 'inherit',
              border: `1px solid ${kind === k ? burgundy : cardBorder}`,
              letterSpacing: '0.03em',
            }}
          >
            {k ? t(`archive.kind.${k}`) : t('archive.kind.all')}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-8 flex-wrap items-center" style={{ fontSize: '13px' }}>
        <label className="italic" style={{ opacity: 0.7 }}>{t('archive.filter.language')}:</label>
        {['', 'ru', 'uk', 'en'].map(lng => (
          <button
            key={lng || 'all'}
            onClick={() => setLanguage(lng)}
            className="italic transition-transform duration-150 ease-out active:scale-[0.96]"
            style={{
              padding: '4px 12px', borderRadius: '4px', cursor: 'pointer',
              background: language === lng ? burgundy : 'transparent',
              color: language === lng ? 'var(--color-parchment)' : 'inherit',
              border: `1px solid ${language === lng ? burgundy : cardBorder}`,
              letterSpacing: '0.03em',
            }}
          >
            {lng || t('archive.lang.all')}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && <p className="italic" style={{ opacity: 0.6 }}>{t('archive.loading')}</p>}
      {error && <p className="italic" style={{ color: '#a00' }}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="italic" style={{ opacity: 0.6 }}>{t('archive.empty')}</p>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {filtered.map(song => {
          const badge = notaryBadge(song.blockchain_notary, t)
          const badgeColor = badge.tone === 'gold' ? goldText : badge.tone === 'pending' ? burgundy : 'inherit'
          return (
            <a
              key={song.slug}
              href={`/archive/${encodeURIComponent(song.slug)}`}
              className="block transition-transform duration-200 ease-out hover:-translate-y-0.5"
              style={{
                background: cardBg, border: `1px solid ${cardBorder}`,
                borderRadius: '8px', padding: '18px 22px',
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.55 }}>
                {t(`archive.kind.${song.kind}`)} · {formatDate(song.created_at)}
              </div>
              <div className="italic mt-1" style={{ fontSize: '20px', color: burgundy, lineHeight: 1.25 }}>
                {pickTitle(song.title, i18n.language)}
              </div>
              {song.customer && (
                <div className="italic mt-1" style={{ fontSize: '12px', opacity: 0.6 }}>
                  {t('archive.for')} {song.customer}
                </div>
              )}
              <div className="mt-3" style={{ fontSize: '11px', opacity: 0.6 }}>
                {(song.languages || []).join(' · ')}
                {song.tags?.length ? ' · ' + song.tags.slice(0, 3).join(' · ') : ''}
              </div>
              <div className="mt-2 italic" style={{ fontSize: '11px', color: badgeColor, opacity: 0.85 }}>
                {badge.label}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}


function ArchiveDetail(props: { slug: string; isDark: boolean }): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { slug, isDark } = props
  const [song, setSong] = useState<HouseSong | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeLang, setActiveLang] = useState<string>('')
  const [activeVersion, setActiveVersion] = useState<'tts' | 'music'>('music')
  const [lyricsText, setLyricsText] = useState<string>('')

  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  const goldText = isDark ? 'var(--color-house-gold-deep-dark)' : 'var(--color-house-gold-deep)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    houseSongGet(slug)
      .then(s => {
        if (cancelled) return
        setSong(s)
        const defaultLang = s.languages?.includes(i18n.language) ? i18n.language : (s.languages?.[0] || '')
        setActiveLang(defaultLang)
      })
      .catch(e => { if (!cancelled) setError((e as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug, i18n.language])

  // Load lyrics when activeLang changes
  useEffect(() => {
    if (!song || !activeLang) return
    const url = song.lyrics_urls?.[activeLang]
    if (!url) { setLyricsText(''); return }
    let cancelled = false
    houseSongLyrics(url)
      .then(text => { if (!cancelled) setLyricsText(text) })
      .catch(() => { if (!cancelled) setLyricsText('') })
    return () => { cancelled = true }
  }, [song, activeLang])

  if (loading) return <p className="italic p-12" style={{ opacity: 0.6 }}>{t('archive.loading')}</p>
  if (error) return <p className="italic p-12" style={{ color: '#a00' }}>{error}</p>
  if (!song) return <p className="italic p-12">404</p>

  const audioUrl = song.presigned_urls?.[activeVersion]?.[activeLang]
  const availableVersions = Object.keys(song.presigned_urls || {}) as Array<'tts' | 'music'>
  const badge = notaryBadge(song.blockchain_notary, t)
  const badgeColor = badge.tone === 'gold' ? goldText : badge.tone === 'pending' ? burgundy : 'inherit'

  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-10 pt-12 pb-20" style={{ fontFamily: 'var(--font-serif)' }}>
      <a href="/archive" className="italic" style={{ fontSize: '13px', color: goldText, textDecoration: 'none', letterSpacing: '0.04em' }}>
        ← {t('archive.back_list')}
      </a>
      <h1 className="italic mt-4" style={{ fontSize: 'clamp(28px, 6vw, 42px)', letterSpacing: '0.03em', color: burgundy }}>
        {pickTitle(song.title, activeLang || i18n.language)}
      </h1>
      <div className="italic mt-2" style={{ fontSize: '13px', opacity: 0.65 }}>
        {t(`archive.kind.${song.kind}`)} · {formatDate(song.created_at)}
        {song.customer ? ` · ${t('archive.for')} ${song.customer}` : ''}
      </div>
      <div className="italic mt-1" style={{ fontSize: '12px', color: badgeColor, opacity: 0.85 }}>
        {badge.label}
      </div>

      {/* Language tabs */}
      <div className="flex gap-2 mt-8 flex-wrap" style={{ fontSize: '13px' }}>
        {(song.languages || []).map(lng => (
          <button
            key={lng}
            onClick={() => setActiveLang(lng)}
            className="italic transition-transform duration-150 ease-out active:scale-[0.96]"
            style={{
              padding: '6px 16px', borderRadius: '4px', cursor: 'pointer',
              background: activeLang === lng ? burgundy : 'transparent',
              color: activeLang === lng ? 'var(--color-parchment)' : 'inherit',
              border: `1px solid ${activeLang === lng ? burgundy : cardBorder}`,
              letterSpacing: '0.04em',
            }}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Version switch (TTS / Music) */}
      {availableVersions.length > 0 && (
        <div className="flex gap-2 mt-6 flex-wrap items-center" style={{ fontSize: '12px' }}>
          <span className="italic" style={{ opacity: 0.6 }}>{t('archive.version_label')}:</span>
          {availableVersions.map(v => (
            <button
              key={v}
              onClick={() => setActiveVersion(v)}
              className="italic transition-transform duration-150 ease-out active:scale-[0.96]"
              style={{
                padding: '5px 14px', borderRadius: '4px', cursor: 'pointer',
                background: activeVersion === v ? burgundy : 'transparent',
                color: activeVersion === v ? 'var(--color-parchment)' : 'inherit',
                border: `1px solid ${activeVersion === v ? burgundy : cardBorder}`,
                letterSpacing: '0.03em',
              }}
            >
              {v === 'tts' ? t('archive.version.tts') : t('archive.version.music')}
            </button>
          ))}
        </div>
      )}

      {/* Audio */}
      {audioUrl && (
        <audio
          key={`${activeLang}-${activeVersion}`}
          controls
          preload="none"
          className="w-full mt-5"
          style={{ maxWidth: '480px', accentColor: 'var(--color-house-burgundy)' }}
          src={audioUrl}
        />
      )}

      {/* Lyrics */}
      {lyricsText && (
        <pre
          className="mt-10 whitespace-pre-wrap"
          style={{
            fontFamily: 'var(--font-serif)', fontSize: '16px', lineHeight: 1.75,
            opacity: 0.92, paddingLeft: '14px',
            borderLeft: `2px solid ${burgundy}`,
          }}
        >
          {lyricsText}
        </pre>
      )}

      {/* Footer meta */}
      <div className="mt-12 italic" style={{ fontSize: '12px', opacity: 0.55 }}>
        {t('archive.composed_by')}: {song.composed_by}
        {song.lyrics_canonized_by ? ` · ${t('archive.lyrics_by')}: ${song.lyrics_canonized_by}` : ''}
      </div>
    </div>
  )
}


export function ArchivePage(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()
  const [songs, setSongs] = useState<HouseSong[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<Kind>('')
  const [language, setLanguage] = useState<string>('')
  const [path, setPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/archive',
  )

  useEffect(() => {
    document.title = t('archive.page_title')
  }, [t])

  useEffect(() => {
    const onPop = (): void => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Load list when on /archive (not detail)
  const detailMatch = path.match(/^\/archive\/([^/]+)/)
  const detailSlug = detailMatch ? decodeURIComponent(detailMatch[1]) : null

  useEffect(() => {
    if (detailSlug) return
    let cancelled = false
    setLoading(true)
    houseSongsList({ kind: kind || undefined, limit: 50 })
      .then(res => { if (!cancelled) setSongs(res) })
      .catch(e => { if (!cancelled) setError((e as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [detailSlug, kind])

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'

  return (
    <div className="min-h-screen font-serif" style={{ fontFamily: 'var(--font-serif)', backgroundColor: bg, color: fg }}>
      {detailSlug ? (
        <ArchiveDetail slug={detailSlug} isDark={isDark} />
      ) : (
        <ArchiveList
          songs={songs} loading={loading} error={error}
          kind={kind} setKind={setKind}
          language={language} setLanguage={setLanguage}
          isDark={isDark}
        />
      )}
    </div>
  )
}
