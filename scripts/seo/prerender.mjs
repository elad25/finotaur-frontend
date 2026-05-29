// scripts/seo/prerender.mjs
// Consumes the SSR bundle (dist-ssr/entry-server.js) and the Vite client
// build (dist/index.html) to write static HTML for every research page.
//
// Usage:
//   node scripts/seo/prerender.mjs              # full run — all 2,501 routes
//   node scripts/seo/prerender.mjs --limit=10   # fast smoke test
//   node scripts/seo/prerender.mjs --ticker=AAPL
//   node scripts/seo/prerender.mjs --out=dist2  # override base output dir

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../");

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function flagValue(name) {
  const flag = args.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(`--${name}=`.length) : null;
}

const LIMIT = flagValue("limit") ? parseInt(flagValue("limit"), 10) : null;
const SINGLE_TICKER = flagValue("ticker");
const OUT_DIR = flagValue("out") ?? "dist";

const BASE_OUT = path.resolve(REPO_ROOT, OUT_DIR);

// ---------------------------------------------------------------------------
// 1. Read and clean the HTML template
// ---------------------------------------------------------------------------
const TEMPLATE_PATH = path.join(REPO_ROOT, "dist/index.html");

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error(
    `\n[prerender] ERROR: dist/index.html not found at ${TEMPLATE_PATH}\n` +
      `  Run "npm run build" first to generate the Vite client bundle.\n`
  );
  process.exit(1);
}

let template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

// --- Helper: warn if a pattern matched nothing (tag may have been removed) ---
function removeTag(label, pattern) {
  const before = template;
  template = template.replace(pattern, "");
  if (template === before) {
    console.warn(`[prerender] WARN: no match for "${label}" in template — tag may have changed.`);
  }
}

// Remove <title> (Helmet injects per-page title)
removeTag("<title>", /<title>[^<]*<\/title>/gi);

// Remove default <meta name="description">
removeTag('<meta name="description">', /<meta\s+name="description"[^>]*\/?>/gi);

// Remove <meta name="robots"> (Helmet sets per-page)
removeTag('<meta name="robots">', /<meta\s+name="robots"[^>]*\/?>/gi);

// Remove <link rel="canonical"> (Helmet injects per-page canonical)
removeTag('<link rel="canonical">', /<link\s+rel="canonical"[^>]*\/?>/gi);

// Remove all <meta property="og:*"> tags
removeTag('<meta property="og:*">', /<meta\s+property="og:[^"]*"[^>]*\/?>/gi);

// Remove all <meta name="twitter:*"> tags
removeTag('<meta name="twitter:*">', /<meta\s+name="twitter:[^"]*"[^>]*\/?>/gi);

// Remove all <script type="application/ld+json">...</script> blocks (multi-line)
removeTag(
  '<script type="application/ld+json">',
  /<script\s+type="application\/ld\+json"[\s\S]*?<\/script>/gi
);

// ---------------------------------------------------------------------------
// 2. Import the SSR bundle
// ---------------------------------------------------------------------------
const SSR_BUNDLE = path.resolve(REPO_ROOT, "dist-ssr/entry-server.js");

if (!fs.existsSync(SSR_BUNDLE)) {
  console.error(
    `\n[prerender] ERROR: dist-ssr/entry-server.js not found at ${SSR_BUNDLE}\n` +
      `  Run "npm run build:ssr" first.\n`
  );
  process.exit(1);
}

// Dynamic import — uses file:// URL for Windows compatibility
const ssrUrl = new URL(`file:///${SSR_BUNDLE.replace(/\\/g, "/")}`).href;
const { render } = await import(ssrUrl);

// ---------------------------------------------------------------------------
// 3. Build route list
// ---------------------------------------------------------------------------
const UNIVERSE_PATH = path.join(REPO_ROOT, "src/data/ticker-universe.json");

if (!fs.existsSync(UNIVERSE_PATH)) {
  console.error(`\n[prerender] ERROR: ticker-universe.json not found at ${UNIVERSE_PATH}\n`);
  process.exit(1);
}

const universe = JSON.parse(fs.readFileSync(UNIVERSE_PATH, "utf-8"));
const tickerSymbols = universe.tickers.map((t) => t.ticker);

let routes;

