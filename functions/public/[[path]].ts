// CF Pages Function -- public passthrough proxy.
// Префикс /public/* осознанно НЕ покрыт CF Access destinations,
// поэтому Edge не перехватывает запрос. Эта функция просто проксит
// на backend без auth header'ов.
//
// Используется лендингом /pricing для /public/cabinets.

const BACKEND_BASE = "https://adam-api.groznov.uk"

export const onRequest: PagesFunction = async ({ request, params }) => {
  const pathParts = (params.path as string[] | undefined) ?? []
  const path = pathParts.join("/")
  const url = new URL(request.url)
  const targetUrl = `${BACKEND_BASE}/public/${path}${url.search}`

  const init: RequestInit = { method: request.method, redirect: "manual" }
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer()
  }
  const r = await fetch(targetUrl, init)
  const respHeaders = new Headers(r.headers)
  for (const h of [
    "access-control-allow-origin",
    "access-control-allow-credentials",
    "access-control-allow-methods",
    "access-control-allow-headers",
    "access-control-max-age",
  ]) {
    respHeaders.delete(h)
  }
  return new Response(r.body, {
    status: r.status,
    statusText: r.statusText,
    headers: respHeaders,
  })
}
