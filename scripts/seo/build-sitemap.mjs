// scripts/seo/build-sitemap.mjs
// Regenerates public/sitemap.xml with all 2,461 /research/<TICKER> routes
// plus the 31 preserved static entries + /research index.
//
// Usage:
//   node scripts/seo/build-sitemap.mjs
//   node scripts/seo/build-sitemap.mjs --out=dist/sitemap.xml

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../");
const TODAY = new Date().toISOString().split("T")[0];
const BASE_URL = "https://www.finotaur.com";

// --out= flag support
const outFlag = process.argv.find((a) => a.startsWith("--out="));
const OUT_PATH = outFlag
  ? resolve(process.cwd(), outFlag.slice("--out=".length))
  : resolve(REPO_ROOT, "public/sitemap.xml");

// ---------------------------------------------------------------------------
// 1. Hardcoded preserved entries (31 URLs)
// ---------------------------------------------------------------------------
const PRESERVED_ENTRIES = [
  { loc: "/",                                    lastmod: TODAY, changefreq: "daily",   priority: "1.0" },
  { loc: "/about",                               lastmod: TODAY, changefreq: "monthly", priority: "0.8" },
  { loc: "/contact",                             lastmod: TODAY, changefreq: "monthly", priority: "0.5" },
  { loc: "/links",                               lastmod: TODAY, changefreq: "weekly",  priority: "0.7" },
  { loc: "/journal",                             lastmod: TODAY, changefreq: "weekly",  priority: "0.8" },
  { loc: "/warzone-preview",                     lastmod: TODAY, changefreq: "weekly",  priority: "0.8" },
  { loc: "/blog",                                lastmod: TODAY, changefreq: "daily",   priority: "0.8" },
  { loc: "/glossary",                            lastmod: TODAY, changefreq: "weekly",  priority: "0.7" },
  { loc: "/glossary/options-flow",               lastmod: TODAY, changefreq: "monthly", priority: "0.6" },
  { loc: "/glossary/dark-pool",                  lastmod: TODAY, changefreq: "monthly", priority: "0.6" },
  { loc: "/glossary/iv-rank",                    lastmod: TODAY, changefreq: "monthly", priority: "0.6" },
  { loc: "/glossary/gamma-squeeze",              lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/theta-decay",                lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/vega",                       lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/iron-condor",                lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/covered-call",               lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/golden-cross",               lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/death-cross",                lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/short-interest",             lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/payment-for-order-flow",     lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/glossary/sector-rotation",            lastmod: TODAY, changefreq: "monthly", priority: "0.7" },
  { loc: "/login",                               lastmod: TODAY, changefreq: "yearly",  priority: "0.3" },
  { loc: "/register",                            lastmod: TODAY, changefreq: "yearly",  priority: "0.6" },
  { loc: "/legal",                               lastmod: TODAY, changefreq: "monthly", priority: "0.4" },
  { loc: "/legal/terms",                         lastmod: TODAY, changefreq: "monthly", priority: "0.3" },
  { loc: "/legal/privacy",                       lastmod: TODAY, changefreq: "monthly", priority: "0.3" },
  { loc: "/legal/disclaimer",                    lastmod: TODAY, changefreq: "monthly", priority: "0.3" },
  { loc: "/legal/cookies",                       lastmod: TODAY, changefreq: "monthly", priority: "0.3" },
  { loc: "/legal/risk-disclosure",               lastmod: TODAY, changefreq: "monthly", priority: "0.3" },
  { loc: "/legal/refund",                        lastmod: TODAY, changefreq: "monthly", priority: "0.3" },
  // /research index (new)
  { loc: "/research",                            lastmod: TODAY, changefreq: "daily",   priority: "0.9" },
];

// ---------------------------------------------------------------------------
// 2. Load ticker list from seo-tickers.json
// ---------------------------------------------------------------------------
const tickersPath = resolve(REPO_ROOT, "src/data/seo-tickers.json");
const tickersData = JSON.parse(readFileSync(tickersPath, "utf8"));
const tickers = Object.keys(tickersData.tickers).sort(); // alphabetical

// ---------------------------------------------------------------------------
// 3. Build XML
// ---------------------------------------------------------------------------
function urlBlock({ loc, lastmod, changefreq, priority }) {
  return [
    `  <url>`,
    `    <loc>${BASE_URL}${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    `  </url>`,
  ].join("\n");
}

const preservedXml = PRESERVED_ENTRIES.map(urlBlock).join("\n\n");

const researchXml = tickers
  .map((ticker) =>
    urlBlock({
      loc: `/research/${ticker}`,
      lastmod: TODAY,
      changefreq: "weekly",
      priority: "0.6",
    })
  )
  .join("\n\n");

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
  `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
  ``,
  preservedXml,
  ``,
  researchXml,
  ``,
  `</urlset>`,
].join("\n");

// ---------------------------------------------------------------------------
// 4. Write output
// ---------------------------------------------------------------------------
writeFileSync(OUT_PATH, xml, "utf8");

const total = PRESERVED_ENTRIES.length + tickers.length;
console.log(
  `=== Sitemap regenerated === preserved: ${PRESERVED_ENTRIES.length}, research: ${tickers.length}, total: ${total}`
);
console.log(`Output: ${OUT_PATH}`);