if (SINGLE_TICKER) {
  // --ticker=AAPL → render only that one ticker route
  routes = [`/research/${SINGLE_TICKER.toUpperCase()}`];
} else {
  // Full run: index page + all tickers
  routes = ["/research", ...tickerSymbols.map((t) => `/research/${t}`)];
  if (LIMIT !== null) {
    routes = routes.slice(0, LIMIT);
  }
}

const TOTAL = routes.length;
const indexCount = routes.includes("/research") ? 1 : 0;
const tickerCount = TOTAL - indexCount;
console.log(
  `\n=== Prerender starting === routes: ${TOTAL} (${indexCount} index + ${tickerCount} tickers)`
);
if (LIMIT !== null) console.log(`[prerender] --limit=${LIMIT} active — subset only`);
if (SINGLE_TICKER) console.log(`[prerender] --ticker=${SINGLE_TICKER.toUpperCase()} — single route`);
console.log(`[prerender] Output dir: ${BASE_OUT}/research/\n`);

// ---------------------------------------------------------------------------
// 4. Render loop
// ---------------------------------------------------------------------------
const startTime = Date.now();
let successCount = 0;
const failures = [];

for (let i = 0; i < routes.length; i++) {
  const route = routes[i];

  try {
    // 4a. Call SSR render
    const { html, helmet } = render(route);

    // 4b. Build final HTML — inject Helmet tags before </head>
    const helmetInjection = [
      helmet.title,
      helmet.meta,
      helmet.link,
      helmet.script,
    ]
      .filter(Boolean)
      .join("\n    ");

    let finalHtml = template.replace("</head>", `    ${helmetInjection}\n  </head>`);

    // Replace <div id="root"></div> with rendered SSR content
    finalHtml = finalHtml.replace(
      '<div id="root"></div>',
      `<div id="root">${html}</div>`
    );

    // Apply htmlAttributes to <html> tag if non-empty
    if (helmet.htmlAttributes && helmet.htmlAttributes.trim()) {
      finalHtml = finalHtml.replace(/<html([^>]*)>/, `<html $1 ${helmet.htmlAttributes}>`);
    }

    // Apply bodyAttributes to <body> tag if non-empty
    if (helmet.bodyAttributes && helmet.bodyAttributes.trim()) {
      finalHtml = finalHtml.replace(/<body([^>]*)>/, `<body $1 ${helmet.bodyAttributes}>`);
    }

    // 4c. Determine output path — flat .html pattern for ALL routes.
    //   /research        → dist/research.html (served at /research and /research/)
    //   /research/AAPL   → dist/research/AAPL.html (served at /research/AAPL, no redirect)
    //
    // Why flat .html and not dir/index.html: Vite preview / some static hosts
    // SPA-fallback when path lacks a trailing slash even if dir/index.html
    // exists. The flat .html file is served at the extension-less path on
    // every static host we care about (Cloudflare Pages, Vercel, Vite preview,
    // nginx try_files), with no trailing-slash redirect.
    const outPath = path.join(BASE_OUT, `${route.replace(/^\//, "")}.html`);

    // 4d. Ensure directory exists
    const outDir = path.dirname(outPath);
    await fs.promises.mkdir(outDir, { recursive: true });

    // 4e. Write file
    await fs.promises.writeFile(outPath, finalHtml, "utf-8");

    successCount++;
  } catch (err) {
    failures.push({ route, error: err.message ?? String(err) });
    console.error(`[prerender] FAIL ${route}: ${err.message ?? err}`);
  }

  // 4f. Progress every 100 routes
  if ((i + 1) % 100 === 0 || i === routes.length - 1) {
    const elapsed = Date.now() - startTime;
    const rate = ((i + 1) / (elapsed / 1000)).toFixed(1);
    console.log(
      `[${i + 1}/${TOTAL}] ${route} — ${elapsed}ms total, ${rate}/s`
    );
  }
}

// ---------------------------------------------------------------------------
// 5. Summary
// ---------------------------------------------------------------------------
const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(
  `\n=== Prerender done === wrote ${successCount} files in ${totalElapsed}s. Output: ${OUT_DIR}/research/`
);

if (failures.length > 0) {
  console.error(`\n[prerender] FAILURES: ${failures.length} route(s) failed:`);
  failures.slice(0, 20).forEach(({ route, error }) => {
    console.error(`  ${route}: ${error}`);
  });
  if (failures.length > 20) {
    console.error(`  ... and ${failures.length - 20} more.`);
  }
  process.exit(1);
}
