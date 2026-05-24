// MessageBubble — точная копия из DRUG frontend (Next.js).
// Sprint D unification, 2026-05-24.
import React from 'react'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
}

export function MessageBubble({ role, content }: MessageBubbleProps): React.ReactElement {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[75%] px-4 py-3 rounded-2xl text-white text-base whitespace-pre-wrap"
          style={{ backgroundColor: '#8B2E2E' }}
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[75%]">
        <p className="text-xs mb-1 ml-1" style={{ color: '#9CA3AF' }}>Адам</p>
        <div
          className="px-4 py-3 rounded-2xl border text-base whitespace-pre-wrap"
          style={{
            backgroundColor: 'white',
            borderColor: '#E5E7EB',
            color: '#1A1A1A',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
