// Cloudflare Pages Function: guarantee /assets/* NEVER serves the SPA HTML shell.
//
// The recurring production white-screen (Sentry "[lazyWithRetry] Module resolved
// without a `default` export" + "Failed to load module script: Expected a
// JavaScript module script but the server responded with a MIME type of
// text/html"): during a deploy's propagation window (20-40 min on Cloudflare
// Pages) an edge that does NOT yet — or no longer — has /assets/<hash>.js
// answered that URL with the SPA fallback (200, text/html). Because /assets/* is
// served `immutable`, the browser then cached that text/html UNDER the immutable
// asset URL, so dynamic import() kept failing and the app white-screened
// permanently — even after Ctrl+Shift+R (a plain reload cannot evict an
// immutable-cached entry).
//
// Why the earlier fix did not work: `_redirects` had `/assets/* /index.html 404`,
// but Cloudflare _redirects CANNOT return a 404 status (it supports only 200
// rewrites and 3xx redirects). That rule silently fell through to the `/* 200`
// catch-all, so a missing chunk still returned 200 text/html. A Pages Function is
// the only Cloudflare-native way to return a REAL 404 here. A real 404.html at
// the Pages root is not an option either — it disables the SPA fallback and 404s
// every /app/* route and the OAuth callback.
//
// How this works: Functions take precedence over static assets, so this runs for
// every /assets/* request. We delegate to env.ASSETS.fetch() to serve the real
// bundled file untouched; ONLY when the asset store answers with the HTML shell
// (i.e. the file is missing on this deployment) do we override with a clean,
// uncacheable 404. A 404 can never be stored by the browser as the module, so the
// poisoning cannot happen, and lazyWithRetry / the boot-recovery reload see a
// normal ChunkLoadError they know how to heal.

interface Env {
  // Default Pages binding to the static-asset store.
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const assetResponse = await env.ASSETS.fetch(request);
  const contentType = assetResponse.headers.get("content-type") || "";

  // A real bundled asset (JS / CSS / font / image / source-map) never carries a
  // text/html content-type. If we got HTML back, this /assets/* path has no file
  // on this deployment and env.ASSETS returned the SPA fallback shell.
  if (assetResponse.ok && !contentType.includes("text/html")) {
    return assetResponse;
  }

  return new Response("Asset not found on this deployment.\n", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Never let a browser or edge cache this negative response under the
      // immutable asset URL — once propagation completes and the real chunk
      // exists, the next request must fetch it fresh.
      "cache-control": "no-store, must-revalidate",
      "x-finotaur-asset-guard": "404",
    },
  });
};
