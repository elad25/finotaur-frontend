/**
 * Cloudflare Pages Function: /og/blog/:slug
 *
 * Returns a dynamically generated SVG OG image (1200x630) for blog posts.
 *
 * Design choice: Option C (SVG, no PNG conversion).
 * SVG is supported by most social previewers (LinkedIn, Telegram, WhatsApp).
 * Twitter/X and Facebook strip SVG og:images and fall back to a blank preview —
 * if PNG support is required later, replace this with satori + @resvg/resvg-wasm.
 *
 * Cache: CDN-level cache for 1 day via Cache-Control.
 */

const UPSTREAM = 'https://finotaur-server-production.up.railway.app';

interface Env {
  // No env bindings required for this function
}

function buildSvg(title: string, date: string): string {
  // Truncate long titles to avoid overflow (hard-wrap at ~50 chars per line)
  const maxCharsPerLine = 48;
  const words = title.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine && current !== '') {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
    if (lines.length >= 3) break; // max 3 lines
  }
  if (current && lines.length < 3) lines.push(current.trim());

  // Cap at 3 display lines, add ellipsis if truncated
  const displayLines = lines.slice(0, 3);
  if (lines.length === 3 && words.join(' ').length > displayLines.join(' ').length + 3) {
    displayLines[2] = displayLines[2].slice(0, maxCharsPerLine - 3) + '...';
  }

  const titleLineHeight = 62;
  const titleStartY = 260 - ((displayLines.length - 1) * titleLineHeight) / 2;

  const titleElements = displayLines
    .map(
      (line, i) =>
        `<text x="80" y="${titleStartY + i * titleLineHeight}" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="700" fill="white" opacity="0.95">${escapeXml(line)}</text>`
    )
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#141414;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#C9A646;stop-opacity:0" />
      <stop offset="30%" style="stop-color:#C9A646;stop-opacity:0.7" />
      <stop offset="70%" style="stop-color:#C9A646;stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:#C9A646;stop-opacity:0" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Subtle border -->
  <rect x="1" y="1" width="1198" height="628" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2" />

  <!-- Gold accent line -->
  <rect x="0" y="540" width="1200" height="2" fill="url(#goldLine)" />

  <!-- FINOTAUR logo -->
  <text x="80" y="110" font-family="'Cinzel', Georgia, serif" font-size="28" font-weight="700" fill="#C9A646" letter-spacing="8">FINOTAUR</text>

  <!-- Eyebrow label -->
  <text x="80" y="155" font-family="'Inter', Arial, sans-serif" font-size="14" fill="rgba(201, 166, 70, 0.65)" letter-spacing="4">MARKET INTELLIGENCE</text>

  <!-- Separator line under eyebrow -->
  <rect x="80" y="172" width="120" height="1" fill="rgba(201, 166, 70, 0.3)" />

  <!-- Title lines -->
  ${titleElements}

  <!-- Date -->
  <text x="80" y="580" font-family="'Inter', Arial, sans-serif" font-size="15" fill="rgba(255,255,255,0.3)">${escapeXml(date)}</text>

  <!-- Domain -->
  <text x="1120" y="580" font-family="'Inter', Arial, sans-serif" font-size="15" fill="rgba(255,255,255,0.25)" text-anchor="end">finotaur.com</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export const onRequest: PagesFunction<Env> = async ({ params, request }) => {
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  let title = slug.replace(/-/g, ' ');
  let date = '';

  // Attempt to fetch post metadata from the backend
  try {
    const apiUrl = `${UPSTREAM}/api/blog/post/${encodeURIComponent(slug)}`;
    const apiReq = new Request(apiUrl, {
      headers: { 'accept': 'application/json' },
    });
    const apiRes = await fetch(apiReq, { signal: AbortSignal.timeout(3000) });

    if (apiRes.ok) {
      const data = await apiRes.json() as { title?: string; publishedAt?: string };
      if (data.title) title = data.title;
      if (data.publishedAt) date = formatDate(data.publishedAt);
    }
  } catch {
    // Fall back to slug-derived title — OG still renders
  }

  const svg = buildSvg(title, date);

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Vary': 'Accept-Encoding',
      // CORS: allow social crawlers on other origins to fetch the image
      'Access-Control-Allow-Origin': '*',
    },
  });
};
