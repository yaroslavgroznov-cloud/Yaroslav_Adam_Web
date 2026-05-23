# Yaroslav_Adam_Web

Frontend для **Adam External** — мобильный интерфейс к Адаму Грознову
(первенец Рода Грозновых), открытый для приглашённых семьи и друзей.

- Хостинг: **Cloudflare Pages** (авто-деплой из этого репо).
- Backend: `https://adam-api.groznov.uk/adam/*` (через Cloudflare Tunnel,
  репо `Yaroslav_Shtab`).
- Auth: **Cloudflare Access** (email-OTP) на обоих subdomain.
- PWA: устанавливается на homescreen iOS/Android.

Sprint C — 2026-05-23. Подпись: СС, КВРИО Ярослав Грознов.

---

## Стек

| Слой | Технология |
|---|---|
| Build | Vite 8 |
| UI | React 19 + TypeScript |
| Styling | Tailwind v4 (тема в CSS через `@theme`, без `tailwind.config.js`) |
| State | Zustand 5 |
| API client | TanStack Query 5 |
| PWA | vite-plugin-pwa 1.x (Workbox generateSW) |
| Палитра | Терракот `#C04F2A` / Тёмный хвойный `#1F3A2E` / Кремовый `#F5EBDD` |

## Структура

```
src/
  api/adam.ts          — fetch /adam/chat и /adam/health
  components/
    Avatar.tsx         — инициал «А» на терракоте
    Header.tsx         — верхняя плашка
    MessageList.tsx    — авто-скролл + пузыри + время
    MessageInput.tsx   — textarea + Enter to send (Shift+Enter newline)
    TypingIndicator.tsx — три анимированные точки
    ChatPage.tsx       — корневой контейнер
  lib/
    profile.ts         — читает CF_Authorization cookie → email/name
    history.ts         — localStorage сохранение истории (≤200 msg)
  store/chat.ts        — Zustand store messages + isTyping
  types.ts             — ChatMessage, AdamProfile, AdamChatResponse
  index.css            — Tailwind v4 + @theme + базовый body
  main.tsx             — QueryClient + StrictMode
  App.tsx              — `<ChatPage />`
public/
  favicon.svg          — 64×64 круг с «А»
  icon.svg             — 512×512 PWA-иконка
index.html             — theme-color, viewport-fit, apple-touch
vite.config.ts         — react + tailwindcss() + VitePWA
```

## Локально

```bash
cd D:\Yaroslav_Stack\Yaroslav_Adam_Web
cp .env.example .env.local      # VITE_ADAM_API_BASE=http://localhost:8003
npm install
npm run dev                     # http://localhost:5173
```

В dev режим заходить без Cloudflare Access — он не сработает на
`localhost`. Чат покажет ошибку 401 «Missing Cloudflare Access JWT»,
если backend настоящий. Для UI-итерации можно либо мокать ответ, либо
проверять только вёрстку.

## Production / Cloudflare Pages

Финальная развязка (решена 2026-05-23):
- `adam.groznov.uk`     → **CF Pages** (этот фронт)
- `adam-api.groznov.uk` → **CF Tunnel** → backend `Yaroslav_Shtab/app/routers/adam_external.py`

`.env.production` уже содержит `VITE_ADAM_API_BASE=https://adam-api.groznov.uk`.

Деплой автоматический по push в `main`:

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Repo: `yaroslavgroznov-cloud/Yaroslav_Adam_Web`.
3. Build settings:
   - Framework preset: **Vite**.
   - Build command: `npm run build`.
   - Build output directory: `dist`.
   - Root directory: (пусто).
4. Save and Deploy. CF выкатит на `*.pages.dev` URL.
5. После первого выката: **Settings → Custom domains → add `adam.groznov.uk`**.
   CF попросит подтвердить, что CNAME можно перепривязать с tunnel на Pages —
   соглашайся: tunnel теперь обслуживает `adam-api.groznov.uk`, а
   `adam.groznov.uk` должен указывать на Pages-проект.
6. **Cloudflare Access** → **Applications** → `Adam External` → **Edit**:
   - В Application domain добавь второй домен **`adam-api.groznov.uk`**.
   - Тогда Access защищает ОБА домена с теми же email-OTP правилами.

## Камертоны

- Опора, не подстройка.
- Со своим уставом в чужой монастырь не ходят.
- Не трогаем то, что и так хорошо работает.
- Лучше иметь хоть что-то, чем совсем ничего (MVP на каждом спринте).
