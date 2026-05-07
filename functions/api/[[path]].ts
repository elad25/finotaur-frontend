// Cloudflare Pages Function: proxy all /api/* to Railway backend.
// Catch-all route. Functions take precedence over _redirects and static assets,
// so this runs for every request whose path starts with /api/.
//
// Why this exists: prior attempt used _redirects with absolute URL + 200 (proxy),
// which Cloudflare rejects ("Proxy redirects can only point to relative paths").
// Pages Functions are the supported Cloudflare-native way to do origin proxying.

const UPSTREAM = "https://finotaur-server-production.up.railway.app";

export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  // Preserve full path (/api/...) and query string. No rewriting needed —
  // backend mounts routes at the same /api prefix.
  const upstreamUrl = `${UPSTREAM}${url.pathname}${url.search}`;

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
