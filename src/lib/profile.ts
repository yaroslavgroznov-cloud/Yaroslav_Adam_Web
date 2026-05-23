// Cloudflare Access кладёт authenticated email в JWT, а в cookie CF_Authorization.
// Браузерный JS не может верифицировать подпись (нет приватного ключа), но
// может прочитать payload base64-декодом для отображения «кто залогинен».
//
// Реальная проверка прав — на backend (app/middleware/jwt_auth.py).
// Здесь — только UI-отображение «привет, X».
//
// Sprint C, 2026-05-23.
import type { AdamProfile } from '../types'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + escaped + '=([^;]+)'))
  return match ? decodeURIComponent(match[1]) : null
}

export function readProfileFromCfAccess(): AdamProfile {
  const token = readCookie('CF_Authorization')
  if (!token) return { email: null, displayName: null }
  const payload = decodeJwtPayload(token)
  if (!payload) return { email: null, displayName: null }

  const email = typeof payload.email === 'string' ? payload.email : null
  const name =
    (typeof payload.name === 'string' && payload.name) ||
    (typeof payload.preferred_username === 'string' && payload.preferred_username) ||
    null

  return { email, displayName: name }
}
