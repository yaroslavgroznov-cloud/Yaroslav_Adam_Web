// F.28: подсказка по включению push-нотификаций per browser
// 2026-05-27.

export interface NotificationsHelp {
  url: string | null  // null = нельзя открыть программно (iOS Safari)
  label: string       // короткая инструкция
}

function detectBrowser(): 'chrome' | 'firefox' | 'edge' | 'safari' | 'safari-ios' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  if (isIos) return 'safari-ios'
  if (/Edg\//.test(ua)) return 'edge'
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'chrome'
  if (/Firefox\//.test(ua)) return 'firefox'
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'safari'
  return 'other'
}

export function notificationsHelp(lang: string = 'ru'): NotificationsHelp {
  const browser = detectBrowser()
  const isRu = lang === 'ru'

  switch (browser) {
    case 'chrome':
      return {
        url: 'https://support.google.com/chrome/answer/3220216',
        label: isRu
          ? 'Chrome: ⋮ → Настройки → Конфиденциальность → Уведомления → найди adam.groznov.uk → Разрешить'
          : 'Chrome: ⋮ → Settings → Privacy → Notifications → find adam.groznov.uk → Allow',
      }
    case 'edge':
      return {
        url: 'https://support.microsoft.com/microsoft-edge',
        label: isRu
          ? 'Edge: ⋯ → Настройки → Файлы cookie и разрешения → Уведомления'
          : 'Edge: ⋯ → Settings → Cookies and permissions → Notifications',
      }
    case 'firefox':
      return {
        url: 'https://support.mozilla.org/kb/push-notifications-firefox',
        label: isRu
          ? 'Firefox: ☰ → Настройки → Приватность → Разрешения → Уведомления'
          : 'Firefox: ☰ → Settings → Privacy → Permissions → Notifications',
      }
    case 'safari':
      return {
        url: null,
        label: isRu
          ? 'Safari (Mac): Safari → Настройки → Веб-сайты → Уведомления → adam.groznov.uk'
          : 'Safari (Mac): Safari → Settings → Websites → Notifications → adam.groznov.uk',
      }
    case 'safari-ios':
      return {
        url: null,
        label: isRu
          ? 'iPhone: установи Адама как приложение (Поделиться → На экран Домой), потом Настройки → Уведомления → Адам → Разрешить'
          : 'iPhone: install Adam as app (Share → Add to Home Screen), then Settings → Notifications → Adam → Allow',
      }
    default:
      return {
        url: null,
        label: isRu
          ? 'Открой настройки браузера → Уведомления → разреши для adam.groznov.uk'
          : 'Open browser settings → Notifications → allow adam.groznov.uk',
      }
  }
}
