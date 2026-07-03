// Cloudflare Pages Function — глобальный middleware проверки подписи CF Access.
//
// ЗАЧЕМ (C1b, 2026-07-03):
//   Прокси-функции (/adam, /me, /admin, /cabinets, …) декодируют cookie
//   CF_Authorization БЕЗ проверки подписи и пересылают email на backend с
//   валидным X-Adam-Proxy-Secret. Путь /adam* и др. НЕ стоят за CF Access
//   (это XHR-эндпоинты — гейтить 302-редиректом нельзя). Значит атакующий мог
//   прислать ПОДДЕЛЬНУЮ cookie {"email":"<Творец>"} прямо на adam.groznov.uk/adam/…
//   → Function достаёт email → пересылает на backend с secret → имперсонация.
//
// РЕШЕНИЕ:
//   Этот middleware выполняется ПЕРЕД всеми функциями. Если cookie
//   CF_Authorization присутствует — проверяем её RS256-подпись против JWKS
//   команды (groznov.cloudflareaccess.com) + aud + exp/nbf. Поддельная → 401.
//   Валидная → пропускаем к функции (та декодирует ту же, уже проверенную cookie).
//   Отсутствует — пропускаем (функция сама отдаст свой 401 «No CF Access identity»).
//
//   Ноль правок в самих прокси-функциях — фикс покрывает все разом.
//
// БЕЗОПАСНОСТЬ ПРОДА:
//   Middleware БЛОКИРУЕТ только present-but-invalid cookie. У легитимных гостей
//   и Творца cookie настоящая (подписана CF при OTP, aud=093a) → проходит.
//   Публичные префиксы (/public, /auth) исключены — им личность не нужна.
//   JWKS кэшируется в памяти изолята; последний удачный ответ хранится как
//   fallback, чтобы кратковременный сбой cert-эндпоинта CF не вызвал аутаж.
//
// Подпись: СС, для Дома Грознова.

interface Env {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
}

// Публичные значения (не секреты): team domain и AUD апки «Adam External».
// Подтверждены live-пробой 2026-07-03 (aud из meta-JWT редиректа /chat).
// Переопределяются env-переменными Pages при необходимости.
const DEFAULT_TEAM_DOMAIN = "groznov.cloudflareaccess.com";
const DEFAULT_AUD =
  "093abd5288f6e2b4db2945aed4db3c23952df015bc06b3f315fe76cf42e8c888";

// Префиксы, которым CF-личность не нужна (проксятся без auth) — пропускаем.
const SKIP_PREFIXES = ["/public", "/auth"];

const CLOCK_SKEW_SEC = 60;

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

// Кэш JWKS в памяти изолята.
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 час

async function getJwks(teamDomain: string): Promise<Jwk[] | null> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  try {
    const resp = await fetch(
      `https://${teamDomain}/cdn-cgi/access/certs`,
      { cf: { cacheTtl: 3600, cacheEverything: true } } as RequestInit,
    );
    if (!resp.ok) throw new Error(`certs http ${resp.status}`);
    const data = (await resp.json()) as { keys?: Jwk[] };
    if (!data.keys || data.keys.length === 0) throw new Error("empty jwks");
    jwksCache = { keys: data.keys, fetchedAt: now };
    return data.keys;
  } catch {
    // Fallback на последний удачный ответ, если он есть (иначе — null → fail-closed).
    return jwksCache ? jwksCache.keys : null;
  }
}

function b64urlToBytes(s: string): Uint8Array {
  const normalized = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToJson(s: string): Record<string, unknown> | null {
  try {
    const bytes = b64urlToBytes(s);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Проверка подписи + aud + exp/nbf. Возвращает true только для валидного JWT.
async function verifyCfJwt(
  token: string,
  teamDomain: string,
  expectedAud: string,
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const header = b64urlToJson(parts[0]) as { kid?: string; alg?: string } | null;
  const payload = b64urlToJson(parts[1]) as
    | { aud?: string | string[]; exp?: number; nbf?: number }
    | null;
  if (!header || !payload) return false;
  if (header.alg !== "RS256" || !header.kid) return false;

  // Время жизни.
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && now > payload.exp + CLOCK_SKEW_SEC) {
    return false;
  }
  if (typeof payload.nbf === "number" && now < payload.nbf - CLOCK_SKEW_SEC) {
    return false;
  }

  // Audience (у CF Access — массив).
  const auds = Array.isArray(payload.aud)
    ? payload.aud
    : payload.aud
      ? [payload.aud]
      : [];
  if (!auds.includes(expectedAud)) return false;

  // Подпись.
  const keys = await getJwks(teamDomain);
  if (!keys) return false; // fail-closed: не смогли получить JWKS
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return false;

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const sig = b64urlToBytes(parts[2]);
    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      sig,
      data,
    );
  } catch {
    return false;
  }
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const re = new RegExp("(?:^|;\\s*)" + name + "=([^;]+)");
  const m = cookieHeader.match(re);
  return m ? decodeURIComponent(m[1]) : null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Публичные префиксы — без проверки.
  if (SKIP_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    return next();
  }

  const cfAuth = readCookie(request.headers.get("cookie"), "CF_Authorization");

  // Cookie нет — пропускаем: downstream-функция сама отдаст 401.
  // (Отсутствие cookie = не имперсонация; это просто неаутентифицированный запрос.)
  if (!cfAuth) {
    return next();
  }

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN || DEFAULT_TEAM_DOMAIN;
  const expectedAud = env.CF_ACCESS_AUD || DEFAULT_AUD;

  const valid = await verifyCfJwt(cfAuth, teamDomain, expectedAud);
  if (!valid) {
    return new Response(
      JSON.stringify({ detail: "Invalid CF Access token" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  // Cookie валидна — пропускаем к прокси-функции.
  return next();
};
