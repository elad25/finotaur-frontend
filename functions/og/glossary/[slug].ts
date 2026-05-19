/**
 * Cloudflare Pages Function: /og/glossary/:slug
 *
 * Returns a dynamically generated SVG OG image (1200x630) for glossary terms.
 *
 * See /og/blog/[slug].ts for design rationale (Option C — SVG).
 */

const UPSTREAM = 'https://finotaur-server-production.up.railway.app';

interface Env {
  // No env bindings required
}

function buildGlossarySvg(title: string, summary: string): string {
  // Title: single line, truncate at 40 chars
  const displayTitle =
    title.length > 40 ? title.slice(0, 37) + '...' : title;

  // Summary: up to 2 lines of ~60 chars each
  const maxCharsPerLine = 60;
  const words = summary.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine && current !== '') {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
    if (lines.length >= 2) break;
  }
  if (current && lines.length < 2) lines.push(current.trim());

  const summaryLines = lines.slice(0, 2);
  if (
    lines.length === 2 &&
    words.join(' ').length > summaryLines.join(' ').length + 3
  ) {
    summaryLines[1] = summaryLines[1].slice(0, maxCharsPerLine - 3) + '...';
  }

  const summaryElements = summaryLines
    .map(
      (line, i) =>
        `<text x="80" y="${330 + i * 36}" font-family="'Inter', Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.55)">${escapeXml(line)}</text>`
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
  <text x="80" y="155" font-family="'Inter', Arial, sans-serif" font-size="14" fill="rgba(201, 166, 70, 0.65)" letter-spacing="4">TRADING GLOSSARY</text>

  <!-- Separator line under eyebrow -->
  <rect x="80" y="172" width="120" height="1" fill="rgba(201, 166, 70, 0.3)" />

  <!-- Term title -->
  <text x="80" y="270" font-family="Georgia, 'Times New Roman', serif" font-size="60" font-weight="700" fill="white" opacity="0.95">${escapeXml(displayTitle)}</text>

  <!-- Summary lines -->
  ${summaryElements}

  <!-- Bottom labels -->
  <text x="80" y="580" font-family="'Inter', Arial, sans-serif" font-size="15" fill="rgba(255,255,255,0.3)">Trading Terminology</text>
  <text x="1120" y="580" font-family="'Inter', Arial, sans-serif" font-size="15" fill="rgba(255,255,255,0.25)" text-anchor="end">finotaur.com/glossary</text>
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

/**
 * Attempt to fetch glossary term metadata from the backend.
 * Falls back to slug-derived title if unavailable.
 */
async function resolveGlossaryTerm(
  slug: string
): Promise<{ title: string; summary: string }> {
  // Best effort — some deployments may not expose /api/glossary/:slug
  try {
    const apiRes = await fetch(
      `${UPSTREAM}/api/glossary/${encodeURIComponent(slug)}`,
      {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      }
    );

    if (apiRes.ok) {
      const data = await apiRes.json() as { title?: string; summary?: string; excerpt?: string };
      return {
        title: data.title ?? slug.replace(/-/g, ' '),
        summary: data.summary ?? data.excerpt ?? '',
      };
    }
  } catch {
    // Fall through to default
  }

  // Fallback: humanise the slug
  const humanTitle = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return { title: `FINOTAUR Glossary — ${humanTitle}`, summary: '' };
}

export const onRequest: PagesFunction<Env> = async ({ params }) => {
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  const { title, summary } = await resolveGlossaryTerm(slug);
  const svg = buildGlossarySvg(title, summary);

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'Vary': 'Accept-Encoding',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
