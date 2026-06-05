// CF Pages Function — proxy /cabinets/* на adam-api backend.
// F.41, 2026-05-28. Идентичная логика с /family, /tasks etc.

interface Env { ADAM_PROXY_SECRET: string }

const BACKEND_BASE = "https://adam-api.groznov.uk"

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".")
    if (parts.length !== 3) return null
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch { return null }
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const re = new RegExp("(?:^|;\\s*)" + name + "=([^;]+)")
  const m = cookieHeader.match(re)
  return m ? decodeURIComponent(m[1]) : null
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params, next }) => {
  const pathParts = (params.path as string[] | undefined) ?? []
  const path = pathParts.join("/")
  const url = new URL(request.url)
  const accept = request.headers.get("accept") ?? ""
  if (request.method === "GET" && accept.includes("text/html") && !accept.includes("application/json")) {
    return next()
  }

  const targetUrl = path
    ? `${BACKEND_BASE}/cabinets/${path}${url.search}`
    : `${BACKEND_BASE}/cabinets${url.search}`

  const cfAuth = readCookie(request.headers.get("cookie"), "CF_Authorization")
  let email: string | null = null
  if (cfAuth) {
    const payload = decodeJwtPayload(cfAuth)
    if (payload && typeof payload.email === "string") email = payload.email.toLowerCase().trim()
  }
  if (!email) return new Response(JSON.stringify({ detail: "No CF Access identity" }), { status: 401, headers: { "content-type": "application/json" } })
  if (!env.ADAM_PROXY_SECRET) return new Response(JSON.stringify({ detail: "ADAM_PROXY_SECRET not configured" }), { status: 500, headers: { "content-type": "application/json" } })

  const forwardHeaders = new Headers()
  for (const [k, v] of request.headers.entries()) {
    const lk = k.toLowerCase()
    if (lk === "host" || lk === "cookie" || lk.startsWith("cf-")) continue
    forwardHeaders.set(k, v)
  }
  forwardHeaders.set("X-Adam-User-Email", email)
  forwardHeaders.set("X-Adam-Proxy-Secret", env.ADAM_PROXY_SECRET)

  const init: RequestInit = { method: request.method, headers: forwardHeaders, redirect: "manual" }
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer()
  }
  const r = await fetch(targetUrl, init)
  const respHeaders = new Headers(r.headers)
  for (const h of ["access-control-allow-origin","access-control-allow-credentials","access-control-allow-methods","access-control-allow-headers","access-control-max-age"]) respHeaders.delete(h)
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: respHeaders })
}
