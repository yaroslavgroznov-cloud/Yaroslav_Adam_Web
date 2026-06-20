// SongNewPage — 8-шаговый мастер создания песни. Phase 3, 2026-06-19.
// Шаги: тема → lyrics_draft (iterate) → жанр → вокал → preview → готово.
// После завершения — redirect на /songs.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  songStart, songGet, songAccept, songRevise, songSynthesize,
} from '../api/cabinets'
import type { Song, VocalGender } from '../api/cabinets'
import { useDarkMode } from '../hooks/useDarkMode'

type VocalType = VocalGender | 'instrumental'

// 20 жанров из README
const GENRE_LIST = [
  'lyric', 'jazz', 'blues', 'rock_n_roll', 'disco', 'metal',
  'chanson', 'folk_ua', 'folk_ru', 'ballad', 'hymn', 'romance',
  'rap', 'pop', 'country', 'electronica', 'classical', 'folk', 'reggae', 'bard',
]

type Step = 1 | 2 | 3 | 4 | 5 | 6

function navigate(path: string): void {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function SongNewPage(): React.ReactElement {
  const { t } = useTranslation()
  const { isDark } = useDarkMode()

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'
  const burgundy = isDark ? 'var(--color-house-burgundy-light)' : 'var(--color-house-burgundy)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const accent = isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)'

  const [step, setStep] = useState<Step>(1)
  const [song, setSong] = useState<Song | null>(null)
  const [theme, setTheme] = useState('')
  const [lineEdit, setLineEdit] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [vocalType, setVocalType] = useState<VocalType>('mixed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [regenUsed, setRegenUsed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.title = t('song_new.page_title')
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [t])

  // Poll until song is out of a transitional status
  const pollUntilReady = useCallback(async (id: number, targetStatuses: string[]): Promise<Song> => {
    return new Promise((resolve, reject) => {
      const check = async (): Promise<void> => {
        try {
          const s = await songGet(id)
          if (targetStatuses.includes(s.status) || s.status === 'failed') {
            resolve(s)
          } else {
            pollRef.current = setTimeout(() => void check(), 2500)
          }
        } catch (e) {
          reject(e)
        }
      }
      void check()
    })
  }, [])

  // Step 1: submit theme — backend uses default style 'ballad' до выбора жанра.
  // Когда юзер выберет жанр (step 3), отправляем revise с pinpoint feedback.
  async function handleThemeSubmit(): Promise<void> {
    if (theme.trim().length < 5) return
    setBusy(true); setError('')
    try {
      const created = await songStart({ theme: theme.trim() })
      const ready = await pollUntilReady(created.id, ['lyrics_draft'])
      setSong(ready)
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error', { defaultValue: 'Error' }))
    } finally {
      setBusy(false)
    }
  }

  // Step 2: accept lyrics или попросить переписать
  async function handleIterate(action: 'accept' | 'rewrite' | 'edit_line'): Promise<void> {
    if (!song) return
    setBusy(true); setError('')
    try {
      if (action === 'accept') {
        const updated = await songAccept(song.id)
        setSong(updated)
        setStep(3)
        return
      }
      const feedback = action === 'edit_line'
        ? `Перепиши строку: «${lineEdit}» — улучши её, сохрани смысл и метрику.`
        : 'Перепиши целиком — попробуй другой угол к этой теме.'
      const updated = await songRevise(song.id, feedback)
      const ready = await pollUntilReady(updated.id, ['lyrics_draft'])
      setSong(ready)
      setLineEdit('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error', { defaultValue: 'Error' }))
    } finally {
      setBusy(false)
    }
  }

  // Step 3+4: жанр + вокал → revise с гoptionsx параметрами → synthesize
  async function handleGenreSubmit(): Promise<void> {
    if (!song || !selectedGenre) return
    setBusy(true); setError('')
    try {
      // Сначала revise чтобы lyrics адаптировались под выбранный жанр.
      const vocalDescription = vocalType === 'instrumental'
        ? 'без вокала, инструментал'
        : `с ${vocalType === 'male' ? 'мужским' : vocalType === 'female' ? 'женским' : 'смешанным'} вокалом`
      const feedback = `Адаптируй lyrics под жанр «${selectedGenre}» ${vocalDescription}. Сохрани центральный образ.`
      await songRevise(song.id, feedback)
      // Сразу запускаем synthesize — backend выберет ElevenLabs Music v2.
      const synth = await songSynthesize(song.id)
      const ready = await pollUntilReady(synth.id, ['done'])
      setSong(ready)
      setStep(5)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error', { defaultValue: 'Error' }))
    } finally {
      setBusy(false)
    }
  }

  // Step 5: «попробовать ещё вариант» — revise + новый synthesize
  async function handleRegen(): Promise<void> {
    if (!song || regenUsed) return
    setBusy(true); setError('')
    try {
      await songRevise(song.id, 'Попробуй другой вариант композиции — сохрани тему и жанр.')
      const synth = await songSynthesize(song.id)
      const ready = await pollUntilReady(synth.id, ['done'])
      setSong(ready)
      setRegenUsed(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error', { defaultValue: 'Error' }))
    } finally {
      setBusy(false)
    }
  }

  // Step 5 → 6: accept final (просто перейти на done — backend уже отметил done)
  async function handleAccept(): Promise<void> {
    if (!song) return
    setStep(6)
  }

  const stepLabels: Record<Step, string> = {
    1: t('song_new.step_theme'),
    2: t('song_new.step_lyrics'),
    3: t('song_new.step_genre'),
    4: t('song_new.step_vocal'),
    5: t('song_new.step_preview'),
    6: t('song_new.step_done'),
  }

  return (
    <div
      className="min-h-screen font-serif"
      style={{ fontFamily: 'var(--font-serif)', backgroundColor: bg, color: fg }}
    >
      <div className="max-w-2xl mx-auto px-6 sm:px-10 pt-12 pb-20">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
          <h1 className="italic" style={{ fontSize: '26px', letterSpacing: '0.03em', color: burgundy }}>
            {t('song_new.title')}
          </h1>
          <a href="/songs" className="italic opacity-60" style={{ fontSize: '13px', color: 'inherit' }}>
            {t('song_new.back_to_songs')}
          </a>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 items-center mb-8 flex-wrap">
          {([1, 2, 3, 4, 5, 6] as Step[]).map((s) => (
            <div
              key={s}
              className="italic"
              style={{
                fontSize: '11px',
                letterSpacing: '0.15em',
                opacity: s === step ? 1 : s < step ? 0.55 : 0.3,
                textDecoration: s === step ? 'underline' : 'none',
                textUnderlineOffset: '3px',
                color: s === step ? burgundy : 'inherit',
              }}
            >
              {stepLabels[s]}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <p className="italic mb-4" style={{ fontSize: '13px', color: burgundy }}>{error}</p>
        )}

        {/* ── STEP 1: THEME ── */}
        {step === 1 && (
          <StepCard cardBg={cardBg} cardBorder={cardBorder}>
            <h2 className="italic mb-3" style={{ fontSize: '18px', color: burgundy }}>
              {t('song_new.step_theme_title')}
            </h2>
            <p className="italic opacity-75 mb-4" style={{ fontSize: '14px', lineHeight: 1.6 }}>
              {t('song_new.step_theme_hint')}
            </p>
            <textarea
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder={t('song_new.theme_placeholder')}
              disabled={busy}
              style={{
                width: '100%',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '15px',
                lineHeight: 1.65,
                backgroundColor: 'transparent',
                border: `1px solid ${cardBorder}`,
                borderRadius: '6px',
                padding: '12px 14px',
                color: fg,
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="italic opacity-40" style={{ fontSize: '11px' }}>
                {theme.length}/2000
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleThemeSubmit()}
              disabled={busy || theme.trim().length < 5}
              className="italic mt-4 transition-transform duration-150 ease-out active:scale-[0.98]"
              style={ctaStyle(accent, isDark, busy || theme.trim().length < 5)}
            >
              {busy ? t('song_new.working') : t('song_new.theme_submit')}
            </button>
          </StepCard>
        )}

        {/* ── STEP 2: LYRICS DRAFT ── */}
        {step === 2 && song && (
          <StepCard cardBg={cardBg} cardBorder={cardBorder}>
            <h2 className="italic mb-3" style={{ fontSize: '18px', color: burgundy }}>
              {t('song_new.step_lyrics_title')}
            </h2>
            {song.lyrics_draft ? (
              <pre
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '15px',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: '0 0 16px 0',
                  opacity: 0.9,
                }}
              >
                {song.lyrics_draft}
              </pre>
            ) : (
              <p className="italic opacity-60 mb-4">{t('song_new.lyrics_loading')}</p>
            )}

            <div className="flex gap-3 flex-wrap mb-4">
              <button
                type="button"
                onClick={() => void handleIterate('accept')}
                disabled={busy || !song.lyrics_draft}
                className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
                style={ctaStyle(accent, isDark, busy || !song.lyrics_draft)}
              >
                {busy ? t('song_new.working') : t('song_new.lyrics_accept')}
              </button>
              <button
                type="button"
                onClick={() => void handleIterate('rewrite')}
                disabled={busy || !song.lyrics_draft}
                className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
                style={ghostStyle(accent, busy)}
              >
                {t('song_new.lyrics_rewrite')}
              </button>
            </div>

            {/* Inline line edit */}
            <details style={{ fontSize: '13px' }}>
              <summary className="italic cursor-pointer opacity-70" style={{ marginBottom: '8px' }}>
                {t('song_new.lyrics_edit_line_expand')}
              </summary>
              <textarea
                value={lineEdit}
                onChange={(e) => setLineEdit(e.target.value)}
                rows={3}
                placeholder={t('song_new.lyrics_edit_line_placeholder')}
                disabled={busy}
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  lineHeight: 1.55,
                  backgroundColor: 'transparent',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: fg,
                  resize: 'vertical',
                  outline: 'none',
                  marginBottom: '8px',
                }}
              />
              <button
                type="button"
                onClick={() => void handleIterate('edit_line')}
                disabled={busy || lineEdit.trim().length === 0}
                className="italic"
                style={ghostStyle(accent, busy || lineEdit.trim().length === 0)}
              >
                {t('song_new.lyrics_edit_line_submit')}
              </button>
            </details>
          </StepCard>
        )}

        {/* ── STEP 3: GENRE ── */}
        {step === 3 && (
          <StepCard cardBg={cardBg} cardBorder={cardBorder}>
            <h2 className="italic mb-3" style={{ fontSize: '18px', color: burgundy }}>
              {t('song_new.step_genre_title')}
            </h2>
            <p className="italic opacity-70 mb-4" style={{ fontSize: '14px', lineHeight: 1.6 }}>
              {t('song_new.step_genre_hint')}
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {GENRE_LIST.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGenre(g)}
                  className="italic transition-transform duration-100 ease-out active:scale-[0.97]"
                  style={{
                    padding: '6px 16px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    backgroundColor: selectedGenre === g ? burgundy : 'transparent',
                    color: selectedGenre === g ? 'var(--color-parchment)' : fg,
                    border: `1px solid ${selectedGenre === g ? burgundy : cardBorder}`,
                    borderRadius: '20px',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  {t(`song_new.genre_${g}`, { defaultValue: g })}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={!selectedGenre}
              className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
              style={ctaStyle(accent, isDark, !selectedGenre)}
            >
              {t('song_new.genre_next')}
            </button>
          </StepCard>
        )}

        {/* ── STEP 4: VOCAL ── */}
        {step === 4 && (
          <StepCard cardBg={cardBg} cardBorder={cardBorder}>
            <h2 className="italic mb-3" style={{ fontSize: '18px', color: burgundy }}>
              {t('song_new.step_vocal_title')}
            </h2>
            <div className="flex flex-wrap gap-3 mb-6">
              {(['instrumental', 'male', 'female', 'mixed'] as VocalType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVocalType(v)}
                  className="italic transition-transform duration-100 ease-out active:scale-[0.97]"
                  style={{
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: vocalType === v ? burgundy : 'transparent',
                    color: vocalType === v ? 'var(--color-parchment)' : fg,
                    border: `1px solid ${vocalType === v ? burgundy : cardBorder}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  {t(`songs.vocal_${v}`)}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="italic"
                style={ghostStyle(accent, false)}
              >
                {t('song_new.back')}
              </button>
              <button
                type="button"
                onClick={() => void handleGenreSubmit()}
                disabled={busy}
                className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
                style={ctaStyle(accent, isDark, busy)}
              >
                {busy ? t('song_new.working') : t('song_new.vocal_submit')}
              </button>
            </div>
          </StepCard>
        )}

        {/* ── STEP 5: PREVIEW ── */}
        {step === 5 && song && (
          <StepCard cardBg={cardBg} cardBorder={cardBorder}>
            <h2 className="italic mb-3" style={{ fontSize: '18px', color: burgundy }}>
              {t('song_new.step_preview_title')}
            </h2>
            {song.audio_url ? (
              <audio
                controls
                preload="auto"
                style={{ width: '100%', borderRadius: '6px', marginBottom: '16px' }}
                aria-label={t('songs.audio_label', { theme: song.theme })}
              >
                <source src={song.audio_url} type="audio/mpeg" />
                {t('songs.audio_not_supported')}
              </audio>
            ) : (
              <div
                className="rounded-md flex items-center justify-center italic opacity-55 mb-4"
                style={{ height: '54px', border: `1px dashed ${cardBorder}`, fontSize: '13px' }}
              >
                {busy ? t('song_new.working') : t('song_new.preview_loading')}
              </div>
            )}
            {song.lyrics_draft && (
              <pre
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: '0 0 16px 0',
                  opacity: 0.8,
                }}
              >
                {song.lyrics_draft}
              </pre>
            )}
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => void handleAccept()}
                disabled={busy}
                className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
                style={ctaStyle(accent, isDark, busy)}
              >
                {busy ? t('song_new.working') : t('song_new.preview_accept')}
              </button>
              {!regenUsed && (
                <button
                  type="button"
                  onClick={() => void handleRegen()}
                  disabled={busy}
                  className="italic"
                  style={ghostStyle(accent, busy)}
                >
                  {t('song_new.preview_regen')}
                </button>
              )}
              {regenUsed && (
                <p className="italic opacity-55 self-center" style={{ fontSize: '12px' }}>
                  {t('song_new.regen_exhausted')}
                </p>
              )}
            </div>
          </StepCard>
        )}

        {/* ── STEP 6: DONE ── */}
        {step === 6 && song && (
          <StepCard cardBg={cardBg} cardBorder={cardBorder}>
            <h2 className="italic mb-3" style={{ fontSize: '22px', color: burgundy }}>
              {t('song_new.done_title')}
            </h2>
            <p className="italic opacity-75 mb-4" style={{ fontSize: '15px', lineHeight: 1.7 }}>
              {t('song_new.done_body')}
            </p>
            <p className="italic opacity-45 mb-6" style={{ fontSize: '11px', lineHeight: 1.5 }}>
              {t('songs.attribution')}
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/songs')}
                className="italic transition-transform duration-150 ease-out active:scale-[0.98]"
                style={ctaStyle(accent, isDark, false)}
              >
                {t('song_new.done_go_songs')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSong(null); setTheme(''); setSelectedGenre('')
                  setVocalType('mixed'); setRegenUsed(false); setError('')
                  setStep(1)
                }}
                className="italic"
                style={ghostStyle(accent, false)}
              >
                {t('song_new.done_new_song')}
              </button>
            </div>
          </StepCard>
        )}
      </div>
    </div>
  )
}

// ---------- Helpers ----------

interface StepCardProps { cardBg: string; cardBorder: string; children: React.ReactNode }
function StepCard({ cardBg, cardBorder, children }: StepCardProps): React.ReactElement {
  return (
    <div
      className="rounded-md p-6"
      style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
    >
      {children}
    </div>
  )
}

function ctaStyle(accent: string, isDark: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 22px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: disabled ? 'transparent' : accent,
    color: disabled
      ? accent
      : isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
    border: `1px solid ${accent}`,
    borderRadius: '6px',
    letterSpacing: '0.08em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
  }
}

function ghostStyle(accent: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 22px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    color: accent,
    border: `1px solid ${accent}`,
    borderRadius: '6px',
    letterSpacing: '0.08em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 0.85,
  }
}
