// Общий HMAC proxy-auth для CF Pages Functions -> DRUG backend (adam-api).
//
// H4 (Совет 80be150f): adam-api.groznov.uk публичен, без CF Access. Раньше
// каждый прокси слал статичный env.ADAM_PROXY_SECRET заголовком
// X-Adam-Proxy-Secret — секрет постоянно на проводе и вечен: один перехват
// запроса на origin = вечная имперсонация любого пользователя, включая Творца.
//
// Теперь прокси вычисляет короткоживущую подпись
//   HMAC-SHA256(secret, `${email}\n${unix_ts}`)
// и шлёт X-Adam-User-Email + X-Adam-Auth-Ts + X-Adam-Auth-Sig. По проводу
// ходит только производная — не сам ключ. Backend (cf_access.py) сверяет
// свежесть ts (окно ±60с) и пересчитывает HMAC в постоянном времени.
//
// Единый источник гейта: 13 прокси-копий раньше = 13 мест для дрейфа.

const encoder = new TextEncoder();

/**
 * Собирает заголовки доверенной личности для запроса к backend.
 * Ключ (env.ADAM_PROXY_SECRET) никогда не покидает Function — на провод
 * уходит только HMAC-подпись над (email, unix_ts).
 */
export async function proxyAuthHeaders(
  secret: string,
  email: string,
): Promise<Record<string, string>> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${email}\n${ts}`),
  );
  const sig = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return {
    "X-Adam-User-Email": email,
    "X-Adam-Auth-Ts": ts,
    "X-Adam-Auth-Sig": sig,
  };
}

/**
 * Ставит HMAC-заголовки личности в уже готовый Headers-объект.
 * Удобно для прокси, которые строят forwardHeaders вручную.
 */
export async function setProxyAuthHeaders(
  headers: Headers,
  secret: string,
  email: string,
): Promise<void> {
  const h = await proxyAuthHeaders(secret, email);
  for (const [k, v] of Object.entries(h)) headers.set(k, v);
}
