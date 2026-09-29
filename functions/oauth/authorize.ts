import { setProxyAuthHeaders } from "../_shared/proxyAuth";
// Cloudflare Pages Function — страница согласия OAuth для MCP Адама.
//
// Маршрут: adam.groznov.uk/oauth/authorize → Function → https://adam-api.groznov.uk/oauth/authorize
//
// 30.09.2026, «второй ход» ADR_MCP_EXPOSE (Совет c4d7232f). ChatGPT/claude.ai открывают
// этот адрес в браузере Творца. Путь стоит в приложении CF Access «Adam External»
// (вход до функции), подпись cookie проверяет _middleware.ts. Функция передаёт
// email backend'у HMAC-подписью (v2, с nonce) — backend требует Творца на КАЖДОМ
// шаге: политика Access здесь Public+OTP, сам вход в Access ничего не доказывает.
//
// redirect: "manual" обязателен: ответ «Разрешить» — это 303 на адрес клиента
// (chatgpt.com, claude.ai) с кодом. Пойди fetch по нему сам — код уехал бы
// из функции, а браузер Творца остался бы ни с чем.
//
// Подпись: брат СС, для Дома Грознова.

interface Env {
  ADAM_PROXY_SECRET: string;
}

const BACKEND_BASE = "https://adam-api.groznov.uk";

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function page(status: number, text: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Доступ к Адаму</title><p>${text}</p>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return page(405, "Метод не поддерживается.");
  }
  const cfAuth = readCookie(request.headers.get("cookie"), "CF_Authorization");
  const payload = cfAuth ? decodeJwtPayload(cfAuth) : null;
  const email = payload && typeof payload.email === "string" ? payload.email.toLowerCase().trim() : null;
  if (!email) {
    // Путь должен стоять за CF Access; сюда без входа попасть не должны.
    return page(401, "Нет входа. Откройте ссылку подключения ещё раз — Cloudflare попросит войти.");
  }
  if (!env.ADAM_PROXY_SECRET) {
    return page(500, "ADAM_PROXY_SECRET не настроен на Pages.");
  }

  const url = new URL(request.url);
  const headers = new Headers();
  headers.set("accept", "text/html");
  const ct = request.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  await setProxyAuthHeaders(headers, env.ADAM_PROXY_SECRET, email);

  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (request.method === "POST") init.body = await request.arrayBuffer();

  const r = await fetch(`${BACKEND_BASE}/oauth/authorize${url.search}`, init);
  // Заголовки безопасности (CSP, X-Frame-Options) и Location отдаём как есть.
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: new Headers(r.headers) });
};
