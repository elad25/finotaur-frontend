#!/usr/bin/env node
/**
 * Route-integrity guard (the "never again" for /onboarding-style 404s).
 *
 * 1. Parses src/App.tsx and builds the full set of DEFINED route patterns,
 *    composing nested <Route> children with their parent prefixes.
 * 2. Scans src/ for every STATIC client-side navigation target
 *    (navigate('/x'), <Navigate to="/x">, <Link/NavLink to="/x">,
 *     window.location.href = '/x').
 * 3. Fails (exit 1) if any static target does not resolve to a defined route.
 *
 * Conservative by design: dynamic targets (template literals, variables),
 * external URLs, pure query/hash, and bare "/" are skipped to avoid false
 * positives that would block CI.
 *
 * Run: node scripts/check-routes.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const APP = join(SRC, 'App.tsx');

// ---------------------------------------------------------------------------
// 1. Parse App.tsx into the set of defined route patterns.
// ---------------------------------------------------------------------------
function parseRoutes(src) {
  const patterns = new Set();
  const stack = []; // prefixes of currently-open (container) routes
  let i = 0;
  const n = src.length;

  const compose = (prefix, p) => {
    if (p == null) return prefix; // index route → parent path
    if (p.startsWith('/')) return p.replace(/\/+$/, '') || '/'; // absolute
    const base = prefix === '/' ? '' : prefix;
    return (base + '/' + p).replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  };

  while (i < n) {
    if (src.startsWith('</Route>', i)) {
      stack.pop();
      i += 8;
      continue;
    }
    if (src.startsWith('<Route', i) && !/[A-Za-z]/.test(src[i + 6] || '')) {
      // Parse the opening tag, tracking brace/quote depth so element={<.../>}
      // JSX does not confuse the tag-end detection.
      let j = i + 6;
      let brace = 0;
      let quote = null;
      let selfClose = false;
      let tag = '';
      for (; j < n; j++) {
        const c = src[j];
        tag += c;
        if (quote) {
          if (c === quote) quote = null;
          continue;
        }
        if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
        if (c === '{') { brace++; continue; }
        if (c === '}') { brace--; continue; }
        if (brace === 0 && c === '>') {
          selfClose = tag[tag.length - 2] === '/';
          break;
        }
      }
      // Extract path / index from the tag's own attributes (brace depth 0).
      // Strip the element={...} payload first so we never read a `to="..."`
      // inside the element as the route path.
      const attrs = tag.replace(/element=\{[\s\S]*?\}(?=\s|\/|>)/g, ' ');
      const isIndex = /\bindex\b/.test(attrs) && !/\bpath=/.test(attrs);
      const m = attrs.match(/\bpath="([^"]*)"/) || attrs.match(/\bpath='([^']*)'/);
      const prefix = stack.length ? stack[stack.length - 1] : '';
      let full;
      if (isIndex) full = prefix || '/';
      else if (m) full = compose(prefix, m[1]);
      else full = prefix; // <Route> with neither path nor index (layout) — keep prefix

      if (full) patterns.add(full);
      if (!selfClose) stack.push(full || prefix);
      i = j + 1;
      continue;
    }
    i++;
  }
  return patterns;
}

// Convert a defined route pattern into a matcher RegExp.
function patternToRegex(p) {
  // Root catch-all (the NotFound route): ignore — it would match everything and
  // hide every dead link. Scoped splats like "/app/admin/*" are kept (legit).
  if (p === '*' || p === '/*') return null;
  let rx = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')   // escape regex metachars
    .replace(/\/\*$/, '(?:/.*)?')            // trailing /* (splat)
    .replace(/\*/g, '.*')                    // bare *
    .replace(/:[A-Za-z0-9_]+\?/g, '[^/]*')   // optional :param?
    .replace(/:[A-Za-z0-9_]+/g, '[^/]+');    // :param
  return new RegExp('^' + rx + '$');
}

// ---------------------------------------------------------------------------
// 2. Collect static navigation targets from src/.
// ---------------------------------------------------------------------------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

const TARGET_RES = [
  /\bnavigate\(\s*(['"])(\/[^'"`]*?)\1/g,                 // navigate('/x')
  /<Navigate\b[^>]*?\bto=(['"])(\/[^'"`]*?)\1/g,          // <Navigate to="/x">
  /<(?:Link|NavLink)\b[^>]*?\bto=(['"])(\/[^'"`]*?)\1/g,  // <Link to="/x">
  /\bwindow\.location\.href\s*=\s*(['"])(\/[^'"`]*?)\1/g, // window.location.href = '/x'
];

function collectTargets(files) {
  const found = []; // { path, file, line }
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const re of TARGET_RES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        let p = m[2];
        if (p.includes('${')) continue;           // dynamic
        p = p.split('?')[0].split('#')[0];          // strip query/hash
        p = p.replace(/\/+$/, '') || '/';
        if (p === '/' || p === '') continue;        // home always valid
        const line = text.slice(0, m.index).split('\n').length;
        found.push({ path: p, file: relative(ROOT, f), line });
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// 3. Match + report.
// ---------------------------------------------------------------------------
const appSrc = readFileSync(APP, 'utf8');
const patterns = [...parseRoutes(appSrc)];
const matchers = patterns.map(patternToRegex).filter(Boolean);
const targets = collectTargets(walk(SRC));

const dead = targets.filter(t => !matchers.some(rx => rx.test(t.path)));

console.log(`route-guard: ${patterns.length} defined routes, ${targets.length} static nav targets scanned.`);

if (dead.length) {
  // Group by path for a compact report.
  const byPath = new Map();
  for (const d of dead) {
    if (!byPath.has(d.path)) byPath.set(d.path, []);
    byPath.get(d.path).push(`${d.file}:${d.line}`);
  }
  console.error(`\n❌ route-guard FAILED — ${byPath.size} navigation target(s) point to undefined routes (would 404):\n`);
  for (const [p, sites] of [...byPath].sort()) {
    console.error(`  ${p}`);
    for (const s of sites) console.error(`      ← ${s}`);
  }
  console.error('\nFix: point each to a defined route, or add the missing <Route> in src/App.tsx.');
  process.exit(1);
}

console.log('✅ route-guard passed — every static navigation target resolves to a defined route.');
