export async function safeJson(resp: Response) {
  const ct = resp.headers.get('content-type') || '';
  const text = await resp.text();
  if (ct.includes('application/json')) {
    try { return JSON.parse(text); } catch { /* fall through */ }
  }
  // try JSON anyway; if fails, wrap as error text
  try { return JSON.parse(text); } catch {
    return { __raw: text, status: resp.status, statusText: resp.statusText };
  }
}
