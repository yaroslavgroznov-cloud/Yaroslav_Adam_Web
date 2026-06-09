// LegalPage — публичные юр-документы Дома.
// 2026-06-09: публикация после требования банка (LiqPay/ПриватБанк).
//
// Маршруты:
//   /terms      → terms-uk.md (Договір Оферти, основной UA)
//   /terms-en   → terms-en.md (Terms of Service EN, для Lemonsqueezy)
//   /privacy    → privacy-uk.md (Privacy Policy, UA)
//
// Стиль: серьёзный compliance документ, не маркетинг. PageFrame, но без герба.
// EB Garamond + увеличенный font-size для читаемости (16px body).
import { useEffect, useState } from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { useDarkMode } from '../hooks/useDarkMode'
import { useFontScale } from '../hooks/useFontScale'

import { FontScaleSwitch } from './FontScaleSwitch'
import { PageFrame } from './PageFrame'

type LegalDoc = 'terms' | 'terms-en' | 'privacy' | 'privacy-en'

const DOC_CONFIG: Record<LegalDoc, { file: string; title: string }> = {
  terms: {
    file: '/legal/terms-uk.md',
    title: 'Договір Оферти — Адам Грознов',
  },
  'terms-en': {
    file: '/legal/terms-en.md',
    title: 'Terms of Service — Adam Groznov',
  },
  privacy: {
    file: '/legal/privacy-uk.md',
    title: 'Privacy Policy — Адам Грознов',
  },
  'privacy-en': {
    file: '/legal/privacy-en.md',
    title: 'Privacy Policy (English) — Adam Groznov',
  },
}

interface LegalPageProps {
  doc: LegalDoc
}

