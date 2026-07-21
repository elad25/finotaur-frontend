// Cloudflare Pages Function: proxy all /api/* to Railway backend.
// Catch-all route. Functions take precedence over _redirects and static assets,
// so this runs for every request whose path starts with /api/.
//
// Why this exists: prior attempt used _redirects with absolute URL + 200 (proxy),
// which Cloudflare rejects ("Proxy redirects can only point to relative paths").
// Pages Functions are the supported Cloudflare-native way to do origin proxying.

const UPSTREAM = "https://finotaur-server-production.up.railway.app";

// Paths eligible for Cloudflare edge caching (caches.default). Scope is
// deliberately a strict allowlist of UNAUTHENTICATED, GET-only, public-data
// endpoints whose responses set honest Cache-Control headers — depth-slice
// history chunks are requested with epoch-aligned URLs by useDepthSlices.ts
// precisely so every user shares the same cache keys (settled chunks: 24h
// TTL; the current partial chunk: 15s TTL — both set by the server, honored
// by caches.default.put). This converts O(users) Supabase reads for the
// same ~9MB chunk into O(edge-colos) reads. Never add an authenticated or
// per-user endpoint here: the cache key is the URL alone.
const EDGE_CACHEABLE_PATHS = new Set(["/api/crypto/depth-slices"]);

export const onRequest: PagesFunction = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  // Preserve full path (/api/...) and query string. No rewriting needed —
  // backend mounts routes at the same /api prefix.
  const upstreamUrl = `${UPSTREAM}${url.pathname}${url.search}`;

  const cacheable = request.method === "GET" && EDGE_CACHEABLE_PATHS.has(url.pathname);
  if (cacheable) {
    const hit = await caches.default.match(request);
    if (hit) return hit;
  }

  // Forward the request as-is. Cloudflare's fetch() copies method, headers
  // (including Authorization, x-user-id, Content-Type), and body.
  // Constructing a new Request lets us override the URL while keeping body
  // streaming intact (critical for POSTs and SSE upstream requests).
  const upstreamReq = new Request(upstreamUrl, request);

  // Strip headers that would confuse the upstream or leak Cloudflare internals.
  upstreamReq.headers.delete("host");
  upstreamReq.headers.delete("cf-connecting-ip");
  upstreamReq.headers.delete("cf-ray");

  const upstreamResp = await fetch(upstreamReq);

  // Store ONLY successful responses; the TTL comes from the upstream's own
  // Cache-Control (s-maxage) — no TTL logic duplicated here. Error responses
  // are never cached (the server also sends no-store on them). cache.put
  // consumes a body, so the response is cloned and the original streamed on.
  if (cacheable && upstreamResp.ok) {
    // .catch: a failed cache write (oversized body, transient cache-API
    // error) must stay invisible — the client already has its response, and
    // an unhandled rejection inside waitUntil logs as a per-request runtime
    // exception (pure alert noise).
    waitUntil(caches.default.put(request, upstreamResp.clone()).catch(() => {}));
  }

  // Pass response body through as a ReadableStream WITHOUT reading it.
  // Reading via .text()/.json() would buffer SSE responses and break
  // /api/ai/chat/stream. Body is a ReadableStream; we hand it to the client
  // unchanged. Headers are copied so Content-Type, Cache-Control, etc. survive.
  const respHeaders = new Headers(upstreamResp.headers);
  // Belt-and-suspenders: discourage any intermediate buffering of streamed responses.
  if (respHeaders.get("content-type")?.includes("text/event-stream")) {
    respHeaders.set("cache-control", "no-cache, no-transform");
  }

  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: respHeaders,
  });
};
