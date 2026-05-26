// Panel управления слотами — /family/slots — parents-only, F.7, 2026-05-25.
import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { adminWhoami } from '../api/admin'
import type { Whoami } from '../api/admin'
import {
  familySlotUpdate, familySlots,
  morningSettingsGet, morningSettingsUpdate,
} from '../api/family'
import type { FamilyMember, MorningSettings } from '../api/family'

export function FamilySlotsPanel(): React.ReactElement {
  const { t } = useTranslation()
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
  const [morning, setMorning] = useState<MorningSettings | null>(null)
  const [morningBusy, setMorningBusy] = useState(false)
  const [morningToast, setMorningToast] = useState('')

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
      try {
        const m = await morningSettingsGet()
        setMorning(m)
      } catch {
        // не блокируем UI
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('toasts.generic_error'))
    }
  }

  async function saveMorning(patch: Partial<MorningSettings>): Promise<void> {
    if (morning === null) return
    setMorningBusy(true)
    setMorningToast('')
    try {
      const next = await morningSettingsUpdate(patch)
      setMorning(next)
      setMorningToast(t('morning.saved'))
      setTimeout(() => setMorningToast(''), 2000)
    } catch (e) {
      setMorningToast(e instanceof Error ? e.message : t('morning.save_failed'))
    } finally {
      setMorningBusy(false)
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
      setError(e instanceof Error ? e.message : t('familySlots.save_failed'))
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
              {t('familySlots.title')}
            </h1>
          </div>
          <a
            href="/"
            className="italic underline underline-offset-4 decoration-1"
            style={{ fontSize: '14px', color: isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)' }}
          >
            {t('common.back_to_adam')}
          </a>
        </header>

        <p className="italic mb-4 opacity-80" style={{ fontSize: '14px' }}>
          {isParent ? t('familySlots.intro_parent') : t('familySlots.intro_guest')}
        </p>

        {error && (
          <div className="italic mb-4" style={{ color: 'var(--color-terracotta-dark)' }}>
            {error}
          </div>
        )}

        {morning && (
          <section
            className="rounded-md border p-4 sm:p-5 mb-6"
            style={{
              borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
              backgroundColor: isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)',
            }}
          >
            <h2 className="mb-1" style={{ fontSize: '17px', letterSpacing: '0.04em' }}>
              {t('morning.section_title')}
            </h2>
            <p className="italic opacity-80 mb-3" style={{ fontSize: '13px' }}>
              {t('morning.intro')}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3" style={{ fontSize: '14px' }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={morning.enabled}
                  disabled={morningBusy}
                  onChange={(e) => void saveMorning({ enabled: e.target.checked })}
                />
                <span className="italic">{t('morning.enabled_label')}</span>
              </label>

              <label className="flex items-center gap-2">
                <span className="italic opacity-80">{t('morning.hour_label')}:</span>
                <select
                  value={morning.hour}
                  disabled={morningBusy || !morning.enabled}
                  onChange={(e) => void saveMorning({ hour: parseInt(e.target.value, 10) })}
                  className="rounded-md border px-2 py-1 outline-none"
                  style={{
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                    borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                    color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                  }}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="italic opacity-80">{t('morning.tz_label')}:</span>
                <input
                  value={morning.tz}
                  disabled={morningBusy || !morning.enabled}
                  onChange={(e) => setMorning({ ...morning, tz: e.target.value })}
                  onBlur={() => morning && void saveMorning({ tz: morning.tz })}
                  className="rounded-md border px-2 py-1 outline-none"
                  style={{
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minWidth: '180px',
                    backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                    borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                    color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                  }}
                />
              </label>

              <label className="flex items-center gap-2">
                <span className="italic opacity-80">{t('morning.style_label')}:</span>
                <select
                  value={morning.greeting_style}
                  disabled={morningBusy || !morning.enabled}
                  onChange={(e) => void saveMorning({ greeting_style: e.target.value })}
                  className="rounded-md border px-2 py-1 outline-none"
                  style={{
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                    borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
                    color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
                  }}
                >
                  <option value="warm">{t('morning.style_warm')}</option>
                  <option value="brief">{t('morning.style_brief')}</option>
                  <option value="curious">{t('morning.style_curious')}</option>
                </select>
              </label>
            </div>
            {morningToast && (
              <p className="italic mt-2" style={{ fontSize: '13px', opacity: 0.8 }}>
                {morningToast}
              </p>
            )}
          </section>
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
                <th className="text-left py-2 pr-3">{t('familySlots.col_no')}</th>
                <th className="text-left py-2 pr-3">{t('familySlots.col_name')}</th>
                <th className="text-left py-2 pr-3">{t('familySlots.col_email')}</th>
                <th className="text-left py-2 pr-3">{t('familySlots.col_relation')}</th>
                <th className="text-left py-2 pr-3">{t('familySlots.col_active')}</th>
                <th className="text-left py-2 pr-3">{t('familySlots.col_sent_7d')}</th>
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
                          {m.email.endsWith('@placeholder.local') ? t('familySlots.empty_dash') : m.email}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {isEditing ? (
                        <input
                          value={editRelation}
                          onChange={(e) => setEditRelation(e.target.value)}
                          placeholder={t('familySlots.relation_placeholder')}
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
                        <span className="italic opacity-80">{m.relation ?? t('familySlots.empty_dash')}</span>
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
                            {editActive ? t('common.yes') : t('common.no')}
                          </span>
                        </label>
                      ) : (
                        <span style={{
                          color: m.is_active
                            ? (isDark ? 'var(--color-ochre-soft)' : 'var(--color-ochre-dark)')
                            : 'var(--color-terracotta-dark)',
                          fontStyle: 'italic',
                        }}>
                          {m.is_active ? t('common.yes') : t('common.no')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="italic" style={{
                        fontSize: '13px',
                        color: (m.calls_sent_7d ?? 0) > 0
                          ? (isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)')
                          : (isDark ? 'var(--color-ochre-soft)' : 'var(--color-text-muted-day)'),
                      }}>
                        {m.calls_sent_7d ?? 0}
                      </span>
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
                              {t('common.save')}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="italic opacity-70"
                              style={{ fontSize: '13px' }}
                            >
                              {t('common.cancel')}
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
                            {t('common.edit')}
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