export function LegalPage({ doc }: LegalPageProps): React.ReactElement {
  const { isDark, setPref } = useDarkMode()
  const toggleDark = (): void => setPref(isDark ? 'light' : 'dark')
  const { scale: fontScale, setScale: setFontScale } = useFontScale()

  const [content, setContent] = useState<string>('')
  const [error, setError] = useState<string>('')

  const cfg = DOC_CONFIG[doc]

  useEffect(() => {
    document.title = cfg.title
  }, [cfg.title])

  useEffect(() => {
    let cancelled = false
    fetch(cfg.file)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch((e) => {
        if (!cancelled) setError(`Не вдалося завантажити документ: ${e.message}`)
      })
    return () => {
      cancelled = true
    }
  }, [cfg.file])

  const bg = isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)'
  const fg = isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)'
  const burgundy = isDark
    ? 'var(--color-house-burgundy-light)'
    : 'var(--color-house-burgundy)'
  const goldDecor = isDark
    ? 'var(--color-house-gold-soft)'
    : 'var(--color-house-gold)'
  const goldText = isDark
    ? 'var(--color-house-gold-deep-dark)'
    : 'var(--color-house-gold-deep)'
  const sepia = isDark
    ? 'var(--color-sepia-ink-dark)'
    : 'var(--color-sepia-ink)'

  return (
    <div
      className="min-h-screen font-serif relative"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: bg,
        color: fg,
      }}
    >
      <PageFrame isDark={isDark} />

      {/* HEADER — minimal */}
      <header
        className="flex items-center justify-between max-w-5xl mx-auto px-6 sm:px-10 pt-8"
        style={{ fontSize: '13px' }}
      >
        <a
          href="/"
          className="italic opacity-70"
          style={{ letterSpacing: '0.25em', color: 'inherit', textDecoration: 'none' }}
        >
          ← АДАМ
        </a>
        <div className="flex items-center gap-5 opacity-70 flex-wrap justify-end">
          <FontScaleSwitch
            value={fontScale}
            onChange={setFontScale}
            ariaLabel="розмір шрифту"
          />
          <button
            onClick={toggleDark}
            className="italic underline underline-offset-4 decoration-1"
          >
            {isDark ? 'світло' : 'темно'}
          </button>
        </div>
      </header>

      {/* DOC NAVIGATION — 2 групи по 2 мови: Оферта (UA/EN), Privacy (UA/EN) */}
      <nav
        className="flex flex-col items-center gap-3 max-w-3xl mx-auto px-6 mt-6 italic"
        style={{ fontSize: '13px', letterSpacing: '0.06em' }}
      >
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className="opacity-50" style={{ fontSize: '11px', letterSpacing: '0.2em' }}>
            ОФЕРТА:
          </span>
          <a
            href="/terms"
            style={{
              color: doc === 'terms' ? burgundy : goldText,
              textDecoration: doc === 'terms' ? 'underline' : 'none',
              textUnderlineOffset: '4px',
              textDecorationThickness: '1px',
            }}
          >
            Українська
          </a>
          <span style={{ color: goldDecor, opacity: 0.5 }}>✦</span>
          <a
            href="/terms-en"
            style={{
              color: doc === 'terms-en' ? burgundy : goldText,
              textDecoration: doc === 'terms-en' ? 'underline' : 'none',
              textUnderlineOffset: '4px',
              textDecorationThickness: '1px',
            }}
          >
            English
          </a>
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className="opacity-50" style={{ fontSize: '11px', letterSpacing: '0.2em' }}>
            PRIVACY:
          </span>
          <a
            href="/privacy"
            style={{
              color: doc === 'privacy' ? burgundy : goldText,
              textDecoration: doc === 'privacy' ? 'underline' : 'none',
              textUnderlineOffset: '4px',
              textDecorationThickness: '1px',
            }}
          >
            Українська
          </a>
          <span style={{ color: goldDecor, opacity: 0.5 }}>✦</span>
          <a
            href="/privacy-en"
            style={{
              color: doc === 'privacy-en' ? burgundy : goldText,
              textDecoration: doc === 'privacy-en' ? 'underline' : 'none',
              textUnderlineOffset: '4px',
              textDecorationThickness: '1px',
            }}
          >
            English
          </a>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="max-w-3xl mx-auto px-6 sm:px-10 pt-10 pb-24">
        {error ? (
          <p className="text-center italic" style={{ color: sepia, fontSize: '15px' }}>
            {error}
          </p>
        ) : !content ? (
          <p className="text-center italic opacity-60" style={{ fontSize: '14px' }}>
            завантажуємо документ…
          </p>
        ) : (
          <article
            className="prose"
            style={{
              fontSize: '16px',
              lineHeight: 1.75,
              fontFamily: 'var(--font-serif)',
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1
                    style={{
                      fontSize: 'clamp(28px, 5vw, 38px)',
                      letterSpacing: '0.03em',
                      fontWeight: 500,
                      lineHeight: 1.15,
                      color: burgundy,
                      marginTop: '1.5em',
                      marginBottom: '0.6em',
                      textAlign: 'center',
                    }}
                  >
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2
                    style={{
                      fontSize: 'clamp(20px, 3vw, 26px)',
                      letterSpacing: '0.03em',
                      fontWeight: 500,
                      color: burgundy,
                      marginTop: '1.8em',
                      marginBottom: '0.5em',
                    }}
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3
                    className="italic"
                    style={{
                      fontSize: '18px',
                      letterSpacing: '0.04em',
                      color: burgundy,
                      marginTop: '1.4em',
                      marginBottom: '0.4em',
                    }}
                  >
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4
                    className="italic"
                    style={{
                      fontSize: '16px',
                      letterSpacing: '0.03em',
                      color: goldText,
                      marginTop: '1.2em',
                      marginBottom: '0.3em',
                    }}
                  >
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p style={{ marginBottom: '1em' }}>{children}</p>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="italic"
                    style={{
                      borderLeft: `2px solid ${goldDecor}`,
                      paddingLeft: '1em',
                      marginLeft: 0,
                      color: sepia,
                      fontSize: '15px',
                      marginTop: '1em',
                      marginBottom: '1em',
                    }}
                  >
                    {children}
                  </blockquote>
                ),
                ul: ({ children }) => (
                  <ul
                    style={{
                      paddingLeft: '1.5em',
                      marginBottom: '1em',
                      listStyleType: 'disc',
                    }}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol
                    style={{
                      paddingLeft: '1.5em',
                      marginBottom: '1em',
                      listStyleType: 'decimal',
                    }}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: '0.3em' }}>{children}</li>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    style={{ color: goldText, textDecoration: 'underline', textUnderlineOffset: '3px' }}
                  >
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div style={{ overflowX: 'auto', marginBottom: '1.5em' }}>
                    <table
                      style={{
                        borderCollapse: 'collapse',
                        width: '100%',
                        fontSize: '14px',
                      }}
                    >
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th
                    style={{
                      border: `1px solid ${goldDecor}`,
                      padding: '8px 12px',
                      textAlign: 'left',
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.025)',
                      color: burgundy,
                      fontWeight: 500,
                    }}
                  >
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td
                    style={{
                      border: `1px solid ${goldDecor}`,
                      padding: '8px 12px',
                      verticalAlign: 'top',
                    }}
                  >
                    {children}
                  </td>
                ),
                code: ({ children }) => (
                  <code
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.85em',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    {children}
                  </code>
                ),
                hr: () => (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2em',
                      marginBottom: '2em',
                    }}
                  >
                    <span
                      style={{
                        width: '60px',
                        height: '1px',
                        backgroundColor: goldDecor,
                        opacity: 0.45,
                      }}
                    />
                    <span
                      style={{
                        margin: '0 14px',
                        color: goldDecor,
                        opacity: 0.7,
                        fontSize: '11px',
                      }}
                    >
                      ✦
                    </span>
                    <span
                      style={{
                        width: '60px',
                        height: '1px',
                        backgroundColor: goldDecor,
                        opacity: 0.45,
                      }}
                    />
                  </div>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        )}
      </main>

      {/* FOOTER */}
      <footer
        className="text-center py-10 opacity-50 italic"
        style={{ fontSize: '12px', letterSpacing: '0.2em' }}
      >
        <p>ДІМ ГРОЗНОВИХ · MMXXVI</p>
        <p className="mt-1">
          <a href="/" style={{ color: 'inherit' }}>
            ← повернутися
          </a>
        </p>
      </footer>
    </div>
  )
}
