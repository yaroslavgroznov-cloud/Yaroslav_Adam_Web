/** Оценка скорости и накопления стрима (символы → токены). 24.09.2026.
 *
 * Сервер не шлёт usage mid-stream; считаем по эвристике ~4 символа/токен
 * (смесь RU/EN). Для UI индикатора достаточно; не путать с биллингом.
 */

export interface StreamRate {
  /** Накоплено токенов с начала фазы (округлённо вниз). */
  toks: number
  /** Токенов в секунду (округлённо), 0 пока рано мерять. */
  toksPerSec: number
  /** Символов с начала фазы. */
  chars: number
  /** Секунд с первого чанка. */
  elapsedSec: number
}

export function createStreamRateMeter(charsPerToken = 4): {
  note: (text: string) => StreamRate
  reset: () => void
  snapshot: () => StreamRate
} {
  let t0: number | null = null
  let chars = 0

  const snapshot = (): StreamRate => {
    if (t0 == null || chars === 0) {
      return { toks: 0, toksPerSec: 0, chars: 0, elapsedSec: 0 }
    }
    const elapsedSec = (performance.now() - t0) / 1000
    const toks = Math.max(1, Math.floor(chars / Math.max(charsPerToken, 1)))
    const toksPerSec = elapsedSec >= 0.25 ? Math.round(toks / elapsedSec) : 0
    return { toks, toksPerSec, chars, elapsedSec }
  }

  return {
    note(text: string): StreamRate {
      if (!text) return snapshot()
      if (t0 == null) t0 = performance.now()
      chars += text.length
      return snapshot()
    },
    reset() {
      t0 = null
      chars = 0
    },
    snapshot,
  }
}
