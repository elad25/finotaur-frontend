const origin = (process.argv[2] || 'https://www.finotaur.com').replace(/\/$/, '');
const maxAttempts = Number(process.env.FINOTAUR_ASSET_CHECK_ATTEMPTS || 24);
const delayMs = Number(process.env.FINOTAUR_ASSET_CHECK_DELAY_MS || 5000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(`[postdeploy:assets] ${message}`);
  process.exit(1);
}

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status} ${response.statusText}`);
  }
  if (contentType.includes('text/html') && /\/assets\//.test(url)) {
    throw new Error(`${url} -> asset returned HTML (${contentType})`);
  }
  return response.text();
}

function addAsset(ref, fromUrl, queue, seen) {
  if (!ref) return;
  const url = new URL(ref, fromUrl).toString();
  if (!url.startsWith(`${origin}/assets/`)) return;
  if (!/\.(js|mjs|css)(\?|$)/.test(url)) return;
  if (seen.has(url)) return;
  seen.add(url);
  queue.push(url);
}

function collectAssetRefs(body, fromUrl, queue, seen) {
  for (const match of body.matchAll(/(?:src|href)=["']([^"']*\/assets\/[^"']+\.(?:js|mjs|css))["']/g)) {
    addAsset(match[1], fromUrl, queue, seen);
  }
  for (const match of body.matchAll(/["'](\/assets\/[^"']+\.(?:js|mjs|css))["']/g)) {
    addAsset(match[1], fromUrl, queue, seen);
  }
  for (const match of body.matchAll(/(?:from\s*|import\()\s*["'](\.?\.?\/[^"']+\.(?:js|mjs|css))["']/g)) {
    addAsset(match[1], fromUrl, queue, seen);
  }
}

async function validateOnce() {
  const rootUrl = `${origin}/`;
  const queue = [];
  const seen = new Set();

  const html = await fetchText(rootUrl);
  collectAssetRefs(html, rootUrl, queue, seen);

  for (let index = 0; index < queue.length; index += 1) {
    const assetUrl = queue[index];
    const body = await fetchText(assetUrl);
    if (/\.(js|mjs)(\?|$)/.test(assetUrl)) {
      collectAssetRefs(body, assetUrl, queue, seen);
    }
  }

  return seen.size;
}

let lastError = null;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const count = await validateOnce();
    console.log(`[postdeploy:assets] OK: ${origin} served ${count} reachable JS/CSS assets.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`[postdeploy:assets] attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
    if (attempt < maxAttempts) await sleep(delayMs);
  }
}

fail(`${origin} still has missing or invalid assets after ${maxAttempts} attempts. Last error: ${lastError?.message || 'unknown'}`);
