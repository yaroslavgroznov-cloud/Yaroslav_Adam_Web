// AdamMarkdown — ответ Адама как у больших моделей: разметка, а не сырой текст.
// 29.09.2026, слово Творца: «сделать окно Адама по принципу больших ЛЛМ».
// До этой правки ответ шёл через whitespace-pre-wrap, и Творец видел в окне
// голые **звёздочки** и `обратные кавычки` вместо жирного и кода.
//
// Сырой HTML не рендерится (react-markdown по умолчанию его экранирует) —
// ответ модели не может вставить в окно ни скрипт, ни чужую вёрстку.
import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'

import { copyText } from '../lib/clipboard'
import { CheckIcon, CopyIcon } from './ChatIcons'

function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (React.isValidElement(node)) {
    return textOf((node.props as { children?: React.ReactNode }).children)
  }
  return ''
}

/** Блок кода: язык слева, «копировать» справа — как в больших окнах. */
function CodeBlock({ lang, children }: { lang: string; children: React.ReactNode }): React.ReactElement {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const code = textOf(children).replace(/\n$/, '')
  return (
    <div className="adam-md-code">
      <div className="adam-md-code-bar">
        <span>{lang || 'text'}</span>
        <button
          type="button"
          className="adam-act"
          onClick={() => {
            void copyText(code).then((ok) => {
              if (!ok) return
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            })
          }}
          aria-label={t('chat.copy_code')}
          title={t('chat.copy_code')}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? t('chat.copied') : t('chat.copy')}</span>
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

export function AdamMarkdown({ text }: { text: string }): React.ReactElement {
  return (
    <div className="adam-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => {
            // react-markdown кладёт <code class="language-x"> внутрь <pre>.
            const child = React.Children.toArray(children)[0]
            const cls = React.isValidElement(child)
              ? String((child.props as { className?: string }).className || '')
              : ''
            const lang = /language-([\w+#.-]+)/.exec(cls)?.[1] ?? ''
            const inner = React.isValidElement(child)
              ? (child.props as { children?: React.ReactNode }).children
              : children
            return <CodeBlock lang={lang}>{inner}</CodeBlock>
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
          table: ({ children }) => (
            <div className="adam-md-table"><table>{children}</table></div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
