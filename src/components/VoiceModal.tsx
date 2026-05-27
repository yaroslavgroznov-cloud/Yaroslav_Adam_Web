// VoiceModal — F.15 OpenAI Realtime voice channel for Adam.
// 2026-05-26.
//
// Flow:
//  1. POST /voice/session → ephemeral client_secret from our backend
//  2. Create RTCPeerConnection
//  3. Add microphone track (audio in)
//  4. addTransceiver('audio', {direction:'recvonly'}) for assistant voice
//  5. Open data channel "oai-events" (we don't need it actively, but
//     OpenAI Realtime expects it for session.update etc.)
//  6. createOffer → POST sdp to https://api.openai.com/v1/realtime with
//     Bearer ephemeral → answer
//  7. setRemoteDescription(answer) → WebRTC connected → voice live
//
// Cleanup: pc.close(), stop mic tracks, remove audio element.
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { voiceSessionCreate } from '../api/voice'

interface Props {
  isDark: boolean
  onClose: () => void
}

type Phase = 'idle' | 'requesting' | 'connecting' | 'live' | 'error' | 'closed'

// F.31: iOS Safari требует PWA-контекст (Home Screen install) для устойчивого
// WebRTC + микрофона. На обычном Safari MediaDevices.getUserMedia может
// отказать или работать криво.
function isIosNonStandalone(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
  if (!isIos) return false
  // navigator.standalone — нестандартный Safari-only флаг
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  return !standalone
}

// OpenAI Realtime GA WebRTC endpoint.
// (Beta `?model=` query тоже отвечает, но GA `/calls` рекомендован.)
const REALTIME_SDP_URL = 'https://api.openai.com/v1/realtime/calls'

function dbg(msg: string, ...rest: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log('[VoiceModal]', msg, ...rest)
}

