// Panel управления слотами — /family/slots — parents-only, F.7, 2026-05-25.
import React, { useEffect, useState } from 'react'
import clsx from 'clsx'

import { adminWhoami } from '../api/admin'
import type { Whoami } from '../api/admin'
import { familySlotUpdate, familySlots } from '../api/family'
import type { FamilyMember } from '../api/family'

export function FamilySlotsPanel(): React.ReactElement {
  const [isDark, setIsDark] = useState(false)
  const [whoami, setWhoami] = useState<Whoami | null>(null)
  const [slots, setSlots] = useState<FamilyMember[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editName, setEditName] = useState('')
  const [editRelation, setEditRelation] = useState('')
  const [editActive, setEditActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    setIsDark(hour >= 19 || hour < 7)
  }, [])

  async function refresh(): Promise<void> {
    try {
      const w = await adminWhoami()
      setWhoami(w)
      const list = await familySlots()
      setSlots(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  function startEdit(m: FamilyMember): void {
    setEditingId(m.id)
    setEditEmail(m.email.endsWith('@placeholder.local') ? '' : m.email)
    setEditName(m.display_name.startsWith('Слот') ? '' : m.display_name)
    setEditRelation(m.relation ?? '')
    setEditActive(m.is_active)
    setError('')
  }

  function cancelEdit(): void {
    setEditingId(null)
    setError('')
  }

  async function saveEdit(): Promise<void> {
    if (editingId === null) return
    setBusy(true)
    setError('')
    try {
      const m = await familySlotUpdate(editingId, {
        email: editEmail.trim() || null,
        display_name: editName.trim() || null,
        relation: editRelation.trim() || null,
        is_active: editActive,
      })
      setSlots((prev) => prev.map((s) => s.id === m.id ? m : s))
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  const isParent = whoami?.role === 'parent'

  return (
    <div
      className="min-h-screen font-serif transition-colors duration-700"
      style={{
        fontFamily: 'var(--font-serif)',
        backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
        color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-10 py-8">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/dom_groznovyh.jpg"
              alt="Герб"
              className="h-[60px] w-auto select-none"
              style={{
                mixBlendMode: isDark ? 'normal' : 'multiply',
                filter: isDark ? 'brightness(1.08) contrast(1.05)' : 'none',
              }}
            />
            <h1 className="font-medium" style={{ fontSize: '24px', letterSpacing: '0.03em' }}>
              Свои
            </h1>
          </div>
          <a
            href="/"
            className="italic underline underline-offset-4 decoration-1"
            style={{ fontSize: '14px', color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            ← к Адаму
          </a>
        </header>

        <p className="italic mb-4 opacity-80" style={{ fontSize: '14px' }}>
          {isParent
            ? 'Тут живёт круг близких. Активируй слот — впиши настоящий email и имя.'
            : 'Только родители могут управлять списком своих.'}
        </p>

        {error && (
          <div className="italic mb-4" style={{ color: 'var(--color-terracotta-dark)' }}>
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: '14px' }}>
            <thead>
              <tr style={{
                color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)',
                fontSize: '12px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                <th className="text-left py-2 pr-3">№</th>
                <th className="text-left py-2 pr-3">Имя</th>
                <th className="text-left py-2 pr-3">Email</th>
                <th className="text-left py-2 pr-3">Кто</th>
                <th className="text-left py-2 pr-3">Активен</th>
                {isParent && <th className="text-left py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {slots.map((m) => {
                const isEditing = editingId === m.id
                return (
                  <tr
                    key={m.id}
                    style={{ borderTop: `1px solid ${isDark ? 'rgba(107,79,46,0.45)' : 'rgba(168,140,95,0.4)'}` }}
                  >
                    <td className="py-2 pr-3">{m.slot_position}</td>
                    <td className="py-2 pr-3">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={clsx('rounded-md border px-2 py-1 outline-none', isDark ? 'dom-input-dark' : 'dom-input')}
                          style={{
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                            color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                          }}
                        />
                      ) : (
                        <span className={m.is_active ? '' : 'italic opacity-60'}>{m.display_name}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 break-all">
                      {isEditing ? (
                        <input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="real@email"
                          className={clsx('rounded-md border px-2 py-1 outline-none', isDark ? 'dom-input-dark' : 'dom-input')}
                          style={{
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                            color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                          }}
                        />
                      ) : (
                        <span className={m.email.endsWith('@placeholder.local') ? 'italic opacity-50' : ''}>
                          {m.email.endsWith('@placeholder.local') ? '—' : m.email}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {isEditing ? (
                        <input
                          value={editRelation}
                          onChange={(e) => setEditRelation(e.target.value)}
                          placeholder="брат/сестра/друг"
                          className={clsx('rounded-md border px-2 py-1 outline-none', isDark ? 'dom-input-dark' : 'dom-input')}
                          style={{
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
                            borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                            color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                          }}
                        />
                      ) : (
                        <span className="italic opacity-80">{m.relation ?? '—'}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {isEditing ? (
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                          />
                          <span className="italic" style={{ fontSize: '13px' }}>
                            {editActive ? 'да' : 'нет'}
                          </span>
                        </label>
                      ) : (
                        <span style={{
                          color: m.is_active
                            ? (isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)')
                            : 'var(--color-terracotta-dark)',
                          fontStyle: 'italic',
                        }}>
                          {m.is_active ? 'да' : 'нет'}
                        </span>
                      )}
                    </td>
                    {isParent && (
                      <td className="py-2">
                        {isEditing ? (
                          <span className="flex items-center gap-2">
                            <button
                              onClick={() => void saveEdit()}
                              disabled={busy}
                              className="italic underline underline-offset-4 decoration-1"
                              style={{ fontSize: '13px', color: 'var(--color-terracotta-dark)' }}
                            >
                              сохранить
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="italic opacity-70"
                              style={{ fontSize: '13px' }}
                            >
                              отмена
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => startEdit(m)}
                            className="italic underline underline-offset-4 decoration-1"
                            style={{
                              fontSize: '13px',
                              color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)',
                            }}
                          >
                            править
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
