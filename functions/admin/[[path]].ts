// Cloudflare Pages Function — reverse-proxy для /admin/* (Творец-only).
// Та же логика что в /adam/*, отличается только target path.
// Sprint E, 2026-05-24.

interface Env {
  ADAM_PROXY_SECRET: string;
}

const BACKEND_BASE = "https://adam-api.groznov.uk";

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const re = new RegExp("(?:^|;\\s*)" + name + "=([^;]+)");
  const m = cookieHeader.match(re);
  return m ? decodeURIComponent(m[1]) : null;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const pathParts = (params.path as string[] | undefined) ?? [];
  const path = pathParts.join("/");
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_BASE}/admin/${path}${url.search}`;

  const cookies = request.headers.get("cookie");
  const cfAuth = readCookie(cookies, "CF_Authorization");
  let email: string | null = null;
  if (cfAuth) {
    const payload = decodeJwtPayload(cfAuth);
    if (payload && typeof payload.email === "string") {
      email = payload.email.toLowerCase().trim();
    }
  }
  if (!email) {
    return new Response(
      JSON.stringify({ detail: "No CF Access identity in cookie" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
  if (!env.ADAM_PROXY_SECRET) {
    return new Response(
      JSON.stringify({ detail: "ADAM_PROXY_SECRET not configured" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const forwardHeaders = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lk = k.toLowerCase();
    if (lk === "host" || lk === "cookie" || lk.startsWith("cf-")) continue;
    forwardHeaders.set(k, v);
  }
  forwardHeaders.set("X-Adam-User-Email", email);
  forwardHeaders.set("X-Adam-Proxy-Secret", env.ADAM_PROXY_SECRET);

  const init: RequestInit = {
    method: request.method,
    headers: forwardHeaders,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const backendResponse = await fetch(targetUrl, init);
  const respHeaders = new Headers(backendResponse.headers);
  respHeaders.delete("access-control-allow-origin");
  respHeaders.delete("access-control-allow-credentials");
  respHeaders.delete("access-control-allow-methods");
  respHeaders.delete("access-control-allow-headers");
  respHeaders.delete("access-control-max-age");

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: respHeaders,
  });
};