export function VoiceModal({ isDark, onClose }: Props): React.ReactElement {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const [iosPwaWarn] = useState<boolean>(() => isIosNonStandalone())

  function cleanup(): void {
    try { pcRef.current?.close() } catch { /* ignore */ }
    pcRef.current = null
    if (micStreamRef.current) {
      for (const tr of micStreamRef.current.getTracks()) tr.stop()
      micStreamRef.current = null
    }
    if (audioRef.current) audioRef.current.srcObject = null
  }

  useEffect(() => () => cleanup(), [])

  async function connect(): Promise<void> {
    setError('')
    setPhase('requesting')
    let session
    try {
      session = await voiceSessionCreate()
    } catch (e) {
      setPhase('error')
      setError(e instanceof Error ? e.message : t('voice.session_failed'))
      return
    }

    const ephemeral = session.client_secret?.value
    const model = session.model ?? 'gpt-realtime'
    if (!ephemeral) {
      setPhase('error')
      setError(t('voice.session_failed'))
      return
    }

    setPhase('connecting')
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })
      pcRef.current = pc

      // ВАЖНО: явный recvonly transceiver на приём голоса Адама.
      // Без него ontrack может не сработать на некоторых браузерах.
      pc.addTransceiver('audio', { direction: 'recvonly' })

      pc.ontrack = (ev) => {
        dbg('ontrack', ev.streams.length, 'streams')
        if (audioRef.current && ev.streams[0]) {
          audioRef.current.srcObject = ev.streams[0]
          audioRef.current.play().catch((err) => dbg('audio.play failed', err))
        }
      }

      pc.oniceconnectionstatechange = () => dbg('iceConnectionState', pc.iceConnectionState)
      pc.onicegatheringstatechange = () => dbg('iceGatheringState', pc.iceGatheringState)
      pc.onsignalingstatechange = () => dbg('signalingState', pc.signalingState)
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState
        dbg('connectionState', st)
        if (st === 'connected') setPhase('live')
        // 'disconnected' бывает временным (mobile network) — не рубим. Только 'failed'.
        if (st === 'failed') {
          setPhase('error')
          setError(`WebRTC failed (ICE) — попробуй ещё раз или открой DevTools console.`)
          cleanup()
        }
      }

      // data channel for events (required by Realtime API)
      pc.createDataChannel('oai-events')

      // mic
      dbg('requesting mic...')
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = ms
      for (const tr of ms.getTracks()) {
        pc.addTrack(tr, ms)
        dbg('addTrack', tr.kind, tr.label)
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      dbg('local offer set, len=', offer.sdp?.length)

      // Подождём ICE gathering чтобы offer содержал все candidate.
      // Без этого WebRTC коннект может развалиться когда candidate
      // приходит после уже отправленного offer.
      if (pc.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          const check = (): void => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', check)
              resolve()
            }
          }
          pc.addEventListener('icegatheringstatechange', check)
          // safety timeout 2s
          setTimeout(() => {
            pc.removeEventListener('icegatheringstatechange', check)
            resolve()
          }, 2000)
        })
      }
      const localSdp = pc.localDescription?.sdp ?? offer.sdp ?? ''
      dbg('ICE complete, posting SDP len=', localSdp.length)

      const r = await fetch(`${REALTIME_SDP_URL}?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        body: localSdp,
        headers: {
          Authorization: `Bearer ${ephemeral}`,
          'Content-Type': 'application/sdp',
        },
      })
      if (!r.ok) {
        const txt = await r.text()
        throw new Error(`OpenAI ${r.status}: ${txt.slice(0, 300)}`)
      }
      const answerSdp = await r.text()
      dbg('answer received, len=', answerSdp.length)
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      dbg('remote answer applied')
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('voice.connect_failed')
      dbg('connect failed', msg)
      setPhase('error')
      setError(msg)
      cleanup()
    }
  }

  function hangup(): void {
    cleanup()
    setPhase('closed')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-md border p-6 sm:p-8"
        style={{
          maxWidth: 420,
          width: '100%',
          backgroundColor: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
          color: isDark ? 'var(--color-pergament-light)' : 'var(--color-umber)',
          borderColor: isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)',
          fontFamily: 'var(--font-serif)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '20px', letterSpacing: '0.04em' }}>
            {t('voice.title')}
          </h2>
          <button
            onClick={onClose}
            className="italic opacity-70 hover:opacity-100"
            style={{ fontSize: '14px' }}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        <p className="italic opacity-80 mb-5" style={{ fontSize: '14px' }}>
          {t('voice.intro')}
        </p>

        {iosPwaWarn && (
          <div
            className="rounded-md p-3 mb-4 italic"
            style={{
              fontSize: '13px',
              backgroundColor: 'var(--color-terracotta-dark)',
              color: 'var(--color-parchment)',
            }}
          >
            {t('voice.ios_pwa_warning')}
          </div>
        )}

        <div className="flex items-center justify-center mb-5">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 110, height: 110,
              backgroundColor: phase === 'live'
                ? 'var(--color-terracotta)'
                : (isDark ? 'var(--color-umber-soft)' : 'var(--color-parchment-soft)'),
              border: `2px solid ${
                phase === 'live'
                  ? 'var(--color-terracotta-dark)'
                  : (isDark ? 'var(--color-ochre-dark)' : 'var(--color-ochre)')
              }`,
              animation: phase === 'live' ? 'voice-pulse 1.6s ease-in-out infinite' : 'none',
              transition: 'background-color 0.3s ease',
            }}
          >
            <svg width="46" height="46" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
            </svg>
          </div>
        </div>

        <div className="text-center italic mb-5" style={{ fontSize: '14px', minHeight: 20 }}>
          {phase === 'idle' && t('voice.phase_idle')}
          {phase === 'requesting' && t('voice.phase_requesting')}
          {phase === 'connecting' && t('voice.phase_connecting')}
          {phase === 'live' && t('voice.phase_live')}
          {phase === 'closed' && t('voice.phase_closed')}
          {phase === 'error' && error}
        </div>

        <div className="flex justify-center gap-3">
          {(phase === 'idle' || phase === 'closed' || phase === 'error') && (
            <button
              onClick={() => void connect()}
              className="rounded-md border italic"
              style={{
                padding: '10px 22px',
                fontSize: '15px',
                fontFamily: 'inherit',
                backgroundColor: isDark ? 'var(--color-terracotta-light)' : 'var(--color-terracotta)',
                color: isDark ? 'var(--color-umber-deep)' : 'var(--color-parchment)',
                borderColor: isDark ? 'var(--color-terracotta)' : 'var(--color-terracotta-dark)',
                letterSpacing: '0.04em',
              }}
            >
              {t('voice.connect_btn')}
            </button>
          )}
          {(phase === 'live' || phase === 'connecting' || phase === 'requesting') && (
            <button
              onClick={hangup}
              className="rounded-md border italic"
              style={{
                padding: '10px 22px',
                fontSize: '15px',
                fontFamily: 'inherit',
                backgroundColor: 'var(--color-terracotta-dark)',
                color: 'var(--color-parchment)',
                borderColor: 'var(--color-terracotta-dark)',
                letterSpacing: '0.04em',
              }}
            >
              {t('voice.hangup_btn')}
            </button>
          )}
        </div>

        <audio ref={audioRef} autoPlay playsInline className="hidden" />
        <style>{`
          @keyframes voice-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
        `}</style>
      </div>
    </div>
  )
}
