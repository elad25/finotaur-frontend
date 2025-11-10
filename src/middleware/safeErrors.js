// src/middleware/safeErrors.js
export function safeErrors(err, req, res, next) {
  try {
    const path = req.originalUrl || req.url || '';
    const msg = (err && err.message) ? String(err.message) : String(err);
    const isApi = path.startsWith('/api/');
    if (isApi) {
      // Never leak provider URLs; return soft error
      return res.status(200).json({ error: 'unavailable', note: 'temporarily_unavailable' });
    }
  } catch {}
  return res.status(200).json({ error: 'unavailable' });
}
