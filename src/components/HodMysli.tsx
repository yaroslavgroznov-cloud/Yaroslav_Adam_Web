// HodMysli — ход мысли Адама в диалоге. 23.09.2026, слово Творца:
// «в диалоге была видна цепочка и тексты рассуждений. Сейчас до ответа стоит
// бегущая тремя точками заглушка „Адам думает“».
//
// Живой режим (live): пока Адам думает — цепочка раскрыта и растёт по мере
// того, как приходят мысли и шаги инструментов. После ответа она свёрнута в
// одну строку над ответом («Ход мысли · шагов: 3 · инструменты: …») и
// раскрывается по клику — и после перезагрузки тоже: цепочка хранится при
// сообщении.
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { HodMysliSobytie } from '../types'

interface Props {
  items: HodMysliSobytie[]
  isDark: boolean
  live?: boolean
}

export function HodMysli({ items, isDark, live = false }: Props): React.ReactElement | null {
  const { t } = useTranslation()
  const [open, setOpen] = useState(live)
  const niz = useRef<HTMLDivElement | null>(null)
  // В живом режиме держим низ цепочки в поле зрения.
  useEffect(() => {
    if (live && open) niz.current?.scrollIntoView({ block: 'nearest' })
  }, [items, live, open])
  if (!items || items.length === 0) return null

  const shagov = Math.max(...items.map((i) => i.shag || 0), 1)
  const instr = Array.from(new Set(items.filter((i) => i.type === 'tool' && i.imya).map((i) => i.imya!)))
  const cvet = isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)'
  const fon = isDark ? 'rgba(168,140,95,0.10)' : 'rgba(168,140,95,0.08)'

  return (
    <div className="mb-2" style={{ fontSize: '13px', color: cvet }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="italic inline-flex items-center gap-1.5 opacity-80 hover:opacity-100"
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>{live ? t('hodMysli.live') : t('hodMysli.title')}</span>
        {live && (
          <span className="adam-bounce" aria-hidden>…</span>
        )}
        <span className="opacity-70">· {t('hodMysli.steps', { count: shagov })}</span>
        {instr.length > 0 && (
          <span className="opacity-70">· {t('hodMysli.tools', { list: instr.join(', ') })}</span>
        )}
      </button>
      {open && (
        <div
          className="mt-1.5 rounded-lg border-l-2 pl-3 pr-2 py-2"
          style={{ borderColor: cvet, backgroundColor: fon, maxHeight: live ? '45vh' : '60vh', overflowY: 'auto' }}
        >
          {items.map((s, i) => {
            const novyjShag = i === 0 || items[i - 1].shag !== s.shag
            return (
              <div key={i}>
                {novyjShag && shagov > 1 && (
                  <div className="text-xs uppercase tracking-wide opacity-60 mt-1 mb-0.5">
                    {t('hodMysli.step', { n: s.shag })}
                  </div>
                )}
                {s.type === 'reasoning' && (
                  <div className="whitespace-pre-wrap italic opacity-90 mb-1.5" style={{ lineHeight: 1.45 }}>
                    {s.text}
                  </div>
                )}
                {s.type === 'tool' && (
                  <div className="font-mono text-xs mb-0.5" style={{ wordBreak: 'break-all' }}>
                    → {s.imya}({s.text})
                  </div>
                )}
                {s.type === 'tool_result' && (
                  <div className="font-mono text-xs mb-1 opacity-75">
                    {s.ok === false ? '✗ ' + t('hodMysli.error') : '✓ ' + t('hodMysli.chars', { n: Number(s.text || 0).toLocaleString() })}
                    {' · '}{s.imya}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={niz} />
        </div>
      )}
    </div>
  )
}
