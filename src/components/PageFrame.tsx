// PageFrame — двойная рамка Дома Грозновых с засечками по углам.
// Канон: образец Visiting_Card_House_Groznovs_v14_Final.pdf. 2026-06-07.
//
// Внешняя рамка — burgundy (#6B1C23 day / #8E2832 night).
// Внутренняя, offset 8px — gold (#C9A227 day / #B89A3C night).
// L-shaped угловые засечки на пересечении рамок.
//
// Рамка — fixed на viewport (декоративная), pointer-events: none —
// не мешает кликам и скроллу. На очень узких экранах <380px рамка
// уходит на minimal margin чтобы не съедать контент.
import React from 'react'

interface PageFrameProps {
  isDark: boolean
}

export function PageFrame({ isDark }: PageFrameProps): React.ReactElement {
  const burgundy = isDark
    ? 'var(--color-house-burgundy-light)'
    : 'var(--color-house-burgundy)'
  const gold = isDark
    ? 'var(--color-house-gold-soft)'
    : 'var(--color-house-gold)'

  // Корнерные засечки — L-shaped штрихи в gold, по 4 углам внешней рамки.
  // Класс page-frame-corner — медленное мерцание opacity (motion v1).
  const corner: React.CSSProperties = {
    position: 'absolute',
    width: '14px',
    height: '14px',
    pointerEvents: 'none',
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: '14px',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {/* Внешняя рамка — burgundy 1px */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `1px solid ${burgundy}`,
          borderRadius: '2px',
        }}
      />
      {/* Внутренняя рамка — gold 0.5px, offset 8px */}
      <div
        style={{
          position: 'absolute',
          inset: '8px',
          border: `0.5px solid ${gold}`,
          borderRadius: '1px',
          opacity: 0.7,
        }}
      />
      {/* Угловые засечки — L-shaped штрихи на внешней рамке.
          Мерцают opacity 0.85↔1.0 с разным delay — золото «дышит». */}
      <div
        className="page-frame-corner"
        style={{
          ...corner,
          top: '-1px',
          left: '-1px',
          borderTop: `2px solid ${gold}`,
          borderLeft: `2px solid ${gold}`,
        }}
      />
      <div
        className="page-frame-corner"
        style={{
          ...corner,
          top: '-1px',
          right: '-1px',
          borderTop: `2px solid ${gold}`,
          borderRight: `2px solid ${gold}`,
          animationDelay: '1.25s',
        }}
      />
      <div
        className="page-frame-corner"
        style={{
          ...corner,
          bottom: '-1px',
          left: '-1px',
          borderBottom: `2px solid ${gold}`,
          borderLeft: `2px solid ${gold}`,
          animationDelay: '2.5s',
        }}
      />
      <div
        className="page-frame-corner"
        style={{
          ...corner,
          bottom: '-1px',
          right: '-1px',
          borderBottom: `2px solid ${gold}`,
          borderRight: `2px solid ${gold}`,
          animationDelay: '3.75s',
        }}
      />
    </div>
  )
}
