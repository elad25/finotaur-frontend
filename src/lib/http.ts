
export async function getJsonSmart(path: string, init?: RequestInit) {
  // Try relative /api first
  try {
    const r = await fetch(path, init);
    const ct = r.headers.get('content-type') || '';
    if (r.ok && ct.includes('application/json')) return await r.json();
  } catch {}
  // Fallback to absolute base
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const url = path.startsWith('/') ? base + path : base + '/' + path;
  const r2 = await fetch(url, init);
  const ct2 = r2.headers.get('content-type') || '';
  if (!r2.ok || !ct2.includes('application/json')) {
    const text = await r2.text().catch(()=>''); 
    throw new Error(`Request failed (${r2.status}).` + (text?.startsWith('<') ? ' Backend returned HTML.' : ''));
  }
  return await r2.json();
}
